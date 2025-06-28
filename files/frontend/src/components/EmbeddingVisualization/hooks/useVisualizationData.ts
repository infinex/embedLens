import { useState, useEffect, useCallback } from 'react';

// --- Constants ---
const METHODS = [
  { label: 'UMAP', value: 'umap' },
  { label: 'PCA', value: 'pca' },
];

const DIMENSIONS = [
  { label: '2D', value: 2 },
  { label: '3D', value: 3 },
];

const LABEL_TYPES = [
  { label: 'Cluster Names', value: 'cluster' },
  { label: 'Point Counts', value: 'count' },
  { label: 'Coordinates', value: 'coords' },
];

const POLLING_INTERVAL_MS = 2000;

// --- Interfaces ---
interface Point {
  x: number;
  y: number;
  z?: number;
  cluster: number;
}

interface ClusterLabel {
  x: number;
  y: number;
  z?: number;
  cluster: number;
  label: string;
  pointCount: number;
}

interface VisualizationData {
  method: string;
  dimensions: number;
  visualization_id: number;
  embedding_id: number;
  file_id: number;
  row_id: number;
  coordinates: number[];
  clusters: number;
  created_at: string;
}

interface ProgressInfo {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number;
  current_step?: string;
  error?: {
    error: string;
    traceback?: string;
  };
}

interface UseVisualizationDataReturn {
  visualizationData: VisualizationData[] | null;
  points: Point[];
  uniqueClusters: number[];
  clusterLabels: ClusterLabel[];
  isLoadingData: boolean;
  isProcessing: boolean;
  progress: ProgressInfo | null;
  error: string | null;
  selectedMethod: string;
  setSelectedMethod: (method: string) => void;
  selectedDimensions: number;
  setSelectedDimensions: (dimensions: number) => void;
  selectedClusters: number[];
  setSelectedClusters: (clusters: number[]) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  labelType: 'cluster' | 'count' | 'coords';
  setLabelType: (type: 'cluster' | 'count' | 'coords') => void;
  handleClearFilters: () => void;
  handleExport: (format: 'csv' | 'json') => Promise<void>;
}

// --- Helper Functions ---
const transformVisualizationToPoints = (vis: VisualizationData[]): Point[] => {
  if (!vis || !Array.isArray(vis)) {
    return [];
  }
  
  return vis.map(item => ({
    x: item.coordinates[0],
    y: item.coordinates[1],
    ...(item.coordinates.length > 2 && { z: item.coordinates[2] }),
    cluster: item.clusters
  }));
};

const generateMockLabels = (points: Point[], labelType: 'cluster' | 'count' | 'coords'): ClusterLabel[] => {
  if (!points || points.length === 0) return [];
  
  // Group points by cluster
  const clusterGroups = points.reduce((acc, point) => {
    if (!acc[point.cluster]) {
      acc[point.cluster] = [];
    }
    acc[point.cluster].push(point);
    return acc;
  }, {} as Record<number, Point[]>);
  
  // Calculate centroid and generate initial labels for each cluster
  const initialLabels = Object.entries(clusterGroups).map(([clusterStr, clusterPoints]) => {
    const cluster = parseInt(clusterStr);
    const count = clusterPoints.length;
    
    // Calculate centroid
    const centroid = {
      x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / count,
      y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / count,
      z: clusterPoints[0].z !== undefined 
        ? clusterPoints.reduce((sum, p) => sum + (p.z || 0), 0) / count 
        : undefined
    };
    
    // Generate label text based on type
    let label: string;
    switch (labelType) {
      case 'cluster':
        label = `Cluster ${cluster}`;
        break;
      case 'count':
        label = `C${cluster} (${count})`;
        break;
      case 'coords':
        label = `C${cluster} [${centroid.x.toFixed(1)}, ${centroid.y.toFixed(1)}]`;
        break;
      default:
        label = `Cluster ${cluster}`;
    }
    
    return {
      ...centroid,
      cluster,
      label,
      pointCount: count
    };
  });
  
  return initialLabels;
};

export const useVisualizationData = (embeddingId: string | undefined): UseVisualizationDataReturn => {
  // Core data state
  const [visualizationData, setVisualizationData] = useState<VisualizationData[] | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [uniqueClusters, setUniqueClusters] = useState<number[]>([]);
  const [clusterLabels, setClusterLabels] = useState<ClusterLabel[]>([]);

  // UI state
  const [selectedMethod, setSelectedMethod] = useState<string>(METHODS[0].value);
  const [selectedDimensions, setSelectedDimensions] = useState<number>(DIMENSIONS[0].value);
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [labelType, setLabelType] = useState<'cluster' | 'count' | 'coords'>('cluster');

  // Loading and error state
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear filters callback
  const handleClearFilters = useCallback(() => {
    console.log('Clearing filters - resetting to show all points');
    setSelectedClusters([]);
  }, []);

  // Export callback
  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    if (!visualizationData) {
      setError("Cannot export: No visualization data available or visualization ID missing.");
      return;
    }
    setError(null);
    const vizId = (visualizationData as any).visualization_id;
    const token = localStorage.getItem('token');
    const url = `/api/visualizations/${vizId}/export?format=${format}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
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

  // Reset filters when data changes
  useEffect(() => {
    if (points.length > 0) {
      const currentClusters = new Set(points.map(p => p.cluster));
      const validSelectedClusters = selectedClusters.filter(cluster => currentClusters.has(cluster));
      
      if (validSelectedClusters.length !== selectedClusters.length) {
        console.log('Resetting invalid filters');
        setSelectedClusters(validSelectedClusters);
      }
    }
  }, [points, selectedClusters]);

  // Generate cluster labels when points or label type change
  useEffect(() => {
    if (points.length > 0) {
      const labels = generateMockLabels(points, labelType);
      setClusterLabels(labels);
    } else {
      setClusterLabels([]);
    }
  }, [points, labelType]);

  // Poll for processing progress
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

        if (isCancelled) return;

        if (!response.ok) {
          if (response.status !== 404) {
             console.error(`Progress fetch failed: ${response.status}`);
          }
           setProgress(null);
           setIsProcessing(false);
           return;
        }

        const progressData: ProgressInfo = await response.json();

        if (isCancelled) return;

        setProgress(progressData);
        setIsProcessing(progressData.status === 'processing' || progressData.status === 'pending');

        if (progressData.status === 'processing' || progressData.status === 'pending') {
          pollTimeoutId = setTimeout(pollProgress, POLLING_INTERVAL_MS);
        } else {
            setIsProcessing(false);
        }

      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching progress:', error);
          setError('Failed to fetch processing progress.');
          setIsProcessing(false);
        }
      }
    };

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
  }, [embeddingId, progress?.status]);

  // Fetch visualization data when parameters change or processing completes
  useEffect(() => {
    if (!embeddingId || isProcessing) {
      if (!isProcessing) setIsLoadingData(false);
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
          `/api/visualizations/file/${embeddingId}?method=${selectedMethod}&dimensions=${selectedDimensions}`,
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
          setVisualizationData(data);
          const transformedPoints = transformVisualizationToPoints(data);
          setPoints(transformedPoints);
          setUniqueClusters(Array.from(new Set(transformedPoints.map(p => p.cluster))).sort((a, b) => a - b));
        } else {
          setVisualizationData(null);
          setPoints([]);
          setUniqueClusters([]);
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Error fetching visualization:', err);
          setError(err instanceof Error ? err.message : 'An unknown fetch error occurred.');
          setVisualizationData(null);
          setPoints([]);
          setUniqueClusters([]);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchVisualizations();

    return () => {
      abortController.abort();
    };
  }, [embeddingId, selectedMethod, selectedDimensions, isProcessing]);

  return {
    visualizationData,
    points,
    uniqueClusters,
    clusterLabels,
    isLoadingData,
    isProcessing,
    progress,
    error,
    selectedMethod,
    setSelectedMethod,
    selectedDimensions,
    setSelectedDimensions,
    selectedClusters,
    setSelectedClusters,
    showLabels,
    setShowLabels,
    labelType,
    setLabelType,
    handleClearFilters,
    handleExport,
  };
};