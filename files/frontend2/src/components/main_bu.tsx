import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusOutlined, 
  FolderOutlined, 
  FileTextOutlined, 
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Card, 
  List, 
  Typography, 
  Space, 
  Tag, 
  Spin, 
  Empty,
  message,
  Layout,
  Descriptions
} from 'antd';

const { Title, Text } = Typography;
const { Header, Sider, Content } = Layout;

interface Project {
  project_id: number;
  name: string;
  description: string;
  user_id: number;
  created_at: string;
}

interface ProjectFile {
  file_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  project_id: number;
  row_count: number;
  created_at: string;
  columns: {
    names: string[];
    types: Record<string, string>;
    sample_size: number;
    numeric_columns: string[];
    text_columns: string[];
  };
}

const API_BASE = 'http://localhost:8000/api';
const AUTH_TOKEN = 'asdasd';

const Main: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch files when project is selected  
  useEffect(() => {
    if (selectedProject) {
      fetchProjectFiles(selectedProject.project_id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProjects(data);
      
      // Select first project by default
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      message.error(`Error fetching projects: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectFiles = async (projectId: number) => {
    try {
      setFilesLoading(true);
      const response = await fetch(`/api/files/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProjectFiles(Array.isArray(data) ? data : [data]);
    } catch (err) {
      message.error(`Error fetching project files: ${err.message}`);
      setProjectFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const checkVisualizationExists = async (fileId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/visualizations/file/${fileId}?method=umap&dimensions=2`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'accept': 'application/json'
        }
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  };

  const handleFileClick = async (file: ProjectFile) => {
    try {
      const hasVisualization = await checkVisualizationExists(file.file_id);
      
      if (hasVisualization) {
        // Navigate to visualization
        navigate(`/visualizations/file/${file.file_id}?method=umap&dimensions=2`);
      } else {
        // Route to add-data for processing
        navigate('/add-data');
      }
    } catch (err) {
      message.error('Error checking visualization status');
      navigate('/add-data');
    }
  };

  const generateEmbedding = async (fileId: number, column: string) => {
    try {
      const response = await fetch(`/api/embeddings/${fileId}/generate?column=${column}&model_name=openai-text-embedding-ada-002`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'accept': 'application/json'
        },
        body: ''
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      message.success(`Embedding generation started. Job ID: ${data.job_id}`);
    } catch (err) {
      message.error(`Error generating embedding: ${err.message}`);
    }
  };

  return (
    <Layout className="min-h-screen">
      {/* Top Bar */}
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <Title level={3} className="!mb-0 text-blue-600">EmbedLens</Title>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            const projectId = selectedProject?.project_id || 1;
            navigate(`/add-data?project=${projectId}`);
          }}
        >
          Add Data
        </Button>
      </Header>

      <Layout>
        {/* Left Sidebar - Projects */}
        <Sider width={320} className="bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <Title level={4} className="!mb-0">Projects</Title>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <Spin size="large" />
                <div className="mt-4">
                  <Text type="secondary">Loading projects...</Text>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <Empty
                image={<FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                description="No projects found"
              />
            ) : (
              <List
                dataSource={projects}
                renderItem={(project) => (
                  <List.Item className="!px-0 !py-2">
                    <Card
                      hoverable
                      size="small"
                      className={`w-full cursor-pointer transition-all ${
                        selectedProject?.project_id === project.project_id
                          ? 'border-blue-500 bg-blue-50'
                          : ''
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex items-start">
                        <FolderOutlined className="text-blue-500 mr-3 mt-1" />
                        <div className="flex-1 min-w-0">
                          <Text strong className="block truncate">{project.name}</Text>
                          <Text type="secondary" className="text-xs block truncate">
                            ID: {project.project_id}
                          </Text>
                          {project.description && (
                            <Text type="secondary" className="text-xs block truncate">
                              {project.description}
                            </Text>
                          )}
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Sider>

        {/* Main Content - Files */}
        <Content className="bg-gray-50">
          {selectedProject ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Title level={2} className="!mb-1">{selectedProject.name}</Title>
                  <Text type="secondary">Project ID: {selectedProject.project_id}</Text>
                  {selectedProject.description && (
                    <>
                      <br />
                      <Text type="secondary">{selectedProject.description}</Text>
                    </>
                  )}
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchProjectFiles(selectedProject.project_id)}
                  title="Refresh files"
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <Title level={3} className="!mb-0">Files</Title>
                </div>
                
                <div className="p-6">
                  {filesLoading ? (
                    <div className="text-center py-12">
                      <Spin size="large" />
                      <div className="mt-4">
                        <Text type="secondary">Loading files...</Text>
                      </div>
                    </div>
                  ) : projectFiles.length === 0 ? (
                    <Empty
                      image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                      description={
                        <div>
                          <Text type="secondary">No files in this project</Text>
                          <br />
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`/add-data?project=${selectedProject.project_id}`)}
                            className="mt-4"
                          >
                            Add Files
                          </Button>
                        </div>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {projectFiles.map((file) => (
                        <Card 
                          key={file.file_id}
                          hoverable
                          className="cursor-pointer"
                          onClick={() => handleFileClick(file)}
                        >
                          <div className="flex items-start justify-between">
                            <Space align="start">
                              <FileTextOutlined className="text-blue-500 text-xl" />
                              <div>
                                <Text strong className="text-lg">{file.original_filename}</Text>
                                <br />
                                <Text type="secondary" className="text-sm">
                                  File ID: {file.file_id} • {file.row_count.toLocaleString()} rows • {file.file_type.toUpperCase()}
                                </Text>
                                <br />
                                <Text type="secondary" className="text-xs">
                                  Created: {new Date(file.created_at).toLocaleDateString()}
                                </Text>
                              </div>
                            </Space>
                            
                            <Space direction="vertical" align="end">
                              <Button
                                type="primary"
                                icon={<EyeOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileClick(file);
                                }}
                              >
                                View
                              </Button>
                              {file.columns.text_columns.length > 0 && (
                                <Button
                                  icon={<PlayCircleOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Use first text column as default
                                    generateEmbedding(file.file_id, file.columns.text_columns[0]);
                                  }}
                                >
                                  Generate Embeddings
                                </Button>
                              )}
                            </Space>
                          </div>
                          
                          {/* Column Information */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <Descriptions size="small" column={1}>
                              {file.columns.text_columns.length > 0 && (
                                <Descriptions.Item label="Text Columns">
                                  <div className="flex flex-wrap gap-1">
                                    {file.columns.text_columns.map(col => (
                                      <Tag key={col} color="blue" className="text-xs">{col}</Tag>
                                    ))}
                                  </div>
                                </Descriptions.Item>
                              )}
                              {file.columns.numeric_columns.length > 0 && (
                                <Descriptions.Item label="Numeric Columns">
                                  <div className="flex flex-wrap gap-1">
                                    {file.columns.numeric_columns.map(col => (
                                      <Tag key={col} color="green" className="text-xs">{col}</Tag>
                                    ))}
                                  </div>
                                </Descriptions.Item>
                              )}
                              <Descriptions.Item label="Sample Size">
                                <Text className="text-xs">{file.columns.sample_size.toLocaleString()} rows</Text>
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Empty
                image={<FolderOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description={
                  <div>
                    <Title level={4} type="secondary">Select a Project</Title>
                    <Text type="secondary">Choose a project from the sidebar to view its files</Text>
                  </div>
                }
              />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Main;