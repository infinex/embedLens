import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import EmbeddingVisualization from './components/EmbeddingVisualization';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout>
      <Content style={{ padding: '24px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/embeddings/:embeddingId" element={<EmbeddingVisualization />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default App;
