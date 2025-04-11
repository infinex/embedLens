
import React, { useEffect, useState, useRef } from 'react';
import { Scatterplot } from 'deepscatter';
import { Select, Radio, Spin, Button, Progress, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { tableFromArrays } from 'apache-arrow';

// Interfaces
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
  
  const plotRef = useRef<HTMLDivElement>(null);
  const scatterplotRef = useRef<Scatterplot | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Data Fetching Effect
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);

    const fetchVisualizations = async () => {
      if (!embeddingId) {
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching visualizations for ${embeddingId}, method=${selectedMethod}, dimensions=${dimensions}`);
        const response = await fetch(
          `/api/visualizations/visualizations/${embeddingId}?method=${selectedMethod}&dimensions=${dimensions}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch visualizations: ${response.statusText}`);
        }

        const data = await response.json();
        if (!isMountedRef.current) return;

        setVisualizations(data);

        if (data.length > 0) {
          const vis = data[0];
          const transformedPoints = vis.coordinates.map((coord: number[], index: number) => ({
            x: coord[0],
            y: coord[1],
            ...(coord.length > 2 ? { z: coord[2] } : {}),
            cluster: vis.clusters[index],
          }));
          console.log(`Received ${transformedPoints.length} points.`);
          setPoints(transformedPoints);
          setFilteredPoints(transformedPoints);
        } else {
          console.warn('No visualization data returned. Clearing points.');
          setPoints([]);
          setFilteredPoints([]);
        }
      } catch (error) {
        console.error('Error fetching visualizations:', error);
        if (!isMountedRef.current) return;
        setPoints([]);
        setFilteredPoints([]);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchVisualizations();

    return () => {
      isMountedRef.current = false;
      console.log("Data fetching effect cleanup.");
    };
  }, [embeddingId, selectedMethod, dimensions]);

  // Scatterplot Initialization and Update Effect
  useEffect(() => {
    let plotInstance: Scatterplot | null = null;

    const initializeOrUpdatePlot = async () => {
      if (!plotRef.current || !isMountedRef.current || loading || filteredPoints.length === 0) {
        if (loading) console.log("Skipping plot update: Still loading data.");
        else if (filteredPoints.length === 0) console.log("Skipping plot update: No points to display.");
        else if (!plotRef.current) console.log("Skipping plot update: Plot container ref not available.");
        else console.log("Skipping plot update: Component not mounted.");
        
        if (scatterplotRef.current && filteredPoints.length === 0) {
          console.log("Clearing existing scatterplot due to no data.");
        }
        return;
      }

      // Initialization
      if (!scatterplotRef.current) {
        if (plotRef.current.offsetWidth === 0 || plotRef.current.offsetHeight === 0) {
          console.warn('Plot container has zero dimensions. Initialization deferred.');
          return;
        }

        console.log('Initializing Scatterplot...');
        try {
          while (plotRef.current.firstChild) {
            plotRef.current.removeChild(plotRef.current.firstChild);
          }
          console.log("Target container:", plotRef.current);
          plotInstance = new Scatterplot(plotRef.current);
          console.log('Scatterplot instance created.');
          
          if (isMountedRef.current) {
            scatterplotRef.current = plotInstance;
          } else {
            console.log("Component unmounted during initialization, destroying instance.");
            plotInstance?.destroy?.();
            return;
          }
        } catch (error) {
          console.error('FATAL: Error initializing Scatterplot:', error);
          if (plotRef.current) {
            console.error("Container innerHTML at init error:", plotRef.current.innerHTML);
          }
          return;
        }
      }

      // Data Plotting / Update
      if (scatterplotRef.current && filteredPoints.length > 0) {
        console.log(`Updating plot with ${filteredPoints.length} points.`);
        try {
          const data: { [key: string]: ArrayLike<number> } = {
            x: Float32Array.from(filteredPoints.map(p => p.x)),
            y: Float32Array.from(filteredPoints.map(p => p.y)),
            cluster: Int32Array.from(filteredPoints.map(p => p.cluster)),
          };
          if (dimensions === 3) {
            data.z = Float32Array.from(filteredPoints.map(p => p.z ?? 0));
          }

          const table = tableFromArrays(data);

          if (!plotRef.current) {
            console.error('Plot reference lost before plotAPI call.');
            return;
          }

          const plotConfig = {
            max_points: filteredPoints.length,
            point_size: 5,
            background_color: '#ffffff',
            encoding: {
              x: { field: 'x', transform: 'literal' },
              y: { field: 'y', transform: 'literal' },
              ...(dimensions === 3 && {
                z: { field: 'z', transform: 'literal' },
              }),
              color: { field: 'cluster', range: 'category10' },
            },
            arrow_table: table,
            width: plotRef.current.offsetWidth || 800,
            height: plotRef.current.offsetHeight || 600,
            interactionMode: dimensions === 3 ? 'orbit' : 'pan',
          };

          console.log('Calling plotAPI with config:', {
            dimensions: `${plotConfig.width}x${plotConfig.height}`,
            pointCount: filteredPoints.length,
            encoding: plotConfig.encoding
          });

          await scatterplotRef.current.plotAPI(plotConfig);
          console.log('plotAPI call completed.');
        } catch (error) {
          console.error('Error calling plotAPI:', error);
          if (error instanceof TypeError && error.message.includes("reading 'firstElementChild'")) {
            console.error(">>> The 'firstElementChild' error occurred during plotAPI/reinitialize.");
            if (plotRef.current) {
              console.error("Container innerHTML at plotAPI error:", plotRef.current.innerHTML);
            }
          }
        }
      } else if (scatterplotRef.current && filteredPoints.length === 0) {
        console.log("Filtered points is zero. Clearing plot (or plotting empty).");
        try {
          console.log("Destroying plot instance due to zero filtered points.");
          scatterplotRef.current.destroy?.();
          scatterplotRef.current = null;
        } catch (error) {
          console.error("Error handling zero points:", error);
        }
      }
    };

    const timerId = setTimeout(initializeOrUpdatePlot, 50);

    return () => {
      console.log("Running cleanup for plot effect.");
      clearTimeout(timerId);
    };
  }, [loading, filteredPoints, dimensions]);

  // Component Unmount Cleanup Effect
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log("Component unmounting. Cleaning up scatterplot instance.");
      isMountedRef.current = false;
      scatterplotRef.current?.destroy?.();
      scatterplotRef.current = null;
    };
  }, []);

  // Progress Polling Effect
  useEffect(() => {
    let pollTimeoutId: NodeJS.Timeout | null = null;
    let cancelled = false;

    const pollProgress = async () => {
      if (!embeddingId || cancelled) return;

      try {
        const response = await fetch(`/api/embeddings/${embeddingId}/progress`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (cancelled) return;
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const progressData = await response.json();
        if (cancelled) return;

        setProgress(progressData);
        if (progressData.status !== 'complete' && progressData.status !== 'failed') {
          pollTimeoutId = setTimeout(pollProgress, 2000);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching progress:', error);
        }
      }
    };

    pollProgress();

    return () => {
      cancelled = true;
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
  }, [embeddingId]);

  // Event Handlers
  const handleExport = async (format: 'csv' | 'json') => {
    if (!visualizations.length || !visualizations[0]?.id) {
      console.error("Cannot export: No visualization data available.");
      return;
    }
    const vizId = visualizations[0].id;
    try {
      const response = await fetch(
        `/api/visualizations/${vizId}/export?format=${format}`
      );
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Render Logic
  if (progress && progress.status !== 'complete' && progress.status !== 'failed') {
    if (loading) {
      return <Spin tip={`Processing: ${progress.current_step || progress.status}... ${progress.progress}%`} size="large" />;
    }
    return (
      <div className="progress-container" style={{ padding: '20px' }}>
        <h3>Embedding Processing...</h3>
        {progress.current_step && (
          <div className="current-step" style={{ marginBottom: '10px' }}>
            Step: {progress.current_step.replace(/_/g, ' ')}
          </div>
        )}
        <Progress
          percent={progress.progress}
          status={'active'}
          style={{ marginBottom: '10px' }}
        />
      </div>
    );
  }

  if (progress && progress.status === 'failed') {
    return (
      <div className="progress-container" style={{ padding: '20px' }}>
        <Alert
          message="Processing Failed"
          description={progress.error?.error || 'An unknown error occurred during processing.'}
          type="error"
          showIcon
        />
        {progress.error?.traceback && (
          <pre style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto', background: '#f0f0f0', padding: '5px' }}>
            {progress.error.traceback}
          </pre>
        )}
      </div>
    );
  }

  if (loading) {
    return <Spin size="large" tip="Loading visualization data..." />;
  }

  if (!loading && points.length === 0 && (!progress || progress.status === 'complete')) {
    return (
      <div className="visualization-container" style={{ padding: '20px' }}>
        <Alert 
          message="No Visualization Data" 
          description={`No visualization data found for method '${selectedMethod}' and ${dimensions}D. Processing might be pending or data is unavailable.`} 
          type="warning" 
          showIcon 
        />
        <div className="controls" style={{ marginTop: '20px' }}>
          <Radio.Group value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
            <Radio.Button value="umap">UMAP</Radio.Button>
            <Radio.Button value="pca">PCA</Radio.Button>
          </Radio.Group>
          <Radio.Group value={dimensions} onChange={(e) => setDimensions(e.target.value)} style={{ marginLeft: '10px' }}>
            <Radio.Button value={2}>2D</Radio.Button>
            <Radio.Button value={3}>3D</Radio.Button>
          </Radio.Group>
        </div>
      </div>
    );
  }

  return (
    <div className="visualization-container" style={{ padding: '20px' }}>
      <div className="controls" style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          Method: 
          <Radio.Group value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
            <Radio.Button value="umap">UMAP</Radio.Button>
            <Radio.Button value="pca">PCA</Radio.Button>
          </Radio.Group>
        </div>
        <div>
          Dimensions: 
          <Radio.Group value={dimensions} onChange={(e) => setDimensions(e.target.value)}>
            <Radio.Button value={2}>2D</Radio.Button>
            <Radio.Button value={3}>3D</Radio.Button>
          </Radio.Group>
        </div>
        <div className="filters">
          Filter Clusters: 
          <Select
            mode="multiple"
            allowClear
            placeholder="All Clusters"
            style={{ width: '200px' }}
            onChange={(values: number[]) => {
              const filtered = points.filter(
                (p) => values.length === 0 || values.includes(p.cluster)
              );
              console.log(`Filtering points by clusters: ${values.length > 0 ? values.join(', ') : 'All'}. Found ${filtered.length} points.`);
              setFilteredPoints(filtered);
            }}
            options={Array.from(new Set(points.map((p) => p.cluster)))
              .sort((a, b) => a - b)
              .map((cluster) => ({
                label: `Cluster ${cluster}`,
                value: cluster,
              }))}
          />
        </div>
        <div className="export-buttons" style={{ marginLeft: 'auto' }}>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport('csv')} 
            disabled={!visualizations.length}
          >
            Export CSV
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport('json')} 
            style={{ marginLeft: '8px' }} 
            disabled={!visualizations.length}
          >
            Export JSON
          </Button>
        </div>
      </div>
      <div
        className="scatter-plot-container"
        ref={plotRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          background: '#f9f9f9'
        }}
      />
    </div>
  );
};

export default EmbeddingVisualization;
