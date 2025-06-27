import React, { useState, useEffect } from 'react';
import { Progress, Typography, Alert, Spin, Card, Button, Space } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EyeOutlined, LinkOutlined } from '@ant-design/icons';

const { Title, Text, Link } = Typography;

interface JobProgress {
  job_id: string;
  file_id: number;
  status: string;
  progress?: number;
  current_step?: string;
  error?: { error: string; details?: string };
  model_name?: string;
}

interface JobProgressTrackerProps {
  jobId: string;
  onJobCompletion?: (job: JobProgress) => void;
  onJobError?: (job: JobProgress) => void;
  autoRedirect?: boolean; // New prop to control auto-redirect behavior
  redirectDelay?: number; // Delay in seconds before auto-redirect (default: 3)
}

const JobProgressTracker: React.FC<JobProgressTrackerProps> = ({ 
  jobId, 
  onJobCompletion, 
  onJobError, 
  autoRedirect = true,
  redirectDelay = 3
}) => {
  const [progressData, setProgressData] = useState<JobProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/';

  // Handle redirect countdown
  useEffect(() => {
    if (redirectCountdown !== null && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0) {
      handleRedirectToVisualization();
    }
  }, [redirectCountdown]);

  const handleRedirectToVisualization = () => {
    if (progressData?.file_id) {
      navigate(`/embeddings/${progressData.file_id}`);
    }
  };

  const getVisualizationUrl = () => {
    if (progressData?.file_id) {
      return `http://localhost:5173/embeddings/${progressData.file_id}`;
    }
    return null;
  };

  useEffect(() => {
    if (!jobId) {
      setError("No Job ID provided.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchProgress = async () => {
      if (!isMounted) return;
      const token = localStorage.getItem('token');
      try {
        // Keep loading true only for initial fetch or if no data yet
        if (!progressData) setLoading(true);
        else setLoading(false); // don't show main spinner if updating existing data

        const response = await fetch(`${API_BASE_URL}/embeddings/jobs/${jobId}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return; // Check again after await

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data: JobProgress = await response.json();
        setProgressData(data);
        setError(null); // Clear previous errors on successful fetch

        if (data.status === 'complete' || data.status === 'completed') {
          if (onJobCompletion) onJobCompletion(data);
          
          // Start redirect countdown if auto-redirect is enabled and we have a file_id
          if (autoRedirect && data.file_id && redirectCountdown === null) {
            setRedirectCountdown(redirectDelay);
          }
          
          return 'stop'; // Signal to stop polling
        }
        if (data.status === 'failed' || data.status === 'failed_in_queue') {
          if (onJobError) onJobError(data);
          return 'stop'; // Signal to stop polling
        }

      } catch (e: any) {
        if (!isMounted) return;
        console.error("Failed to fetch job progress:", e);
        setError(e.message || "Failed to load job progress.");
        // Pass error to callback
        if (progressData && onJobError) { 
            onJobError({...progressData, status: 'fetch_error', error: { error: e.message || "Failed to load job progress."}});
        } else if (onJobError) {
            onJobError({ job_id: jobId, file_id: 0, status: "fetch_error", error: { error: e.message || "Failed to load job progress." } });
        }
      } finally {
        if (isMounted && !progressData) setLoading(false); // Ensure loading is false if initial load failed
        else if (isMounted) setLoading(false)
      }
      return 'continue'; // Signal to continue polling
    };

    fetchProgress(); // Initial fetch

    const intervalId = setInterval(async () => {
        const signal = await fetchProgress();
        if (signal === 'stop') {
            clearInterval(intervalId);
        }
    }, 5000); // Poll every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId); // Cleanup interval on component unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, API_BASE_URL, onJobCompletion, onJobError, autoRedirect, redirectDelay]); // Removed progressData from deps to avoid re-triggering interval setup

  if (!jobId) {
    return <Alert message="Error" description="No Job ID specified for tracking." type="error" showIcon />;
  }

  if (loading && !progressData) {
    return (
      <Card title={<Title level={4}>Job Progress: {jobId}</Title>} bordered={false}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <Text style={{ marginTop: '10px', display: 'block' }}>Loading job progress...</Text>
        </div>
      </Card>
    );
  }

  if (error && !progressData) { // Only show full page error if no data is available at all
    return <Alert message="Error Fetching Job Progress" description={error} type="error" showIcon />;
  }
  
  let displayStatus = progressData?.status || "Unknown";
  let displayProgressVal = progressData?.progress ?? 0;
  let displayStep = progressData?.current_step || "Initializing...";

  if (progressData?.status === 'failed' || progressData?.status === 'failed_in_queue') {
    displayStatus = "Failed";
    displayProgressVal = progressData?.progress ?? 100; // Show given progress or 100
  } else if (progressData?.status === 'complete' || progressData?.status === 'completed') {
    displayStatus = "Completed";
    displayProgressVal = 100;
    displayStep = progressData?.current_step === 'completed' || !progressData?.current_step ? "Job completed successfully!" : progressData.current_step;
  }

  const steps = ["Queued", "Processing", "Embedding", "Visualizing", "Ready"];
  let currentStepIndex = 0;
  if (progressData?.current_step) {
    const step = progressData.current_step.toLowerCase();
    if (step.includes("queued")) currentStepIndex = 0;
    else if (step.includes("processing") || step.includes("parsing") || step.includes("upload")) currentStepIndex = 1; // Added upload
    else if (step.includes("embedding") || step.includes("creation")) currentStepIndex = 2; // Added creation
    else if (step.includes("reducing") || step.includes("umap") || step.includes("cluster") || step.includes("visualization")) currentStepIndex = 3;
    else if (step.includes("complete") || step.includes("ready") || step.includes("finished") || step.includes("map ready")) currentStepIndex = 4;
  }
   if (progressData?.status === "completed" || progressData?.status === "complete") {
    currentStepIndex = steps.length -1;
   }

  const isJobCompleted = progressData?.status === 'complete' || progressData?.status === 'completed';
  const visualizationUrl = getVisualizationUrl();

  return (
    <Card title={<Title level={4}>Job Progress: {jobId}</Title>} bordered={false}>
      {error && progressData && ( 
         <Alert message="Update Issue" description={`There was an issue during the last progress update: ${error}. Displaying last known status.`} type="warning" showIcon style={{ marginBottom: 16 }} />
      )}
      
      {/* Show completion alert with redirect info */}
      {isJobCompleted && visualizationUrl && (
        <Alert
          message="Job Completed Successfully!"
          description={
            <div>
              <p>Your embedding visualization is ready to view.</p>
              {redirectCountdown !== null && autoRedirect && (
                <p style={{ marginBottom: 12 }}>
                  Redirecting to visualization in <strong>{redirectCountdown}</strong> seconds...
                </p>
              )}
              <Space>
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />}
                  onClick={handleRedirectToVisualization}
                >
                  View Visualization
                </Button>
                <Button 
                  icon={<LinkOutlined />}
                  onClick={() => window.open(visualizationUrl, '_blank')}
                >
                  Open in New Tab
                </Button>
                {redirectCountdown !== null && autoRedirect && (
                  <Button 
                    onClick={() => setRedirectCountdown(null)}
                    size="small"
                  >
                    Cancel Auto-redirect
                  </Button>
                )}
              </Space>
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Text strong style={{ marginRight: 8 }}>Status:</Text>
        <Text>{displayStatus}</Text>
        {loading && progressData && <Spin size="small" style={{marginLeft: '10px'}}/>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <Text strong>Current Step: </Text><Text>{displayStep}</Text>
      </div>
      
      <div style={{ marginBottom: 24 }}>
          <Text strong>Overall Progress {progressData?.status !== 'failed' && progressData?.status !== 'failed_in_queue' && progressData?.progress !== undefined ? `(${progressData.progress.toFixed(0)}%)` : ''}</Text>
          <Progress 
            percent={displayProgressVal}
            status={progressData?.status === 'failed' || progressData?.status === 'failed_in_queue' ? 'exception' : (progressData?.status === 'completed' || progressData?.status === 'complete' ? 'success' : 'active')}
            aria-label="Job progress percentage"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {steps.map((stepLabel, index) => (
                <Text 
                    key={stepLabel} 
                    type={index === currentStepIndex ? 'success' : (index < currentStepIndex ? 'secondary' : 'secondary')} 
                    strong={index === currentStepIndex}
                    style={{ flex: 1, textAlign: 'center', fontSize: '0.9em' }}
                >
                    {stepLabel}
                </Text>
            ))}
          </div>
      </div>

      {progressData?.model_name && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>Model: </Text><Text>{progressData.model_name}</Text>
        </div>
      )}

      {progressData?.error && (
        <Alert
          message="Job Error Encountered"
          description={
            <>
              <p><strong>Error Type:</strong> {progressData.error.error}</p>
              {progressData.error.details && <p><strong>Details:</strong> {progressData.error.details}</p>}
            </>
          }
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default JobProgressTracker;