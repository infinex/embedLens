const BASE_URL = '/api'; // Replace with your actual API base URL if different

interface ApiError {
  detail: string;
}

const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const getProjectJobs = async (projectId: number): Promise<JobProgressDetails[]> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/embeddings/projects/${projectId}/jobs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.detail || `Failed to fetch jobs for project ${projectId}`);
  }
  return response.json();
};

export const getJobProgress = async (jobId: string): Promise<JobProgressDetails> => {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/embeddings/jobs/${jobId}/progress`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.detail || `Failed to fetch progress for job ${jobId}`);
  }
  return response.json();
};

// We need the JobProgressDetails type.
// For now, I'll define a placeholder based on the backend schema.
// Ideally, this would be shared or generated from the backend.
export interface JobProgressDetails {
  job_id: string;
  file_id: number;
  status: string; // e.g., "queued", "processing", "complete", "failed", "progress_unavailable (failed_in_queue)"
  progress?: number | null;
  current_step?: string | null; // e.g., "queued", "Creation", "Upload", "Map Ready", "failed in queue"
  error?: { [key: string]: any } | string | null; // Can be an object or a string message
  model_name?: string | null;
} 