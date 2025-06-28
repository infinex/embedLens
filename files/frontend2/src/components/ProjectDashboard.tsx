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
  Space,
  Tag,
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

// Extend Project interface with UI-specific statistics
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

  /**
   * Fetches the list of projects and their associated statistics (file count, processing status, visualizations).
   */
  const fetchProjects = async () => {
    setLoading(true);
    const result = await api.getProjects();

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Fetch file statistics for each project concurrently
    const projectsWithStats = await Promise.all(
      (result.data || []).map(async (project) => {
        const filesResult = await api.getProjectFiles(project.project_id);
        let fileCount = 0;
        let processingCount = 0;
        let completedCount = 0;
        let totalVisualizations = 0;

        if (!filesResult.error && filesResult.data) {
          fileCount = filesResult.data.length;

          // Check processing status for each file concurrently
          const fileStatuses = await Promise.all(
            filesResult.data.map(file => api.checkFileProcessingStatus(file.file_id))
          );

          for (const status of fileStatuses) {
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

  // Effect hook to fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  /**
   * Handles the creation of a new project.
   * @param values - The form values containing project name and description.
   */
  const handleCreateProject = async (values: { name: string; description: string }) => {
    setCreateLoading(true);
    const result = await api.createProject(values);

    if (result.error) {
      setError(result.error);
    } else {
      setCreateModalVisible(false);
      form.resetFields();
      fetchProjects(); // Refresh the list to show the new project
    }

    setCreateLoading(false);
  };

  /**
   * Navigates to the project details page.
   * @param projectId - The ID of the project to open.
   */
  const handleProjectClick = (projectId: number) => {
    navigate(`/project/${projectId}`);
  };

  /**
   * Navigates to the add data page for a specific project.
   * @param projectId - The ID of the project to add data to.
   */
  const handleAddData = (projectId: number) => {
    navigate(`/add-data/${projectId}`);
  };

  /**
   * Determines the status tag for a project based on its file processing statistics.
   * @param project - The project with its statistics.
   * @returns A React Tag component representing the project status.
   */
  const getStatusTag = (project: ProjectWithStats) => {
    if (project.processingCount > 0) {
      return <Tag color="processing" icon={<ClockCircleOutlined />}>Processing</Tag>;
    }
    if (project.completedCount > 0) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Ready</Tag>;
    }
    return <Tag color="default">Empty</Tag>;
  };

  // Display loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <Title level={2} className="m-0 text-gray-800">Projects</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="w-full sm:w-auto rounded-md shadow-sm"
              size="large" // Make button larger
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
              className="mb-4 rounded-lg"
            />
          )}

          <Text type="secondary" className="text-gray-600 text-base">
            Manage your data projects and visualizations
          </Text>
        </div>

        {/* Conditional rendering for empty state or project list */}
        {projects.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No projects yet"
            className="mt-10 p-6 bg-white rounded-lg shadow-md"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="mt-4 rounded-md shadow-sm"
              size="large" // Make button larger
            >
              Create Your First Project
            </Button>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.project_id}
                className="hover:bg-blue-50 transition-colors duration-200 rounded-lg p-5 border border-gray-200 bg-white shadow-md flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar
                      size={64}
                      icon={<FolderOpenOutlined />}
                      className="bg-blue-600 text-white flex-shrink-0 shadow-sm"
                      style={{ borderRadius: '12px' }} // Slightly more rounded than default Ant Design
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                        <Title level={4} className="m-0 truncate text-gray-900 leading-tight">
                          {project.name}
                        </Title>
                        <div className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                          {getStatusTag(project)}
                        </div>
                      </div>

                      <div className="space-y-3 mt-2">
                        <Text type="secondary" className="text-sm block text-gray-700">
                          {project.description || 'No description provided for this project.'}
                        </Text>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-gray-100 mt-3">
                          <Space className="items-center text-gray-700">
                            <FileOutlined className="text-gray-500" />
                            <Text strong className="text-gray-900">{project.fileCount}</Text>
                            <Text type="secondary">Files</Text>
                          </Space>

                          <Space className="items-center text-green-700">
                            <CheckCircleOutlined className="text-green-500" />
                            <Text strong className="text-green-600">{project.completedCount}</Text>
                            <Text type="secondary">Completed</Text>
                          </Space>

                          {project.totalVisualizations > 0 && (
                            <Space className="items-center text-blue-700">
                              <EyeOutlined className="text-blue-500" />
                              <Text strong className="text-blue-600">{project.totalVisualizations}</Text>
                              <Text type="secondary">Visualizations</Text>
                            </Space>
                          )}

                          {project.processingCount > 0 && (
                            <Tag color="processing" icon={<ClockCircleOutlined />} className="text-sm">
                              {project.processingCount} processing
                            </Tag>
                          )}
                        </div>

                        <Text type="secondary" className="text-xs block text-gray-500 mt-2">
                          Created: {new Date(project.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Action buttons at the bottom of the card */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4 pt-4 border-t border-gray-100">
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleProjectClick(project.project_id)}
                    className="flex-1 rounded-md shadow-sm"
                    size="large"
                  >
                    Open
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => handleAddData(project.project_id)}
                    className="flex-1 rounded-md shadow-sm"
                    size="large"
                  >
                    Add Data
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        <Modal
          title={<Title level={3} className="m-0">Create New Project</Title>}
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          destroyOnClose
          centered
          className="rounded-lg shadow-xl"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateProject}
            className="mt-4"
          >
            <Form.Item
              name="name"
              label={<Text strong>Project Name</Text>}
              rules={[
                { required: true, message: 'Please enter a project name' },
                { min: 2, message: 'Name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g., Q2 Financial Report" className="rounded-md" />
            </Form.Item>

            <Form.Item
              name="description"
              label={<Text strong>Description</Text>}
              rules={[
                { required: true, message: 'Please enter a description' }
              ]}
            >
              <TextArea
                rows={4}
                placeholder="Briefly describe the purpose of this project and the data it will contain."
                className="rounded-md"
              />
            </Form.Item>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                }}
                className="rounded-md"
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createLoading}
                className="rounded-md shadow-md"
                size="large"
              >
                Create Project
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default ProjectDashboard;