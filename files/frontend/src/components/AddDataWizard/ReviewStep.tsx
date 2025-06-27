import React from 'react';
import { Button, Typography, Descriptions, Tag } from 'antd';
import { StepProps, UploadedFile, EmbeddingSelection } from './types';

const { Title, Text, Paragraph } = Typography;

interface ReviewStepProps extends StepProps {
  uploadedFile: UploadedFile | null;
  embeddingSelection: EmbeddingSelection;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ onNext, onBack, uploadedFile, embeddingSelection }) => {
  return (
    <div className="p-6">
      <Title level={3} className="mb-4">Review Selections</Title>
      <Paragraph className="mb-6">
        Please review your file and embedding choices before starting the process.
      </Paragraph>
      
      <Descriptions bordered column={1} className="mb-6">
        <Descriptions.Item label="File Selected">
          <Text>{uploadedFile ? uploadedFile.file.name : 'N/A'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Selected Text Column for Embedding">
          {embeddingSelection.selectedColumn ? 
            <Tag color="blue">{embeddingSelection.selectedColumn}</Tag> : 
            <Text type="danger">Not selected</Text>
          }
        </Descriptions.Item>
        <Descriptions.Item label="Selected Embedding Model">
          {embeddingSelection.modelName ? 
            <Tag color="geekblue">{embeddingSelection.modelName}</Tag> : 
            <Text type="danger">Not selected</Text>
          }
        </Descriptions.Item>
      </Descriptions>

      <div className="flex justify-end space-x-4">
        <Button onClick={onBack}>Back</Button>
        <Button 
          type="primary" 
          onClick={() => onNext()} // onNext in AddDataWizard now handles the API call
          disabled={!uploadedFile || !embeddingSelection.selectedColumn}
        >
          Process Data
        </Button>
      </div>
    </div>
  );
};

export default ReviewStep; 