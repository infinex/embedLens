import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Typography, 
  Spin, 
  Alert, 
  Modal, 
  Form, 
  Input, 
  Empty,
  Statistic,
  Space,
  Tag,
  Divider,
  Avatar
} from 'antd';
import { 
  PlusOutlined, 
  FileOutlined, 
  FolderOpenOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { api, Project, FileCheckResponse } from '../utils/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProjectWithStats extends Project {
  fileCount: number;
  processingCount: number;
  completedCount: number;
  totalVisualizations: number;
}

const ProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    const result = await api.getProjects();
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Fetch file statistics for each project
    const projectsWithStats = await Promise.all(
      result.data.map(async (project) => {
        const filesResult = await api.getProjectFiles(project.project_id);
        let fileCount = 0;
        let processingCount = 0;
        let completedCount = 0;
        let totalVisualizations = 0;

        if (!filesResult.error && filesResult.data) {
          fileCount = filesResult.data.length;
          
          // Check processing status for each file
          for (const file of filesResult.data) {
            const status = await api.checkFileProcessingStatus(file.file_id);
            if (status.status === 'visualization_ready') {
              completedCount++;
              if (status.fileInfo?.visualization_count) {
                totalVisualizations += status.fileInfo.visualization_count;
              }
            } else if (status.status === 'processing') {
              processingCount++;
            }
          }
        }

        return {
          ...project,
          fileCount,
          processingCount,
          completedCount,
          totalVisualizations
        };
      })
    );

    setProjects(projectsWithStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (values: { name: string; description: string }) => {
    setCreateLoading(true);
    const result = await api.createProject(values);
    
    if (result.error) {
      setError(result.error);
    } else {
      setCreateModalVisible(false);
      form.resetFields();
      fetchProjects(); // Refresh the list
    }
    
    setCreateLoading(false);
  };

  const handleProjectClick = (projectId: number) => {
    navigate(`/project/${projectId}`);
  };

  const handleAddData = (projectId: number) => {
    navigate(`/add-data/${projectId}`);
  };

  const getStatusTag = (project: ProjectWithStats) => {
    if (project.processingCount > 0) {
      return <Tag color="processing" icon={<ClockCircleOutlined />}>Processing</Tag>;
    }
    if (project.completedCount > 0) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Ready</Tag>;
    }
    return <Tag color="default">Empty</Tag>;
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
          <Title level={2} className="m-0">Projects</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Project
          </Button>
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
          Manage your data projects and visualizations
        </Text>
      </div>

      {projects.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No projects yet"
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Your First Project
          </Button>
        </Empty>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div 
              key={project.project_id}
              className="hover:bg-gray-50 transition-colors rounded-lg p-4 border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <Avatar 
                    size={64} 
                    icon={<FolderOpenOutlined />} 
                    className="bg-blue-500 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <Title level={4} className="m-0 truncate">
                        {project.name}
                      </Title>
                      {getStatusTag(project)}
                    </div>
                    
                    <div className="space-y-3">
                      <Text type="secondary" className="text-sm block">
                        {project.description || 'No description'}
                      </Text>
                      
                      <div className="flex items-center flex-wrap gap-6">
                        <Space>
                          <FileOutlined />
                          <Text strong>{project.fileCount}</Text>
                          <Text type="secondary">Files</Text>
                        </Space>
                        
                        <Space>
                          <CheckCircleOutlined className="text-green-500" />
                          <Text strong className="text-green-600">{project.completedCount}</Text>
                          <Text type="secondary">Completed</Text>
                        </Space>
                        
                        {project.totalVisualizations > 0 && (
                          <Space>
                            <EyeOutlined className="text-blue-500" />
                            <Text strong className="text-blue-600">{project.totalVisualizations}</Text>
                            <Text type="secondary">Visualizations</Text>
                          </Space>
                        )}
                        
                        {project.processingCount > 0 && (
                          <Tag color="processing" icon={<ClockCircleOutlined />}>
                            {project.processingCount} processing
                          </Tag>
                        )}
                      </div>
                      
                      <Text type="secondary" className="text-xs block">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  <Button 
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleProjectClick(project.project_id)}
                  >
                    Open
                  </Button>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={() => handleAddData(project.project_id)}
                  >
                    Add Data
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter a project name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please enter a description' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Describe your project"
            />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button 
              onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createLoading}
            >
              Create Project
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDashboard;