const API_BASE_URL = 'http://localhost:8000/api';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface Project {
  name: string;
  description: string;
  project_id: number;
  user_id: number;
  created_at: string;
}

interface FileData {
  filename: string;
  file_type: string;
  file_id: number;
  original_filename: string;
  project_id: number;
  columns: {
    names: string[];
    types: Record<string, string>;
    sample_size: number;
    numeric_columns: string[];
    text_columns: string[];
  };
  created_at: string;
  row_count: number;
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

interface EmbeddingJob {
  job_id: string;
}

interface FileCheckResponse {
  file_id: number;
  file_name: string;
  original_filename: string;
  project_id: number;
  columns: {
    names: string[];
    types: Record<string, string>;
    sample_size: number;
    numeric_columns: string[];
    text_columns: string[];
  };
  created_at: string;
  row_count: number;
  has_visualizations: boolean;
  available_methods: string[];
  available_dimensions: number[];
  visualization_count: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token') || 'asdasd';
  return {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      headers: getAuthHeaders(),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { 
      data: null as T, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

export const api = {
  // Projects
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return apiRequest<Project[]>('/projects/');
  },

  async createProject(projectData: { name: string; description: string }): Promise<ApiResponse<Project>> {
    return apiRequest<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  // Files
  async getProjectFiles(projectId: number): Promise<ApiResponse<FileData[]>> {
    return apiRequest<FileData[]>(`/files/project/${projectId}`);
  },

  async uploadFile(projectId: number, file: File): Promise<ApiResponse<FileData>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('auth_token') || 'asdasd';
    const response = await fetch(`${API_BASE_URL}/files/upload/${projectId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return { 
        data: null as FileData, 
        error: `Upload failed: ${response.status}` 
      };
    }

    const data = await response.json();
    return { data };
  },

  // Embeddings
  async generateEmbeddings(
    fileId: number, 
    column: string, 
    modelName: string = 'openai-text-embedding-ada-002'
  ): Promise<ApiResponse<EmbeddingJob>> {
    return apiRequest<EmbeddingJob>(`/embeddings/${fileId}/generate?column=${column}&model_name=${modelName}`, {
      method: 'POST',
      body: '',
    });
  },

  async getEmbeddingProgress(embeddingId: number): Promise<ApiResponse<any>> {
    return apiRequest<any>(`/embeddings/${embeddingId}/progress`);
  },

  // Visualizations
  async getVisualization(
    fileId: number, 
    method: string = 'umap', 
    dimensions: number = 2
  ): Promise<ApiResponse<VisualizationData[]>> {
    return apiRequest<VisualizationData[]>(`/visualizations/file/${fileId}?method=${method}&dimensions=${dimensions}`);
  },

  async exportVisualization(vizId: number): Promise<ApiResponse<any>> {
    return apiRequest<any>(`/visualizations/${vizId}/export`);
  },

  async checkFileVisualization(fileId: number): Promise<ApiResponse<FileCheckResponse>> {
    return apiRequest<FileCheckResponse>(`/visualizations/file/${fileId}/check`);
  },

  // Status checking utility
  async checkFileProcessingStatus(fileId: number): Promise<{
    hasVisualization: boolean;
    hasEmbeddings: boolean;
    status: 'uploaded' | 'embeddings_ready' | 'visualization_ready' | 'processing' | 'error';
    error?: string;
    fileInfo?: FileCheckResponse;
  }> {
    // Use the new check endpoint
    const checkResult = await this.checkFileVisualization(fileId);
    if (checkResult.error) {
      return {
        hasVisualization: false,
        hasEmbeddings: false,
        status: 'error',
        error: checkResult.error
      };
    }

    const fileInfo = checkResult.data;
    return {
      hasVisualization: fileInfo.has_visualizations,
      hasEmbeddings: fileInfo.has_visualizations, // Assume if visualizations exist, embeddings exist
      status: fileInfo.has_visualizations ? 'visualization_ready' : 'uploaded',
      fileInfo
    };
  }
};

export type { Project, FileData, VisualizationData, EmbeddingJob, FileCheckResponse };