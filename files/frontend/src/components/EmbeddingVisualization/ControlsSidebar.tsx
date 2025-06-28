import React from 'react';
import { 
  Typography, 
  Radio, 
  Select, 
  Button, 
  Switch, 
  Space,
  Divider,
  Card
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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

interface ControlsSidebarProps {
  selectedMethod: string;
  setSelectedMethod: (method: string) => void;
  selectedDimensions: number;
  setSelectedDimensions: (dimensions: number) => void;
  selectedClusters: number[];
  uniqueClusters: number[];
  points: any[];
  onFilterChange: (clusters: number[]) => void;
  onClearFilters: () => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  labelType: 'cluster' | 'count' | 'coords';
  setLabelType: (type: 'cluster' | 'count' | 'coords') => void;
  clusterLabels: any[];
  onExport: (format: 'csv' | 'json') => void;
  visualizationData: any;
  isLoadingData: boolean;
  collapsed: boolean;
}

const ControlsSidebar: React.FC<ControlsSidebarProps> = ({
  selectedMethod,
  setSelectedMethod,
  selectedDimensions,
  setSelectedDimensions,
  selectedClusters,
  uniqueClusters,
  points,
  onFilterChange,
  onClearFilters,
  showLabels,
  setShowLabels,
  labelType,
  setLabelType,
  clusterLabels,
  onExport,
  visualizationData,
  isLoadingData,
  collapsed
}) => {
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center justify-start pt-4">
        <div className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">
          Controls
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar">
      <div className="p-6 space-y-6">
        <div className="text-center">
          <Title level={4} className="text-gray-800 mb-2">
            Visualization Controls
          </Title>
          <Text type="secondary" className="text-sm">
            Customize your embedding visualization
          </Text>
        </div>

        <Divider className="my-4" />

        {/* Method Selection */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <Text strong className="text-sm text-gray-700">
              Reduction Method
            </Text>
            <Radio.Group
              options={METHODS}
              onChange={(e) => setSelectedMethod(e.target.value)}
              value={selectedMethod}
              optionType="button"
              buttonStyle="solid"
              disabled={isLoadingData}
              className="w-full"
              size="small"
            />
          </div>
        </Card>

        {/* Dimensions Selection */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <Text strong className="text-sm text-gray-700">
              Dimensions
            </Text>
            <Radio.Group
              options={DIMENSIONS}
              onChange={(e) => setSelectedDimensions(e.target.value)}
              value={selectedDimensions}
              optionType="button"
              buttonStyle="solid"
              disabled={isLoadingData}
              className="w-full"
              size="small"
            />
          </div>
        </Card>

        {/* Cluster Filtering */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-4">
            <Text strong className="text-sm text-gray-700">
              Filter Clusters
            </Text>
            
            <Select
              mode="multiple"
              allowClear
              placeholder="Select clusters to show"
              className="w-full"
              value={selectedClusters}
              onChange={onFilterChange}
              options={uniqueClusters.map((cluster) => ({
                label: `Cluster ${cluster}`,
                value: cluster,
              }))}
              disabled={isLoadingData || points.length === 0}
              loading={isLoadingData}
              size="small"
              maxTagCount="responsive"
            />

            {selectedClusters.length > 0 && (
              <Button
                size="small"
                onClick={onClearFilters}
                className="w-full"
                type="default"
              >
                Clear Filters ({selectedClusters.length} selected)
              </Button>
            )}

            {/* Filter Status */}
            <div className={`
              text-xs p-3 rounded-lg border transition-colors
              ${selectedClusters.length > 0
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
              }
            `}>
              <div className="font-medium mb-1">
                {selectedClusters.length > 0 ? 'Filtering Active' : 'No Filter'}
              </div>
              <div>
                Showing{' '}
                {selectedClusters.length > 0
                  ? points.filter(p => selectedClusters.includes(p.cluster)).length
                  : points.length
                }{' '}
                of {points.length} points
              </div>
            </div>
          </div>
        </Card>

        {/* Label Controls */}
        <Card size="small" className="shadow-sm border-blue-100 bg-blue-50/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text strong className="text-sm text-gray-700">
                Cluster Labels
              </Text>
              <Switch
                checked={showLabels}
                onChange={setShowLabels}
                disabled={isLoadingData || points.length === 0}
                size="small"
              />
            </div>

            {showLabels && (
              <>
                <Radio.Group
                  options={LABEL_TYPES}
                  onChange={(e) => setLabelType(e.target.value)}
                  value={labelType}
                  optionType="button"
                  buttonStyle="solid"
                  disabled={isLoadingData || !showLabels || points.length === 0}
                  className="w-full"
                  size="small"
                />

                <div className="text-xs text-center p-2 bg-blue-100 rounded-md text-blue-700">
                  {clusterLabels.length} labels generated
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Export Controls */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <Text strong className="text-sm text-gray-700">
              Export Data
            </Text>
            
            <Space direction="vertical" className="w-full">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => onExport('csv')}
                disabled={isLoadingData || !visualizationData || visualizationData.length === 0}
                className="w-full"
                size="small"
                type="default"
              >
                Export CSV
              </Button>
              
              <Button
                icon={<DownloadOutlined />}
                onClick={() => onExport('json')}
                disabled={isLoadingData || !visualizationData || visualizationData.length === 0}
                className="w-full"
                size="small"
                type="default"
              >
                Export JSON
              </Button>
            </Space>
          </div>
        </Card>

        {/* Statistics Summary */}
        {points.length > 0 && (
          <Card size="small" className="shadow-sm bg-gray-50">
            <div className="space-y-2">
              <Text strong className="text-sm text-gray-700">
                Data Summary
              </Text>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded">
                  <div className="font-medium text-gray-600">Total Points</div>
                  <div className="text-lg font-bold text-gray-800">{points.length}</div>
                </div>
                
                <div className="bg-white p-2 rounded">
                  <div className="font-medium text-gray-600">Clusters</div>
                  <div className="text-lg font-bold text-gray-800">{uniqueClusters.length}</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ControlsSidebar;