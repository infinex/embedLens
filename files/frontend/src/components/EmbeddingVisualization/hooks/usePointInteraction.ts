import { useState, useCallback } from 'react';

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

interface HoveredPoint extends Point {
  metadata?: Record<string, any>;
  title?: string;
  id?: string | number;
  isLabel?: boolean;
  labelText?: string;
  pointCount?: number;
}

interface UsePointInteractionReturn {
  hoveredPoint: HoveredPoint | null;
  handleTooltip: (point: Point) => string;
  handlePointClick: (point: Point) => void;
  setHoveredPoint: (point: HoveredPoint | null) => void;
}

export const usePointInteraction = (
  clusterLabels: ClusterLabel[]
): UsePointInteractionReturn => {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const handleTooltip = useCallback((point: Point): string => {
    // Check if this might be a label by comparing with cluster centroids
    const matchingLabel = clusterLabels.find(label => 
      Math.abs(label.x - point.x) < 0.01 && 
      Math.abs(label.y - point.y) < 0.01 &&
      label.cluster === point.cluster
    );
    
    const enhancedPoint: HoveredPoint = {
      ...point,
      isLabel: !!matchingLabel,
      labelText: matchingLabel?.label,
      pointCount: matchingLabel?.pointCount
    };
    
    setHoveredPoint(enhancedPoint);
    
    if (matchingLabel) {
      return `<div class="label-tooltip">Label: ${matchingLabel.label}</div>`;
    }
    
    return `<div class="minimal-tooltip">Cluster ${point.cluster}</div>`;
  }, [clusterLabels]);

  const handlePointClick = useCallback((point: Point) => {
    console.log('Point clicked:', point);
    // You could implement custom behavior on click, like showing details in a sidebar
    // or navigating to a detailed view
  }, []);

  return {
    hoveredPoint,
    handleTooltip,
    handlePointClick,
    setHoveredPoint,
  };
};