import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Scatterplot } from 'deepscatter';
import { 
  Layout, 
  Typography, 
  Spin, 
  Alert, 
  Button,
  Drawer,
  Progress
} from 'antd';
import { 
  MenuOutlined, 
  InfoOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { tableFromArrays } from 'apache-arrow';
import ControlsSidebar from './EmbeddingVisualization/ControlsSidebar';
import VisualizationPlot from './EmbeddingVisualization/VisualizationPlot';
import PointDetailsSidebar from './EmbeddingVisualization/PointDetailsSidebar';
import { useVisualizationData } from './EmbeddingVisualization/hooks/useVisualizationData';
import { useResponsiveLayout } from './EmbeddingVisualization/hooks/useResponsiveLayout';
import { usePointInteraction } from './EmbeddingVisualization/hooks/usePointInteraction';
import './tooltip.css';

const { Content, Sider } = Layout;
const { Title } = Typography;

// --- Constants ---
const CHART_PARENT_ID = 'deep-scatter-parent-element-id';

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

interface HoveredPoint extends Point {
  metadata?: Record<string, any>;
  title?: string;
  id?: string | number;
  isLabel?: boolean;
  labelText?: string;
  pointCount?: number;
}

const EmbeddingVisualization: React.FC = () => {
  const { embeddingId } = useParams<{ embeddingId: string }>();
  
  // Responsive layout state
  const { 
    isMobile, 
    isTablet, 
    isDesktop,
    siderCollapsed,
    setSiderCollapsed 
  } = useResponsiveLayout();
  
  // Data management
  const {
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
    handleExport
  } = useVisualizationData(embeddingId);

  // Point interaction
  const {
    hoveredPoint,
    handleTooltip,
    handlePointClick
  } = usePointInteraction(clusterLabels);

  // Mobile drawer states
  const [mobileControlsVisible, setMobileControlsVisible] = useState(false);
  const [mobileDetailsVisible, setMobileDetailsVisible] = useState(false);

  // Progress rendering
  const renderProgress = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full">
        <Title level={3} className="text-center mb-6 text-gray-800">
          Embedding Processing...
        </Title>
        
        {progress?.current_step && (
          <div className="mb-4 text-center">
            <span className="text-sm text-gray-600">
              Step: {progress.current_step.replace(/_/g, ' ')}
            </span>
          </div>
        )}
        
        <Progress
          percent={progress?.progress ?? 0}
          status={progress?.status === 'failed' ? 'exception' : 'active'}
          className="mb-4"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        
        {progress?.status === 'failed' && progress?.error && (
          <Alert
            message="Processing Failed"
            description={progress.error.error || 'An unknown error occurred during processing.'}
            type="error"
            showIcon
            className="mt-4"
          />
        )}
        
        {progress?.error?.traceback && (
          <div className="mt-4">
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32 border">
              {progress.error.traceback}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  // Main content rendering
  const renderMainContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spin size="large" tip="Loading visualization data..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <Alert 
            message="Error" 
            description={error} 
            type="error" 
            showIcon 
            closable 
          />
        </div>
      );
    }

    if (!isLoadingData && points.length === 0 && !isProcessing) {
      return (
        <div className="p-6">
          <Alert
            message="No Visualization Data"
            description={`No visualization data found for method '${selectedMethod}' and ${selectedDimensions}D for this embedding. Processing might be pending, failed previously, or data is unavailable.`}
            type="warning"
            showIcon
          />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col lg:flex-row">
        {/* Visualization Plot - Main Content */}
        <div className="flex-1 relative">
          <VisualizationPlot
            chartParentId={CHART_PARENT_ID}
            points={points}
            selectedClusters={selectedClusters}
            selectedDimensions={selectedDimensions}
            showLabels={showLabels}
            clusterLabels={clusterLabels}
            onTooltip={handleTooltip}
            onPointClick={handlePointClick}
            isLoading={isLoadingData}
          />
          
          {/* Mobile Control Buttons */}
          {isMobile && (
            <div className="mobile-controls-overlay">
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileControlsVisible(true)}
                className="shadow-lg hover:shadow-xl transition-all duration-200"
                size="large"
              >
                Controls
              </Button>
              
              {hoveredPoint && (
                <Button
                  type="primary"
                  icon={<InfoOutlined />}
                  onClick={() => setMobileDetailsVisible(true)}
                  className="shadow-lg hover:shadow-xl transition-all duration-200 animate-in slide-in-from-right"
                  size="large"
                >
                  Details
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Point Details Sidebar - Desktop */}
        {(isDesktop || isTablet) && (
          <Sider
            width={320}
            theme="light"
            className="border-l border-gray-200 shadow-sm custom-scrollbar"
            collapsible={isTablet}
            collapsed={isTablet && siderCollapsed}
            trigger={null}
          >
            <div className="transition-all duration-300">
              <PointDetailsSidebar 
                hoveredPoint={hoveredPoint}
                labelType={labelType}
              />
            </div>
          </Sider>
        )}
      </div>
    );
  };

  return (
    <Layout className={`min-h-screen bg-gray-50 embedding-visualization-layout ${
      isDesktop ? 'desktop-layout' : 
      isTablet ? `tablet-layout ${siderCollapsed ? 'tablet-sider-collapsed' : ''}` : 
      'mobile-layout'
    }`}>
      {/* Global Error Display */}
      {error && !isLoadingData && (
        <div className="p-4 animate-in slide-in-from-top duration-300">
          <Alert 
            message="Error" 
            description={error} 
            type="error" 
            showIcon 
            closable 
            onClose={() => {/* Clear error if you have a setter */}} 
          />
        </div>
      )}

      {/* Controls Sidebar - Desktop */}
      {!isProcessing && (isDesktop || isTablet) && (
        <Sider
          width={320}
          theme="light"
          className="border-r border-gray-200 shadow-sm custom-scrollbar"
          collapsible={isTablet}
          collapsed={isTablet && siderCollapsed}
          onCollapse={setSiderCollapsed}
          trigger={
            <div className="flex items-center justify-center h-12 border-t border-gray-200 hover:bg-gray-50 transition-colors duration-200">
              <Button 
                type="text" 
                icon={siderCollapsed ? <MenuOutlined /> : <CloseOutlined />}
                size="small"
                className="hover:bg-blue-50 hover:text-blue-600"
              />
            </div>
          }
        >
          <ControlsSidebar
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            selectedDimensions={selectedDimensions}
            setSelectedDimensions={setSelectedDimensions}
            selectedClusters={selectedClusters}
            uniqueClusters={uniqueClusters}
            points={points}
            onFilterChange={setSelectedClusters}
            onClearFilters={handleClearFilters}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            labelType={labelType}
            setLabelType={setLabelType}
            clusterLabels={clusterLabels}
            onExport={handleExport}
            visualizationData={visualizationData}
            isLoadingData={isLoadingData}
            collapsed={isTablet && siderCollapsed}
          />
        </Sider>
      )}

      {/* Main Content */}
      <Content className={`flex-1 visualization-container ${isLoadingData ? 'loading' : ''}`}>
        {isProcessing ? renderProgress() : renderMainContent()}
      </Content>

      {/* Mobile Drawers */}
      {isMobile && (
        <>
          {/* Controls Drawer */}
          <Drawer
            title={
              <div className="flex items-center space-x-2">
                <MenuOutlined className="text-blue-600" />
                <span className="text-gray-800 font-semibold">Visualization Controls</span>
              </div>
            }
            placement="left"
            open={mobileControlsVisible}
            onClose={() => setMobileControlsVisible(false)}
            width={320}
            className="lg:hidden custom-scrollbar"
            headerStyle={{ 
              borderBottom: '1px solid #f0f0f0',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div className="h-full custom-scrollbar">
              <ControlsSidebar
                selectedMethod={selectedMethod}
                setSelectedMethod={setSelectedMethod}
                selectedDimensions={selectedDimensions}
                setSelectedDimensions={setSelectedDimensions}
                selectedClusters={selectedClusters}
                uniqueClusters={uniqueClusters}
                points={points}
                onFilterChange={setSelectedClusters}
                onClearFilters={handleClearFilters}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
                labelType={labelType}
                setLabelType={setLabelType}
                clusterLabels={clusterLabels}
                onExport={handleExport}
                visualizationData={visualizationData}
                isLoadingData={isLoadingData}
                collapsed={false}
              />
            </div>
          </Drawer>

          {/* Details Drawer */}
          <Drawer
            title={
              <div className="flex items-center space-x-2">
                <InfoOutlined className="text-green-600" />
                <span className="text-gray-800 font-semibold">Point Details</span>
              </div>
            }
            placement="right"
            open={mobileDetailsVisible}
            onClose={() => setMobileDetailsVisible(false)}
            width={320}
            className="lg:hidden custom-scrollbar"
            headerStyle={{ 
              borderBottom: '1px solid #f0f0f0',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div className="h-full custom-scrollbar">
              <PointDetailsSidebar 
                hoveredPoint={hoveredPoint}
                labelType={labelType}
              />
            </div>
          </Drawer>
        </>
      )}
    </Layout>
  );
};

export default EmbeddingVisualization;