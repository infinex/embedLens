import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Scatterplot } from 'deepscatter';
import { Select, Radio, Spin, Button, Progress, Alert, Space, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { tableFromArrays } from 'apache-arrow';
import './tooltip.css'

const { Title, Text } = Typography;

// --- Constants ---
const CHART_PARENT_ID = 'deep-scatter-parent-element-id';
const POLLING_INTERVAL_MS = 2000;
const PLOT_INIT_DELAY_MS = 100; // Delay to potentially allow container dimensions to stabilize

const METHODS = [
  { label: 'UMAP', value: 'umap' },
  { label: 'PCA', value: 'pca' },
];
const DIMENSIONS = [
  { label: '2D', value: 2 },
  { label: '3D', value: 3 },
];

// --- Interfaces ---
interface Point {
  x: number;
  y: number;
  z?: number;
  cluster: number;
}

interface VisualizationData {
  id: number; // Assuming the first visualization's ID is used for export
  method: string;
  dimensions: number;
  coordinates: number[][];
  clusters: number[];
}

interface ProgressInfo {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number;
  current_step?: string;
  error?: {
    error: string;
    traceback?: string; // Make traceback optional as it might not always be present
  };
}

interface HoveredPoint extends Point {
  metadata?: Record<string, any>;
  title?: string;
  id?: string | number;
}

// --- Helper Functions ---
const transformVisualizationToPoints = (vis: VisualizationData): Point[] => {
  if (!vis || !vis.coordinates || !vis.clusters) {
    return [];
  }
  return vis.coordinates.map((coord, index) => ({
    x: coord[0],
    y: coord[1],
    ...(coord.length > 2 && { z: coord[2] }), // Conditionally add z
    cluster: vis.clusters[index],
  }));
};

// --- Component ---
const EmbeddingVisualization: React.FC = () => {
  const { embeddingId } = useParams<{ embeddingId: string }>();
  const chartParentId = 'deep-scatter-parent-element-id';

  // --- State ---
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<Point[]>([]);
  const [uniqueClusters, setUniqueClusters] = useState<number[]>([]);

  const [selectedMethod, setSelectedMethod] = useState<string>(METHODS[0].value);
  const [selectedDimensions, setSelectedDimensions] = useState<number>(DIMENSIONS[0].value);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // For backend processing state
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const scatterplotInstanceRef = useRef<Scatterplot | null>(null);

  // --- Callbacks ---
  const handleFilterChange = useCallback((selectedClusterValues: number[]) => {
    if (selectedClusterValues.length === 0) {
      setFilteredPoints(points);
    } else {
      setFilteredPoints(points.filter(p => selectedClusterValues.includes(p.cluster)));
    }
  }, [points]);

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    if (!visualizationData?.id) {
      setError("Cannot export: No visualization data available or visualization ID missing.");
      return;
    }
    setError(null); // Clear previous errors
    const vizId = visualizationData.id;
    const token = localStorage.getItem('token');
    const url = `/api/visualizations/${vizId}/export?format=${format}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Browser should handle the download based on Content-Disposition header from the API
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      // Extract filename from header or generate one
      const disposition = response.headers.get('content-disposition');
      let filename = `visualization-${vizId}.${format}`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during export.');
    }
  }, [visualizationData]);

  // --- Effects ---

  // Effect: Poll for Processing Progress
  useEffect(() => {
    if (!embeddingId) return;

    let pollTimeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const pollProgress = async () => {
      if (isCancelled) return;

      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`/api/embeddings/${embeddingId}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isCancelled) return; // Check again after await

        if (!response.ok) {
          // Don't poll again if the progress endpoint itself fails, unless it's a transient error
          if (response.status !== 404) { // Example: Treat 404 as "not started" or "complete", stop polling
             console.error(`Progress fetch failed: ${response.status}`);
          }
           setProgress(null); // Reset progress on error
           setIsProcessing(false);
           return; // Stop polling on error
        }

        const progressData: ProgressInfo = await response.json();

        if (isCancelled) return;

        setProgress(progressData);
        setIsProcessing(progressData.status === 'processing' || progressData.status === 'pending');

        if (progressData.status === 'processing' || progressData.status === 'pending') {
          pollTimeoutId = setTimeout(pollProgress, POLLING_INTERVAL_MS);
        } else {
            setIsProcessing(false); // Ensure processing stops on complete/fail
        }

      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching progress:', error);
          setError('Failed to fetch processing progress.');
          setIsProcessing(false);
          // Optionally stop polling on error, or implement retry logic
        }
      }
    };

    // Start polling immediately only if not already completed/failed from previous state
    if (!progress || progress.status === 'pending' || progress.status === 'processing') {
       setIsProcessing(true);
       pollProgress();
    } else {
       setIsProcessing(false);
    }


    return () => {
      isCancelled = true;
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
  }, [embeddingId, progress?.status]); // Re-run if embeddingId changes, or status necessitates restarting polling logic


  // Effect: Fetch Visualization Data when parameters change or processing completes
  useEffect(() => {
    if (!embeddingId || isProcessing) {
      // Don't fetch if processing or no ID
      if (!isProcessing) setIsLoadingData(false); // Not processing, but no ID, so stop loading indicator
      return;
    }

    setIsLoadingData(true);
    setError(null);
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchVisualizations = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(
          `/api/visualizations/visualizations/${embeddingId}?method=${selectedMethod}&dimensions=${selectedDimensions}`,
          {
            signal,
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch visualization: ${response.status} ${response.statusText}`);
        }

        const data: VisualizationData[] = await response.json();

        if (signal.aborted) return;

        if (data.length > 0) {
          const vis = data[0];
          setVisualizationData(vis); // Store the raw visualization data
          const transformedPoints = transformVisualizationToPoints(vis);
          setPoints(transformedPoints);
          setFilteredPoints(transformedPoints); // Initially show all points
          setUniqueClusters(Array.from(new Set(transformedPoints.map(p => p.cluster))).sort((a, b) => a - b));
        } else {
          // No specific visualization found for this method/dimension
          setVisualizationData(null);
          setPoints([]);
          setFilteredPoints([]);
          setUniqueClusters([]);
          // Optional: Set a specific warning/info message here if needed
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Error fetching visualization:', err);
          setError(err instanceof Error ? err.message : 'An unknown fetch error occurred.');
          setVisualizationData(null);
          setPoints([]);
          setFilteredPoints([]);
          setUniqueClusters([]);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchVisualizations();

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [embeddingId, selectedMethod, selectedDimensions, isProcessing]); // Re-fetch if params change or processing finishes
// New tooltip handler function
const handleTooltip = (point: Point): string => {
  setHoveredPoint(point);
  
  return `<div class="minimal-tooltip">Cluster ${point.cluster}</div>`;
};

// New click handler function
const handlePointClick = (point: Point) => {
  console.log('Point clicked:', point);
  // You could implement custom behavior on click, like showing details in a sidebar
};

  // Effect: Initialize and Update Scatterplot
  useEffect(() => {
    const container = plotContainerRef.current;
    if (!container || isLoadingData || filteredPoints.length === 0) {
      // If loading, no data, or container not ready, destroy existing plot if any
      if (scatterplotInstanceRef.current) {
        scatterplotInstanceRef.current.destroy?.();
        scatterplotInstanceRef.current = null;
      }
      return; // Exit early
    }

    let isCancelled = false;

    // Use a small delay to allow the container dimensions to be finalized after render/data load.
    const timerId = setTimeout(async () => {
      if (isCancelled || !container) return;

      // Check container dimensions before attempting initialization
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          console.warn('Plot container has zero dimensions. Plot initialization deferred.');
          // Optionally, try again later or rely on resize events
          return;
      }

      try {
        // Prepare data in Arrow format
        const data: { [key: string]: ArrayLike<number> } = {
          x: Float32Array.from(filteredPoints.map(p => p.x)),
          y: Float32Array.from(filteredPoints.map(p => p.y)),
          cluster: Int32Array.from(filteredPoints.map(p => p.cluster)),
        };
        if (selectedDimensions === 3) {
          data.z = Float32Array.from(filteredPoints.map(p => p.z ?? 0)); // Default Z to 0 if missing
        }
        const table = tableFromArrays(data);

        // Configuration for Deepscatter
        const plotConfig = {
          max_points: points.length, // Max points based on the *original* dataset size for consistent zooming? Or filteredPoints.length? Test behavior. Let's use original points length for now.
          point_size: 5,
          background_color: '#ffffff',
          encoding: {
            x: { field: 'x', transform: 'literal' },
            y: { field: 'y', transform: 'literal' },
            ...(selectedDimensions === 3 && {
              z: { field: 'z', transform: 'literal' },
            }),
            color: { field: 'cluster', range: 'Cool' }, // Or use a different categorical scheme if needed
          },
          arrow_table: table,
          width: container.offsetWidth,
          height: container.offsetHeight,
          interactionMode: selectedDimensions === 3 ? 'orbit' : 'pan',
        };

        if (!scatterplotInstanceRef.current) {
          // Initialize
          scatterplotInstanceRef.current =  new Scatterplot(`#${CHART_PARENT_ID}`);
          scatterplotInstanceRef.current.tooltip_html = handleTooltip;

          await scatterplotInstanceRef.current.plotAPI(plotConfig).finally(async () => {
            scatterplotInstanceRef.current.click_function = handlePointClick;
          });;
          
        } else {
          // Update existing instance
          // Use plotAPI for updates if available and appropriate, otherwise re-init might be needed
          // Assuming plotAPI handles updates efficiently based on the docs/examples
          await scatterplotInstanceRef.current.plotAPI(plotConfig);
        }

      } catch (error) {
        console.error('Error initializing or updating Scatterplot:', error);
        setError('Failed to render the visualization plot.');
        // Clean up potentially broken instance
        scatterplotInstanceRef.current?.destroy?.();
        scatterplotInstanceRef.current = null;
      }

    }, PLOT_INIT_DELAY_MS);


    // Cleanup for this effect run
    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      // Note: We destroy the instance on *unmount* or when conditions (data/container) are invalid,
      // not necessarily on every re-run of this effect if just parameters change.
    };

  }, [filteredPoints, selectedDimensions, isLoadingData, points.length]); // Dependencies: Run when data/filters change or loading completes

  // Effect: Component Unmount Cleanup
  useEffect(() => {
    // Return cleanup function to run only on unmount
    return () => {
      scatterplotInstanceRef.current?.destroy?.();
      scatterplotInstanceRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs only once on mount and cleans up on unmount


  // --- Render Logic ---

  const renderProgress = () => (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Title level={3}>Embedding Processing...</Title>
        {progress?.current_step && (
          <Text style={{ display: 'block', marginBottom: '10px' }}>
            Step: {progress.current_step.replace(/_/g, ' ')}
          </Text>
        )}
        <Progress
          percent={progress?.progress ?? 0}
          status={progress?.status === 'failed' ? 'exception' : 'active'}
          style={{ marginBottom: '10px' }}
        />
         {progress?.status === 'failed' && (
            <Alert
                message="Processing Failed"
                description={progress.error?.error || 'An unknown error occurred during processing.'}
                type="error"
                showIcon
                style={{ marginTop: '15px', textAlign: 'left' }}
            />
         )}
        {/* Optional: Show traceback if needed */}
         {progress?.error?.traceback && (
            <pre style={{ marginTop: '10px', maxHeight: '200px', overflow: 'auto', background: '#f0f0f0', padding: '5px', textAlign: 'left', fontSize: '0.8em' }}>
              {progress.error.traceback}
            </pre>
         )}
      </div>
  );

  const renderContent = () => {
    if (isLoadingData) {
      return <Spin size="large" tip="Loading visualization data..." style={{ display: 'block', marginTop: '50px' }} />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon style={{ margin: '20px' }} />;
    }

    if (!isLoadingData && points.length === 0 && !isProcessing) {
      return (
          <Alert
            message="No Visualization Data"
            description={`No visualization data found for method '${selectedMethod}' and ${selectedDimensions}D for this embedding. Processing might be pending, failed previously, or data is unavailable.`}
            type="warning"
            showIcon
            style={{ margin: '20px' }}
          />
      );
    }

    // Main content: Controls + Plot
    return (
      <>
        <div style={{ display: 'flex', gap: '20px' }}>
                    <div 
            className="point-details-sidebar" 
            style={{
              width: '250px',
              height: '600px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '15px',
              background: '#fff',
              overflow: 'auto'
            }}
          >
            {hoveredPoint ? (
              <>
                <Typography.Title level={4} style={{ marginTop: 0 }}>
                  Cluster {hoveredPoint.cluster}
                </Typography.Title>
                
                {hoveredPoint.title && (
                  <Typography.Title level={5} style={{ marginTop: 0 }}>
                    {hoveredPoint.title}
                  </Typography.Title>
                )}
                
                <Typography.Text type="secondary">
                  Coordinates: ({hoveredPoint.x.toFixed(3)}, {hoveredPoint.y.toFixed(3)}
                  {hoveredPoint.z !== undefined ? `, ${hoveredPoint.z.toFixed(3)}` : ''})
                </Typography.Text>
                
                {hoveredPoint.metadata && Object.keys(hoveredPoint.metadata).length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <Typography.Title level={5}>Metadata</Typography.Title>
                    {Object.entries(hoveredPoint.metadata).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: '5px' }}>
                        <Typography.Text strong>{key}:</Typography.Text>{' '}
                        <Typography.Text>{String(value)}</Typography.Text>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', marginTop: '50%' }}>
                <Typography.Text type="secondary">
                  Hover over a point to see details
                </Typography.Text>
              </div>
            )}
          </div>
          <div
            id={CHART_PARENT_ID}
            ref={plotContainerRef}
            style={{
              width: '750px',
              height: '600px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
              background: '#f9f9f9'
            }}
          />
          

        </div>
      </>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
        {/* General Error Display Area */}
        {error && !isLoadingData && ( // Show general errors if not loading and error exists
             <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '15px' }} closable onClose={() => setError(null)}/>
        )}

       {/* Controls always visible unless processing */}
        {!isProcessing && (
           <Space direction="vertical" style={{ width: '100%', marginBottom: '15px' }}>
             <Space wrap>
                 <Radio.Group
                    options={METHODS}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    value={selectedMethod}
                    optionType="button"
                    buttonStyle="solid"
                    disabled={isLoadingData}
                 />
                 <Radio.Group
                    options={DIMENSIONS}
                    onChange={(e) => setSelectedDimensions(e.target.value)}
                    value={selectedDimensions}
                    optionType="button"
                    buttonStyle="solid"
                    disabled={isLoadingData}
                 />
                 <Select
                    mode="multiple"
                    allowClear
                    placeholder="Filter Clusters"
                    style={{ minWidth: '200px' }}
                    onChange={handleFilterChange}
                    options={uniqueClusters.map((cluster) => ({
                        label: `Cluster ${cluster}`,
                        value: cluster,
                    }))}
                    disabled={isLoadingData || points.length === 0}
                    loading={isLoadingData} // Show loading indicator in select if data is loading
                 />
                 <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('csv')}
                    disabled={isLoadingData || !visualizationData}
                 >
                    Export CSV
                 </Button>
                 <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('json')}
                    disabled={isLoadingData || !visualizationData}
                 >
                    Export JSON
                 </Button>
             </Space>
           </Space>
        )}


      {/* Display Area: Progress, Loading, No Data, or Plot */}
      {isProcessing ? renderProgress() : renderContent()}

    </div>
  );
};

export default EmbeddingVisualization;