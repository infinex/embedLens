import React, { useEffect, useRef, useCallback } from 'react';
import { Scatterplot } from 'deepscatter';
import { Spin, Alert } from 'antd';
import { tableFromArrays } from 'apache-arrow';

const PLOT_INIT_DELAY_MS = 100;

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

interface VisualizationPlotProps {
  chartParentId: string;
  points: Point[];
  selectedClusters: number[];
  selectedDimensions: number;
  showLabels: boolean;
  clusterLabels: ClusterLabel[];
  onTooltip: (point: Point) => string;
  onPointClick: (point: Point) => void;
  isLoading: boolean;
}

const addLabelsToPlot = async (scatterplot: Scatterplot, labels: ClusterLabel[]): Promise<void> => {
  try {
    const labelData = {
      type: "FeatureCollection",
      features: labels.map(label => ({
        type: "Feature",
        properties: {
          label: label.label,
          cluster: label.cluster,
          pointCount: label.pointCount
        },
        geometry: {
          type: "Point",
          coordinates: [label.x, label.y, label.z || 0]
        }
      }))
    };
    
    const dataUrl = 'data:application/json,' + encodeURIComponent(JSON.stringify(labelData));
    
    await scatterplot.add_labels_from_url(
      dataUrl,
      'cluster_labels',
      'label',
      undefined,
      { 
        draggable_labels: false, 
        useColorScale: false,
        label_size: 12,
        label_color: '#000000'
      }
    );
  } catch (error) {
    console.warn('Failed to add labels to plot:', error);
  }
};

const VisualizationPlot: React.FC<VisualizationPlotProps> = ({
  chartParentId,
  points,
  selectedClusters,
  selectedDimensions,
  showLabels,
  clusterLabels,
  onTooltip,
  onPointClick,
  isLoading
}) => {
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const scatterplotInstanceRef = useRef<Scatterplot | null>(null);

  const initializePlot = useCallback(async () => {
    const container = plotContainerRef.current;
    if (!container || isLoading || points.length === 0) {
      if (scatterplotInstanceRef.current) {
        scatterplotInstanceRef.current.destroy?.();
        scatterplotInstanceRef.current = null;
      }
      return;
    }

    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Plot container has zero dimensions. Plot initialization deferred.');
      return;
    }

    try {
      const filteredPoints = selectedClusters.length > 0 
        ? points.filter(p => selectedClusters.includes(p.cluster))
        : points;
      
      if (filteredPoints.length === 0 && selectedClusters.length > 0) {
        console.warn('No points match the selected clusters:', selectedClusters);
        return;
      }
      
      const data: { [key: string]: ArrayLike<number> } = {
        x: Float32Array.from(filteredPoints.map(p => p.x)),
        y: Float32Array.from(filteredPoints.map(p => p.y)),
        cluster: Int32Array.from(filteredPoints.map(p => p.cluster)),
      };
      
      if (selectedDimensions === 3) {
        data.z = Float32Array.from(filteredPoints.map(p => p.z ?? 0));
      }
      
      const table = tableFromArrays(data);

      const plotConfig: any = {
        max_points: points.length,
        point_size: 5,
        background_color: '#ffffff',
        encoding: {
          x: { field: 'x', transform: 'literal' },
          y: { field: 'y', transform: 'literal' },
          ...(selectedDimensions === 3 && {
            z: { field: 'z', transform: 'literal' },
          }),
          color: { field: 'cluster', range: 'Cool' },
        },
        arrow_table: table,
        width: container.offsetWidth,
        height: container.offsetHeight,
        interactionMode: selectedDimensions === 3 ? 'orbit' : 'pan',
      };

      const isCurrentlyFiltering = selectedClusters.length > 0;
      const isShowingAllPoints = filteredPoints.length === points.length;
      const needsReinitialization = !scatterplotInstanceRef.current || 
        isCurrentlyFiltering || 
        (!isCurrentlyFiltering && !isShowingAllPoints);
      
      if (!scatterplotInstanceRef.current || needsReinitialization) {
        if (scatterplotInstanceRef.current) {
          scatterplotInstanceRef.current.destroy?.();
          scatterplotInstanceRef.current = null;
        }
        
        scatterplotInstanceRef.current = new Scatterplot(`#${chartParentId}`);
        scatterplotInstanceRef.current.tooltip_html = onTooltip;
        scatterplotInstanceRef.current.click_function = onPointClick;

        await scatterplotInstanceRef.current.plotAPI(plotConfig);
        
        if (showLabels && clusterLabels.length > 0) {
          await addLabelsToPlot(scatterplotInstanceRef.current, clusterLabels);
        }
        
      } else {
        await scatterplotInstanceRef.current.plotAPI(plotConfig);
        
        if (showLabels && clusterLabels.length > 0) {
          await addLabelsToPlot(scatterplotInstanceRef.current, clusterLabels);
        } else {
          try {
            await scatterplotInstanceRef.current.clear_labels?.();
          } catch (e) {
            console.warn('Failed to clear labels:', e);
          }
        }
      }

    } catch (error) {
      console.error('Error initializing or updating Scatterplot:', error);
      scatterplotInstanceRef.current?.destroy?.();
      scatterplotInstanceRef.current = null;
    }
  }, [
    chartParentId,
    points,
    selectedClusters,
    selectedDimensions,
    showLabels,
    clusterLabels,
    onTooltip,
    onPointClick,
    isLoading
  ]);

  useEffect(() => {
    let isCancelled = false;
    
    const timerId = setTimeout(async () => {
      if (!isCancelled) {
        await initializePlot();
      }
    }, PLOT_INIT_DELAY_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
    };
  }, [initializePlot]);

  useEffect(() => {
    return () => {
      scatterplotInstanceRef.current?.destroy?.();
      scatterplotInstanceRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Spin size="large" tip="Loading visualization..." />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Alert
          message="No Data Available"
          description="No points to visualize. Please check your data or processing status."
          type="info"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        id={chartParentId}
        ref={plotContainerRef}
        className="w-full h-full border border-gray-200 rounded-lg bg-white shadow-sm"
        style={{ minHeight: '400px' }}
      />
      
      {/* Loading overlay for plot updates */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <Spin tip="Updating visualization..." />
        </div>
      )}
    </div>
  );
};

export default VisualizationPlot;