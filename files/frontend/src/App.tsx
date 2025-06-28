import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import EmbeddingVisualization from './components/EmbeddingVisualization';
import { AddDataWizard } from './components/AddDataWizard';
import './App.css';
import JobProgressTracker from './components/JobProgressTracker';
import ProjectDashboard from './components/ProjectDashboard';
import FileManager from './components/FileManager';
import ProcessingStatusHandler from './components/ProcessingStatusHandler';
import NavigationBreadcrumb from './components/NavigationBreadcrumb';
import VietnamScatterplot from './components/VietnamScatterplot';

const { Content } = Layout;

// Wrapper component to pass jobId from URL params to JobProgressTracker
const JobProgressTrackerWrapper: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  return <JobProgressTracker jobId={jobId || ''} />;
};

// Wrapper component for AddDataWizard with navigation
const AddDataWizardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const handleClose = () => {
    navigate('/');
  };

  // If no projectId in URL, get from localStorage or default to 1
  const selectedProjectId = projectId ? parseInt(projectId) : 
    parseInt(localStorage.getItem('selectedProjectId') || '1');

  return <AddDataWizard projectId={selectedProjectId} onClose={handleClose} />;
};




function App() {

  return (
    <div className="App">
    <Layout>
      <NavigationBreadcrumb />
      <Content style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<ProjectDashboard />} />
          <Route path="/project/:projectId" element={<FileManager />} />
          <Route path="/vietnam" element={<VietnamScatterplot />} />
          <Route path="/embeddings/:embeddingId" element={<EmbeddingVisualization />} />
          <Route path="/add-data" element={<AddDataWizardWrapper />} />
          <Route path="/add-data/:projectId" element={<AddDataWizardWrapper />} />
          <Route path="/job/:jobId/progress" element={<JobProgressTrackerWrapper />} />
          <Route path="/file/:fileId/status" element={<ProcessingStatusHandler />} />
        </Routes>
      </Content>
    </Layout>
    </div>
  );
}


export default App;
