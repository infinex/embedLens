import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { Layout } from 'antd';
import EmbeddingVisualization from './components/EmbeddingVisualization';
// import VietnamMap from './components/VietnamMap';
import { AddDataWizard } from './components/AddDataWizard';
import './App.css';
import JobProgressTracker from './components/JobProgressTracker';
import ProjectDashboard from './components/main';

const { Content } = Layout;

// Wrapper component to pass jobId from URL params to JobProgressTracker
const JobProgressTrackerWrapper: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  // Ensure jobId is not undefined before passing, though route definition implies it will exist
  return <JobProgressTracker jobId={jobId || ''} />;
};

const App: React.FC = () => {
  return (
    <Layout>
      <Content style={{ padding: '24px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/embeddings/:embeddingId" element={<EmbeddingVisualization />} />
          <Route path="/add-data" element={<AddDataWizard projectId={1} onClose={() => console.log("Wizard closed")} />} />
           <Route
            path="/job/:jobId/progress"
            element={<JobProgressTrackerWrapper />}
          />
        </Routes>
        <ProjectDashboard />
      </Content>
    </Layout>
  );
};

export default App;
