import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Typography, Progress, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { api } from '../utils/api';

const { Title, Text } = Typography;

interface ProcessingStatusHandlerProps {
  fileId?: number;
  onStatusChange?: (status: ProcessingStatus) => void;
}

interface ProcessingStatus {
  status: 'checking' | 'uploaded' | 'embeddings_ready' | 'visualization_ready' | 'processing' | 'error';
  hasVisualization: boolean;
  hasEmbeddings: boolean;
  error?: string;
  progress?: number;
  message?: string;
}

const ProcessingStatusHandler: React.FC<ProcessingStatusHandlerProps> = ({ 
  fileId: propFileId, 
  onStatusChange 
}) => {
  const { fileId: paramFileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  
  const fileId = propFileId || (paramFileId ? parseInt(paramFileId) : null);
  
  const [status, setStatus] = useState<ProcessingStatus>({
    status: 'checking',
    hasVisualization: false,
    hasEmbeddings: false
  });
  const [checking, setChecking] = useState(false);

  const checkFileStatus = useCallback(async () => {
    if (!fileId) return;
    
    setChecking(true);
    
    try {
      // First, try to get visualization data
      const vizResult = await api.getVisualization(fileId);
      
      if (!vizResult.error && vizResult.data && vizResult.data.length > 0) {
        // Visualization exists and is ready
        const newStatus: ProcessingStatus = {
          status: 'visualization_ready',
          hasVisualization: true,
          hasEmbeddings: true,
          message: 'Visualization is ready to view'
        };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        setChecking(false);
        return;
      }

      // If visualization doesn't exist, check if it's processing
      // This would typically involve checking a job status or embedding status
      // For now, we'll assume it's in the uploaded state
      const newStatus: ProcessingStatus = {
        status: 'uploaded',
        hasVisualization: false,
        hasEmbeddings: false,
        message: 'File is uploaded but embeddings need to be generated'
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      
    } catch (error) {
      const errorStatus: ProcessingStatus = {
        status: 'error',
        hasVisualization: false,
        hasEmbeddings: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to check file status'
      };
      setStatus(errorStatus);
      onStatusChange?.(errorStatus);
    }
    
    setChecking(false);
  }, [fileId, onStatusChange]);

  useEffect(() => {
    if (fileId) {
      checkFileStatus();
    }
  }, [fileId, checkFileStatus]);

  // Auto-refresh for processing status
  useEffect(() => {
    if (status.status === 'processing') {
      const interval = setInterval(checkFileStatus, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [status.status, checkFileStatus]);

  const handleViewVisualization = () => {
    if (fileId) {
      navigate(`/embeddings/${fileId}`);
    }
  };

  const handleGenerateEmbeddings = () => {
    if (fileId) {
      // Navigate back to file manager or show embedding generation modal
      navigate(`/project/${fileId}/generate-embeddings`);
    }
  };

  const handleRetry = () => {
    checkFileStatus();
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'checking':
        return <ClockCircleOutlined className="text-blue-500 animate-pulse" />;
      case 'uploaded':
        return <ClockCircleOutlined className="text-gray-500" />;
      case 'embeddings_ready':
        return <ClockCircleOutlined className="text-blue-500" />;
      case 'visualization_ready':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'processing':
        return <ClockCircleOutlined className="text-blue-500 animate-pulse" />;
      case 'error':
        return <ExclamationCircleOutlined className="text-red-500" />;
      default:
        return <ClockCircleOutlined className="text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'checking':
        return 'Checking file processing status...';
      case 'uploaded':
        return 'File uploaded successfully. Ready to generate embeddings.';
      case 'embeddings_ready':
        return 'Embeddings generated. Ready to create visualization.';
      case 'visualization_ready':
        return 'Visualization is ready to view!';
      case 'processing':
        return 'Processing in progress. This may take a few minutes...';
      case 'error':
        return status.error || 'An error occurred during processing.';
      default:
        return 'Unknown status';
    }
  };

  const getActionButtons = () => {
    const buttons = [];
    
    switch (status.status) {
      case 'visualization_ready':
        buttons.push(
          <Button 
            key="view"
            type="primary" 
            icon={<EyeOutlined />}
            onClick={handleViewVisualization}
          >
            View Visualization
          </Button>
        );
        break;
      case 'uploaded':
        buttons.push(
          <Button 
            key="generate"
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={handleGenerateEmbeddings}
          >
            Generate Embeddings
          </Button>
        );
        break;
      case 'error':
        buttons.push(
          <Button 
            key="retry"
            type="default" 
            icon={<ReloadOutlined />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        );
        break;
    }

    // Always add manual refresh button
    buttons.push(
      <Button 
        key="refresh"
        icon={<ReloadOutlined />}
        onClick={handleRetry}
        loading={checking}
      >
        Refresh Status
      </Button>
    );

    return buttons;
  };

  if (!fileId) {
    return (
      <Alert
        message="No file ID provided"
        description="Unable to check processing status without a file ID"
        type="error"
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="text-center">
        <div className="mb-4">
          <div className="text-6xl mb-4">
            {getStatusIcon()}
          </div>
          <Title level={3}>
            {status.status === 'checking' ? 'Checking Status' : 
             status.status === 'visualization_ready' ? 'Ready!' :
             status.status === 'error' ? 'Error' : 'Processing'}
          </Title>
        </div>

        <div className="mb-6">
          <Text className="text-base">
            {getStatusMessage()}
          </Text>
          {status.message && status.message !== getStatusMessage() && (
            <div className="mt-2">
              <Text type="secondary">{status.message}</Text>
            </div>
          )}
        </div>

        {status.status === 'processing' && status.progress !== undefined && (
          <div className="mb-6">
            <Progress 
              percent={status.progress} 
              status={status.progress === 100 ? 'success' : 'active'}
            />
          </div>
        )}

        {status.error && (
          <Alert
            message="Error Details"
            description={status.error}
            type="error"
            className="mb-6 text-left"
          />
        )}

        <Space wrap>
          {getActionButtons()}
        </Space>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <Text type="secondary" className="text-sm">
            File ID: {fileId}
          </Text>
          <br />
          <Text type="secondary" className="text-sm">
            Status: {status.status}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ProcessingStatusHandler;