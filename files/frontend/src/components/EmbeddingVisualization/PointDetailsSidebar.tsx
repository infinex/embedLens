import React from 'react';
import { Typography, Card, Tag, Empty, Divider } from 'antd';
import { 
  InfoCircleOutlined, 
  ClusterOutlined,
  AimOutlined,
  TagOutlined 
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface HoveredPoint {
  x: number;
  y: number;
  z?: number;
  cluster: number;
  metadata?: Record<string, any>;
  title?: string;
  id?: string | number;
  isLabel?: boolean;
  labelText?: string;
  pointCount?: number;
}

interface PointDetailsSidebarProps {
  hoveredPoint: HoveredPoint | null;
  labelType: 'cluster' | 'count' | 'coords';
}

const LABEL_TYPE_NAMES = {
  cluster: 'Cluster Names',
  count: 'Point Counts', 
  coords: 'Coordinates'
};

const PointDetailsSidebar: React.FC<PointDetailsSidebarProps> = ({
  hoveredPoint,
  labelType
}) => {
  if (!hoveredPoint) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-gray-500">
              Hover over a point to view details
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="text-center">
          <Title level={4} className="mb-2 text-gray-800">
            Point Details
          </Title>
          <Text type="secondary" className="text-sm">
            Information about the selected point
          </Text>
        </div>

        <Divider className="my-4" />

        {/* Main Point Information */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {hoveredPoint.isLabel ? (
                <TagOutlined className="text-blue-500" />
              ) : (
                <AimOutlined className="text-green-500" />
              )}
              <Title level={5} className="mb-0">
                {hoveredPoint.isLabel ? 'Cluster Label' : `Data Point`}
              </Title>
            </div>

            {hoveredPoint.isLabel && hoveredPoint.labelText && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Text strong className="text-blue-700 text-base">
                  {hoveredPoint.labelText}
                </Text>
              </div>
            )}

            {hoveredPoint.title && !hoveredPoint.isLabel && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <Text strong className="text-gray-700">
                  {hoveredPoint.title}
                </Text>
              </div>
            )}
          </div>
        </Card>

        {/* Cluster Information */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <ClusterOutlined className="text-purple-500" />
              <Text strong className="text-sm">Cluster Information</Text>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Text type="secondary">Cluster ID:</Text>
                <Tag color="purple" className="ml-2">
                  {hoveredPoint.cluster}
                </Tag>
              </div>
              
              {hoveredPoint.isLabel && hoveredPoint.pointCount && (
                <div className="flex justify-between items-center">
                  <Text type="secondary">Points in Cluster:</Text>
                  <Tag color="blue" className="ml-2">
                    {hoveredPoint.pointCount}
                  </Tag>
                </div>
              )}
              
              {hoveredPoint.isLabel && (
                <div className="flex justify-between items-center">
                  <Text type="secondary">Label Type:</Text>
                  <Tag color="green" className="ml-2">
                    {LABEL_TYPE_NAMES[labelType]}
                  </Tag>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Coordinates */}
        <Card size="small" className="shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <InfoCircleOutlined className="text-orange-500" />
              <Text strong className="text-sm">Coordinates</Text>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">X:</span>
                  <span className="text-gray-800 font-medium">
                    {hoveredPoint.x.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Y:</span>
                  <span className="text-gray-800 font-medium">
                    {hoveredPoint.y.toFixed(4)}
                  </span>
                </div>
                {hoveredPoint.z !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Z:</span>
                    <span className="text-gray-800 font-medium">
                      {hoveredPoint.z.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Point ID */}
        {hoveredPoint.id && (
          <Card size="small" className="shadow-sm">
            <div className="space-y-3">
              <Text strong className="text-sm">Point ID</Text>
              <div className="bg-gray-50 rounded-lg p-3">
                <Text className="font-mono text-sm text-gray-700">
                  {hoveredPoint.id}
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* Metadata */}
        {hoveredPoint.metadata && Object.keys(hoveredPoint.metadata).length > 0 && (
          <Card size="small" className="shadow-sm">
            <div className="space-y-3">
              <Text strong className="text-sm">Metadata</Text>
              <div className="space-y-2">
                {Object.entries(hoveredPoint.metadata).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400"
                  >
                    <div className="space-y-1">
                      <Text strong className="text-xs text-gray-600 uppercase tracking-wide">
                        {key}
                      </Text>
                      <Paragraph className="mb-0 text-sm text-gray-800">
                        {String(value)}
                      </Paragraph>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Additional Information for Labels */}
        {hoveredPoint.isLabel && (
          <Card size="small" className="shadow-sm bg-blue-50 border-blue-200">
            <div className="space-y-2">
              <Text strong className="text-sm text-blue-700">
                Label Information
              </Text>
              <div className="text-xs text-blue-600 space-y-1">
                <div>• This is a cluster centroid label</div>
                <div>• Position represents cluster center</div>
                <div>• Label shows {LABEL_TYPE_NAMES[labelType].toLowerCase()}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PointDetailsSidebar;