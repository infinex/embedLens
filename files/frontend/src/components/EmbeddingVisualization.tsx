import React, { useEffect, useState } from 'react';
import { DeepScatter } from 'deep-scatter';
import { Select, Radio, Spin, Button, Progress, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';

interface Point {
  x: number;
  y: number;
  z?: number;
  cluster: number;
}

interface Visualization {
  id: number;
  method: string;
  dimensions: number;
  coordinates: number[][];
  clusters: number[];
}

interface ProgressInfo {
  status: string;
  progress: number;
  current_step?: string;
  error?: {
    error: string;
    traceback: string;
  };
}

const EmbeddingVisualization: React.FC = () => {
  const { embeddingId } = useParams<{ embeddingId: string }>();
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('umap');
  const [dimensions, setDimensions] = useState<number>(2);
  const [points, setPoints] = useState<Point[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<Point[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  useEffect(() => {
    const fetchVisualizations = async () => {
      try {
        const response = await fetch(
          `/api/visualizations/${embeddingId}?method=${selectedMethod}&dimensions=${dimensions}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch visualizations');
        }
        
        const data = await response.json();
        setVisualizations(data);
        
        // Transform the first visualization's data into points
        if (data.length > 0) {
          const vis = data[0];
          const transformedPoints = vis.coordinates.map((coord: number[], index: number) => ({
            x: coord[0],
            y: coord[1],
            ...(coord.length > 2 ? { z: coord[2] } : {}),
            cluster: vis.clusters[index]
          }));
          setPoints(transformedPoints);
          setFilteredPoints(transformedPoints); // Initialize filtered points with all points
        }
      } catch (error) {
        console.error('Error fetching visualizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizations();
  }, [embeddingId, selectedMethod, dimensions]);

  useEffect(() => {
    const pollProgress = async () => {
      if (!embeddingId) return;

      try {
        const response = await fetch(
          `/api/embeddings/${embeddingId}/progress`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        
        const progressData = await response.json();
        setProgress(progressData);

        if (progressData.status !== 'complete' && progressData.status !== 'failed') {
          // Continue polling
          setTimeout(pollProgress, 2000);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    pollProgress();
  }, [embeddingId]);

  const handleExport = async (format: 'csv' | 'json') => {
    if (!visualizations.length) return;

    try {
      const response = await fetch(
        `/api/visualizations/${visualizations[0].id}/export?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization_${visualizations[0].id}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization_${visualizations[0].id}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (progress && progress.status !== 'complete') {
    return (
      <div className="progress-container">
        <Progress
          percent={progress.progress}
          status={progress.status === 'failed' ? 'exception' : 'active'}
        />
        {progress.current_step && (
          <div className="current-step">
            {progress.current_step.replace(/_/g, ' ')}
          </div>
        )}
        {progress.error && (
          <Alert
            message="Error"
            description={progress.error.error}
            type="error"
            showIcon
          />
        )}
      </div>
    );
  }

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div className="visualization-container">
      <div className="controls">
        <Radio.Group 
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
        >
          <Radio.Button value="umap">UMAP</Radio.Button>
          <Radio.Button value="pca">PCA</Radio.Button>
        </Radio.Group>

        <Radio.Group 
          value={dimensions}
          onChange={(e) => setDimensions(e.target.value)}
        >
          <Radio.Button value={2}>2D</Radio.Button>
          <Radio.Button value={3}>3D</Radio.Button>
        </Radio.Group>

        <div className="export-buttons">
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </Button>
        </div>
      </div>

      <div className="scatter-plot">
        <DeepScatter
          points={filteredPoints}  {/* Use filteredPoints instead of points */}
          xField="x"
          yField="y"
          zField={dimensions === 3 ? "z" : undefined}
          colorField="cluster"
          width={800}
          height={600}
          pointSize={5}
          colorScheme="category10"
          interactionMode={dimensions === 3 ? "orbit" : "pan"}
          tooltipContent={(point) => `
            <div class="tooltip">
              <div>Cluster: ${point.cluster}</div>
              <div>X: ${point.x.toFixed(3)}</div>
              <div>Y: ${point.y.toFixed(3)}</div>
              ${point.z ? `<div>Z: ${point.z.toFixed(3)}</div>` : ''}
            </div>
          `}
        />
      </div>

      <div className="filters">
        <Select
          mode="multiple"
          placeholder="Filter by clusters"
          style={{ width: '200px' }}
          onChange={(values: number[]) => {
            const filteredPoints = points.filter(p => 
              values.length === 0 || values.includes(p.cluster)
            );
            setFilteredPoints(filteredPoints);
          }}
          options={Array.from(new Set(points.map(p => p.cluster))).map(cluster => ({
            label: `Cluster ${cluster}`,
            value: cluster
          }))}
        />
      </div>
    </div>
  );
}

export default EmbeddingVisualization;