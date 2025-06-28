import React, { useState } from 'react';
import { Steps, Card, Typography, message, Spin } from 'antd';
import SelectSourceStep from './SelectSourceStep';
import PreviewFieldsStep from './PreviewFieldsStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';
import { UploadedFile, FileColumnInfo, EmbeddingSelection } from './types';
// Assuming you have an API client setup

const { Step } = Steps;
const { Title } = Typography;

// Define Project Type if not already globally available
// interface Project {
//   project_id: number;
//   name: string;
//   // ... other project fields
// }

// Props for the Wizard, e.g., the project it's associated with
interface AddDataWizardProps {
  projectId: number; // Assuming the wizard is for a specific project
  onClose: () => void; // Function to close the wizard
}

// Define the expected structure of the backend file response after upload
interface BackendFileResponse {
  file_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  project_id: number;
  columns: FileColumnInfo; // This is key for PreviewFieldsStep
  created_at: string;
  row_count: number;
}

const AddDataWizard: React.FC<AddDataWizardProps> = ({ projectId, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [fileId, setFileId] = useState<number | null>(null);
  const [fileColumnInfo, setFileColumnInfo] = useState<FileColumnInfo | null>(null);
  const [embeddingSelection, setEmbeddingSelection] = useState<EmbeddingSelection>({
    selectedColumn: '', // Initialize with empty or a sensible default if possible
    modelName: 'openai-text-embedding-ada-002', // Default model
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');

  // Define API functions (these would typically be in a service file)
  const uploadFileApi = async (file: File, projId: number): Promise<BackendFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    setLoadingMessage('Uploading file...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/files/upload/${projId}`, { // Assuming /api is your base path
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` }, // Fetch sets Content-Type automatically for FormData
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText })); // Try to parse JSON, fallback to statusText
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const triggerEmbeddingApi = async (fileIdVal: number, column: string, modelName: string): Promise<{ job_id: string }> => {
    setLoadingMessage('Starting embedding process...');
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/embeddings/${fileIdVal}/generate?column=${encodeURIComponent(column)}&model_name=${encodeURIComponent(modelName)}`, { // Assuming /api is your base path
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Explicitly set Content-Type for JSON payload if any (not needed for GET usually but good for POST)
        Authorization: `Bearer ${token}`,
      },
      // body: JSON.stringify({}), // If you were sending a JSON body
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const handleFileSelectedAndUpload = async () => {
    if (!uploadedFile) {
      message.error('No file selected.');
      return;
    }
    setIsLoading(true);
    try {
      const backendFileResponse = await uploadFileApi(uploadedFile.file, projectId);
      setFileId(backendFileResponse.file_id);
      setFileColumnInfo(backendFileResponse.columns);
      message.success(`${uploadedFile.file.name} uploaded successfully. File ID: ${backendFileResponse.file_id}`);
      // Automatically select the first text column if available
      if (backendFileResponse.columns?.text_columns?.length > 0) {
        setEmbeddingSelection(prev => ({ ...prev, selectedColumn: backendFileResponse.columns.text_columns[0] }));
      }
      setCurrentStep(currentStep + 1); // Move to PreviewFieldsStep
    } catch (err: any) {
      console.error('Error during file upload step:', err);
      message.error(`File upload failed: ${err.message}`); // err.response?.data?.detail removed as fetch doesn't have response.data
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePreviewAndFieldsNext = (selection: EmbeddingSelection) => {
    setEmbeddingSelection(selection);
    setCurrentStep(currentStep + 1); // Move to ReviewStep
  };

  const handleReviewAndTriggerEmbedding = async () => {
    if (!fileId || !embeddingSelection.selectedColumn) {
      message.error('File ID or embedding column not set.');
      return;
    }
    setIsLoading(true);
    try {
      // Explicitly type the response from triggerEmbeddingApi if it's not inferred correctly
      const embeddingResponse: { job_id: string } = await triggerEmbeddingApi(fileId, embeddingSelection.selectedColumn, embeddingSelection.modelName);
      setJobId(embeddingResponse.job_id);
      message.success(`Embedding process started with Job ID: ${embeddingResponse.job_id}`);
      setCurrentStep(currentStep + 1); // Move to DoneStep
    } catch (err: any) {
      console.error('Error triggering embedding:', err);
      message.error(`Embedding trigger failed: ${err.message}`); // err.response?.data?.detail removed
    } finally {
      setIsLoading(false);
    }
  };

  const back = () => setCurrentStep(currentStep - 1);

  const steps = [
    {
      title: 'Select Source',
      content: <SelectSourceStep 
                  onNext={handleFileSelectedAndUpload} 
                  setUploadedFile={setUploadedFile} 
                />,
    },
    {
      title: 'Preview and select Fields',
      content: <PreviewFieldsStep 
                  onNext={(data) => handlePreviewAndFieldsNext(data as EmbeddingSelection)} 
                  onBack={back} 
                  fileColumnInfo={fileColumnInfo} 
                  currentSelection={embeddingSelection}
                  setSelection={setEmbeddingSelection} // Allow PreviewStep to directly update for more complex interactions
                />,
    },
    {
      title: 'Review',
      content: <ReviewStep 
                  onNext={handleReviewAndTriggerEmbedding} 
                  onBack={back} 
                  uploadedFile={uploadedFile} 
                  embeddingSelection={embeddingSelection} 
                />,
    },
    {
      title: 'Done',
      content: <DoneStep onBack={back} onFinish={onClose} jobId={jobId}/>,
    },
  ];

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <Title level={2} className="text-center mb-6">Add Data</Title>
      <Steps current={currentStep} className="mb-8">
        {steps.map(item => (
          <Step key={item.title} title={item.title} />
        ))}
      </Steps>
      {isLoading ? (
        <div className="p-10 text-center">
          <Spin size="large" tip={loadingMessage} />
        </div>
      ) : (
        <div>{steps[currentStep].content}</div>
      )}
    </Card>
  );
};

export default AddDataWizard; 