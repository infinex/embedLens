import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Typography,
  Spin,
  Alert,
  Tag,
  Space,
  Tooltip,
  Empty,
  Modal,
  Select,
  message,
  Badge,
  Divider,
  List,
  Avatar,
  Collapse
} from 'antd';
import {
  FileOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  DatabaseOutlined,
  DownOutlined,
  UpOutlined,
  InfoCircleOutlined,
  NumberOutlined,
  FontSizeOutlined
} from '@ant-design/icons';
import { api, FileData, Project, FileCheckResponse } from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface FileStatus {
  file: FileData;
  status: 'uploaded' | 'embeddings_ready' | 'visualization_ready' | 'processing' | 'error';
  hasVisualization: boolean;
  hasEmbeddings: boolean;
  error?: string;
  fileInfo?: FileCheckResponse;
}

const FileManager: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState<number | null>(null);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('openai-text-embedding-ada-002');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCardExpansion = (fileId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedCards(newExpanded);
  };

  const getColumnTypeIcon = (columnName: string, fileData: FileData) => {
    if (fileData.columns.numeric_columns.includes(columnName)) {
      return <NumberOutlined style={{ color: '#1890ff' }} />;
    } else if (fileData.columns.text_columns.includes(columnName)) {
      return <FontSizeOutlined style={{ color: '#52c41a' }} />;
    }
    return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getColumnTypeColor = (columnName: string, fileData: FileData) => {
    if (fileData.columns.numeric_columns.includes(columnName)) {
      return 'blue';
    } else if (fileData.columns.text_columns.includes(columnName)) {
      return 'green';
    }
    return 'default';
  };

  const renderColumnDetails = (fileData: FileData, fileInfo?: FileCheckResponse) => {
    const allColumns = fileData.columns.names;
    const textColumns = fileData.columns.text_columns;
    const numericColumns = fileData.columns.numeric_columns;
    
    return (
      <div className="mt-4">
        <Divider orientation="left" orientationMargin="0">
          <Text strong>Column Details</Text>
        </Divider>
        
        <div className="mb-3">
          <Text strong className="text-sm">Text Columns ({textColumns.length}):</Text>
          <div className="mt-2 flex flex-wrap gap-1">
            {textColumns.map(column => (
              <Tag 
                key={column} 
                color={getColumnTypeColor(column, fileData)}
                icon={getColumnTypeIcon(column, fileData)}
                className="mb-1"
              >
                {column}
              </Tag>
            ))}
          </div>
        </div>
        
        {numericColumns.length > 0 && (
          <div className="mb-3">
            <Text strong className="text-sm">Numeric Columns ({numericColumns.length}):</Text>
            <div className="mt-2 flex flex-wrap gap-1">
              {numericColumns.map(column => (
                <Tag 
                  key={column} 
                  color={getColumnTypeColor(column, fileData)}
                  icon={getColumnTypeIcon(column, fileData)}
                  className="mb-1"
                >
                  {column}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {fileInfo?.has_visualizations && (
          <div className="mt-3">
            <Alert
              message="Visualization Available"
              description={`This file has ${fileInfo.visualization_count} visualizations using ${fileInfo.available_methods.join(', ')} methods.`}
              type="success"
              size="small"
              showIcon
            />
          </div>
        )}
      </div>
    );
  };

  const fetchProject = async () => {
    if (!projectId) return;
    
    const result = await api.getProjects();
    if (!result.error && result.data) {
      const foundProject = result.data.find(p => p.project_id === parseInt(projectId));
      setProject(foundProject || null);
    }
  };

  const fetchFileStatuses = async () => {
    if (!projectId) return;
    
    setLoading(true);
    const filesResult = await api.getProjectFiles(parseInt(projectId));
    
    if (filesResult.error) {
      setError(filesResult.error);
      setLoading(false);
      return;
    }

    // Check status for each file
    const statuses = await Promise.all(
      filesResult.data.map(async (file): Promise<FileStatus> => {
        const statusCheck = await api.checkFileProcessingStatus(file.file_id);
        return {
          file,
          status: statusCheck.status,
          hasVisualization: statusCheck.hasVisualization,
          hasEmbeddings: statusCheck.hasEmbeddings,
          error: statusCheck.error,
          fileInfo: statusCheck.fileInfo
        };
      })
    );

    setFileStatuses(statuses);
    setLoading(false);
  };

  useEffect(() => {
    fetchProject();
    fetchFileStatuses();
  }, [projectId]);

  const getStatusBadge = (status: FileStatus['status'], fileInfo?: FileCheckResponse) => {
    switch (status) {
      case 'uploaded':
        return <Badge status="default" text="Uploaded" />;
      case 'embeddings_ready':
        return <Badge status="processing" text="Embeddings Ready" />;
      case 'visualization_ready':
        return (
          <Space>
            <Badge status="success" text="Visualization Ready" />
            {fileInfo?.visualization_count && (
              <Tag color="green" size="small">
                {fileInfo.visualization_count} viz
              </Tag>
            )}
          </Space>
        );
      case 'processing':
        return <Badge status="processing" text="Processing..." />;
      case 'error':
        return <Badge status="error" text="Error" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'uploaded':
        return <FileOutlined style={{ color: '#8c8c8c' }} />;
      case 'embeddings_ready':
        return <DatabaseOutlined style={{ color: '#1890ff' }} />;
      case 'visualization_ready':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'processing':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} className="animate-pulse" />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <FileOutlined />;
    }
  };

  const handleFileAction = async (fileStatus: FileStatus) => {
    const { file, status } = fileStatus;
    
    switch (status) {
      case 'visualization_ready':
        // Navigate to visualization
        navigate(`/embeddings/${file.file_id}`);
        break;
      case 'embeddings_ready':
        // Generate visualization - this would need to be implemented
        message.info('Visualization generation not yet implemented');
        break;
      case 'uploaded':
        // Generate embeddings
        setSelectedFile(file);
        setGenerateModalVisible(true);
        break;
      case 'processing':
        // Show progress - could navigate to progress page
        message.info('File is currently being processed');
        break;
      case 'error':
        // Show error details or retry
        message.error(fileStatus.error || 'Unknown error occurred');
        break;
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!selectedFile || !selectedColumn) return;
    
    setProcessingFile(selectedFile.file_id);
    const result = await api.generateEmbeddings(selectedFile.file_id, selectedColumn, selectedModel);
    
    if (result.error) {
      message.error(`Failed to generate embeddings: ${result.error}`);
    } else {
      message.success('Embedding generation started');
      // Navigate to progress page
      navigate(`/job/${result.data.job_id}/progress`);
    }
    
    setProcessingFile(null);
    setGenerateModalVisible(false);
    setSelectedFile(null);
    setSelectedColumn('');
  };

  const getActionButton = (fileStatus: FileStatus) => {
    const { status } = fileStatus;
    
    switch (status) {
      case 'visualization_ready':
        return (
          <Button 
            type="primary" 
            icon={<EyeOutlined />}
            onClick={() => handleFileAction(fileStatus)}
          >
            View Visualization
          </Button>
        );
      case 'embeddings_ready':
        return (
          <Button 
            type="default" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleFileAction(fileStatus)}
          >
            Create Visualization
          </Button>
        );
      case 'uploaded':
        return (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={() => handleFileAction(fileStatus)}
          >
            Generate Embeddings
          </Button>
        );
      case 'processing':
        return (
          <Button 
            disabled 
            icon={<ClockCircleOutlined />}
          >
            Processing...
          </Button>
        );
      case 'error':
        return (
          <Button 
            danger 
            icon={<ExclamationCircleOutlined />}
            onClick={() => handleFileAction(fileStatus)}
          >
            View Error
          </Button>
        );
      default:
        return (
          <Button disabled>
            Unknown Status
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Button 
              type="text" 
              onClick={() => navigate('/')}
              className="mb-2"
            >
              ← Back to Projects
            </Button>
            <Title level={2} className="m-0">
              {project?.name || 'Project Files'}
            </Title>
          </div>
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchFileStatuses}
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => navigate(`/add-data/${projectId}`)}
            >
              Add Data
            </Button>
          </Space>
        </div>
        
        {error && (
          <Alert 
            message="Error" 
            description={error} 
            type="error" 
            closable 
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        <Text type="secondary">
          {project?.description || 'Manage files and visualizations for this project'}
        </Text>
      </div>

      {fileStatuses.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No files in this project yet"
        >
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => navigate(`/add-data/${projectId}`)}
          >
            Upload Your First File
          </Button>
        </Empty>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={fileStatuses}
          renderItem={(fileStatus) => (
            <List.Item
              key={fileStatus.file.file_id}
              actions={[
                <Button
                  key="toggle"
                  type="text"
                  size="small"
                  icon={expandedCards.has(fileStatus.file.file_id) ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => toggleCardExpansion(fileStatus.file.file_id)}
                >
                  {expandedCards.has(fileStatus.file.file_id) ? 'Less' : 'More'}
                </Button>,
                getActionButton(fileStatus)
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={getStatusIcon(fileStatus.status)} 
                    style={{ 
                      backgroundColor: 
                        fileStatus.status === 'visualization_ready' ? '#52c41a' :
                        fileStatus.status === 'embeddings_ready' ? '#1890ff' :
                        fileStatus.status === 'processing' ? '#faad14' :
                        fileStatus.status === 'error' ? '#ff4d4f' : '#d9d9d9'
                    }}
                  />
                }
                title={
                  <div className="flex items-center justify-between">
                    <span className="truncate">{fileStatus.file.original_filename}</span>
                    {getStatusBadge(fileStatus.status, fileStatus.fileInfo)}
                  </div>
                }
                description={
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <span><strong>Rows:</strong> {fileStatus.file.row_count.toLocaleString()}</span>
                      <span><strong>Columns:</strong> {fileStatus.file.columns.names.length} total</span>
                      <Tag color="green" size="small">
                        {fileStatus.file.columns.text_columns.length} text
                      </Tag>
                      <Tag color="blue" size="small">
                        {fileStatus.file.columns.numeric_columns.length} numeric
                      </Tag>
                      {fileStatus.fileInfo?.has_visualizations && (
                        <Tag color="purple" size="small">
                          {fileStatus.fileInfo.visualization_count} viz
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Uploaded: {new Date(fileStatus.file.created_at).toLocaleDateString()}
                    </div>
                    
                    {fileStatus.error && !expandedCards.has(fileStatus.file.file_id) && (
                      <Alert 
                        message={fileStatus.error} 
                        type="error" 
                        size="small" 
                        className="mt-2"
                      />
                    )}
                    
                    {expandedCards.has(fileStatus.file.file_id) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded">
                        {renderColumnDetails(fileStatus.file, fileStatus.fileInfo)}
                        
                        {fileStatus.error && (
                          <div className="mt-4">
                            <Alert 
                              message="Processing Error" 
                              description={fileStatus.error} 
                              type="error" 
                              size="small" 
                              showIcon
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* Generate Embeddings Modal */}
      <Modal
        title="Generate Embeddings"
        open={generateModalVisible}
        onCancel={() => {
          setGenerateModalVisible(false);
          setSelectedFile(null);
          setSelectedColumn('');
        }}
        footer={[
          <Button 
            key="cancel"
            onClick={() => {
              setGenerateModalVisible(false);
              setSelectedFile(null);
              setSelectedColumn('');
            }}
          >
            Cancel
          </Button>,
          <Button
            key="generate"
            type="primary"
            loading={processingFile === selectedFile?.file_id}
            disabled={!selectedColumn}
            onClick={handleGenerateEmbeddings}
          >
            Generate Embeddings
          </Button>
        ]}
      >
        {selectedFile && (
          <div>
            <div className="mb-4">
              <Text strong>File: </Text>
              <Text>{selectedFile.original_filename}</Text>
              <div className="mt-2">
                <Text type="secondary" className="text-sm">
                  {selectedFile.row_count.toLocaleString()} rows, {selectedFile.columns.names.length} columns
                </Text>
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Available Text Columns ({selectedFile.columns.text_columns.length}):</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <div className="flex flex-wrap gap-1">
                  {selectedFile.columns.text_columns.map(column => (
                    <Tag 
                      key={column} 
                      color={selectedColumn === column ? 'blue' : 'green'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedColumn(column)}
                    >
                      {column}
                    </Tag>
                  ))}
                </div>
              </div>
              <Text type="secondary" className="text-xs mt-1">
                Click on a column name to select it for embedding generation
              </Text>
            </div>
            
            <div className="mt-4">
              <Text strong>Selected Column:</Text>
              <Select
                className="w-full mt-2"
                placeholder="Choose a text column"
                value={selectedColumn}
                onChange={setSelectedColumn}
                showSearch
                optionFilterProp="children"
              >
                {selectedFile.columns.text_columns.map(column => (
                  <Option key={column} value={column}>
                    <Space>
                      <FontSizeOutlined style={{ color: '#52c41a' }} />
                      {column}
                      <Text type="secondary" className="text-xs">
                        ({selectedFile.columns.types[column] || 'text'})
                      </Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>

            <div className="mt-4">
              <Text strong>Model:</Text>
              <Select
                className="w-full mt-2"
                value={selectedModel}
                onChange={setSelectedModel}
              >
                <Option value="openai-text-embedding-ada-002">
                  <Space>
                    <DatabaseOutlined />
                    OpenAI Text Embedding Ada-002
                  </Space>
                </Option>
              </Select>
              <Text type="secondary" className="text-xs mt-1">
                This model will generate embeddings for the selected text column
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileManager;