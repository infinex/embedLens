import React, { useState, useEffect } from 'react';
import { 
  PlusOutlined, 
  FolderOutlined, 
  FileTextOutlined, 
  LinkOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Modal, 
  Input, 
  Card, 
  List, 
  Typography, 
  Space, 
  Tag, 
  Alert, 
  Spin, 
  Empty,
  Tooltip,
  message
} from 'antd';
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_BASE = 'http://localhost:8000';
const VISUALIZATION_BASE = 'http://localhost:5173';

const ProjectDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [embeddingJobs, setEmbeddingJobs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  // Default headers for API calls
  const defaultHeaders = {
    'Authorization': 'Bearer asdasd',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch embedding jobs when a project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchEmbeddingJobs(selectedProject.project_id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/`, {
        headers: defaultHeaders
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

  const fetchEmbeddingJobs = async (projectId) => {
    try {
      setJobsLoading(true);
      const response = await fetch(`/api/embeddings/projects/${projectId}/jobs`, {
        headers: defaultHeaders
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEmbeddingJobs(data);
    } catch (err) {
      message.error(`Error fetching embedding jobs: ${err.message}`);
    } finally {
      setJobsLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      message.warning('Please enter a project name');
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(newProject)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProjects(prev => [...prev, data]);
      setSelectedProject(data);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
      message.success('Project created successfully');
    } catch (err) {
      message.error(`Error creating project: ${err.message}`);
    }
  };

  const deleteProject = async (projectId) => {
    Modal.confirm({
      title: 'Delete Project',
      content: 'Are you sure you want to delete this project?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: defaultHeaders
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          setProjects(prev => prev.filter(p => p.project_id !== projectId));
          if (selectedProject?.project_id === projectId) {
            setSelectedProject(projects.length > 1 ? projects[0] : null);
          }
          message.success('Project deleted successfully');
        } catch (err) {
          message.error(`Error deleting project: ${err.message}`);
        }
      }
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'progress_unavailable (unknown)':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'progress_unavailable (unknown)':
        return 'warning';
      default:
        return 'processing';
    }
  };

  // Group embedding jobs by file_id
  const groupedJobs = embeddingJobs.reduce((acc, job) => {
    if (!acc[job.file_id]) {
      acc[job.file_id] = [];
    }
    acc[job.file_id].push(job);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <Title level={3} className="!mb-0">Projects</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              title="Create New Project"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && projects.length === 0 ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-4">
                <Text type="secondary">Loading projects...</Text>
              </div>
            </div>
          ) : (
            <>
              {projects.length === 0 ? (
                <Empty
                  image={<FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description={
                    <div>
                      <Text type="secondary">No projects yet</Text>
                      <br />
                      <Text type="secondary" className="text-sm">
                        Create your first project to get started
                      </Text>
                    </div>
                  }
                />
              ) : (
                <List
                  dataSource={projects}
                  renderItem={(project) => (
                    <List.Item className="!px-0">
                      <Card
                        hoverable
                        className={`w-full cursor-pointer transition-all ${
                          selectedProject?.project_id === project.project_id
                            ? 'border-blue-500 shadow-md'
                            : ''
                        }`}
                        onClick={() => setSelectedProject(project)}
                        actions={[
                          <Tooltip title="Delete Project">
                            <Button
                              type="text"
                              icon={<DeleteOutlined />}
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.project_id);
                              }}
                            />
                          </Tooltip>
                        ]}
                      >
                        <Card.Meta
                          avatar={<FolderOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                          title={<Text strong>{project.name}</Text>}
                          description={
                            <div>
                              <Paragraph 
                                ellipsis={{ rows: 2 }} 
                                className="!mb-2"
                                type="secondary"
                              >
                                {project.description}
                              </Paragraph>
                              <Text type="secondary" className="text-xs">
                                Created: {new Date(project.created_at).toLocaleDateString()}
                              </Text>
                            </div>
                          }
                        />
                      </Card>
                    </List.Item>
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedProject ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Title level={2} className="!mb-1">{selectedProject.name}</Title>
                  <Text type="secondary">{selectedProject.description}</Text>
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchEmbeddingJobs(selectedProject.project_id)}
                  title="Refresh"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <Title level={3} className="mb-4">Embedding Jobs & Files</Title>
                
                {jobsLoading ? (
                  <div className="text-center py-12">
                    <Spin size="large" />
                    <div className="mt-4">
                      <Text type="secondary">Loading embedding jobs...</Text>
                    </div>
                  </div>
                ) : Object.keys(groupedJobs).length === 0 ? (
                  <Card>
                    <Empty
                      image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                      description={
                        <div>
                          <Text type="secondary">No files processed yet</Text>
                          <br />
                          <Text type="secondary" className="text-sm">
                            Upload files to this project to see embedding jobs
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedJobs).map(([fileId, jobs]) => {
                      const completedJobs = jobs.filter(job => job.status === 'complete');
                      
                      return (
                        <Card key={fileId}>
                          <div className="flex items-center justify-between mb-4">
                            <Space>
                              <FileTextOutlined style={{ fontSize: 20, color: '#666' }} />
                              <div>
                                <Text strong>File ID: {fileId}</Text>
                                <br />
                                <Text type="secondary" className="text-sm">
                                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} total
                                </Text>
                              </div>
                            </Space>
                            
                            {completedJobs.length > 0 && (
                              <Button
                                type="primary"
                                icon={<LinkOutlined />}
                                href={`${VISUALIZATION_BASE}/embeddings/${fileId}`}
                                target="_blank"
                              >
                                View Visualization
                              </Button>
                            )}
                          </div>
                          
                          <List
                            dataSource={jobs.slice(0, 3)}
                            renderItem={(job) => (
                              <List.Item>
                                <div className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg">
                                  <Space>
                                    {getStatusIcon(job.status)}
                                    <div>
                                      <Space>
                                        <Text strong className="text-sm">
                                          Job: {job.job_id.slice(0, 8)}...
                                        </Text>
                                        <Tag color={getStatusColor(job.status)}>
                                          {job.status}
                                        </Tag>
                                      </Space>
                                      {job.model_name && (
                                        <div>
                                          <Text type="secondary" className="text-xs">
                                            Model: {job.model_name}
                                          </Text>
                                        </div>
                                      )}
                                      {job.error && (
                                        <div>
                                          <Text type="danger" className="text-xs">
                                            Error: {job.error.error}
                                          </Text>
                                        </div>
                                      )}
                                    </div>
                                  </Space>
                                  
                                  {job.progress !== null && (
                                    <Text type="secondary" className="text-sm">
                                      {job.progress}%
                                    </Text>
                                  )}
                                </div>
                              </List.Item>
                            )}
                          />
                          
                          {jobs.length > 3 && (
                            <div className="text-center py-2">
                              <Text type="secondary" className="text-sm">
                                + {jobs.length - 3} more job{jobs.length - 3 !== 1 ? 's' : ''}
                              </Text>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty
              image={<FolderOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
              description={
                <div>
                  <Title level={4} type="secondary">No Project Selected</Title>
                  <Text type="secondary">Select a project from the sidebar to view its details</Text>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={showCreateModal}
        onOk={createProject}
        onCancel={() => {
          setShowCreateModal(false);
          setNewProject({ name: '', description: '' });
        }}
        okText="Create Project"
        cancelText="Cancel"
        okButtonProps={{
          disabled: !newProject.name.trim()
        }}
      >
        <div className="space-y-4">
          <div>
            <Text strong>Project Name *</Text>
            <Input
              value={newProject.name}
              onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Text strong>Description</Text>
            <TextArea
              value={newProject.description}
              onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter project description"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDashboard;