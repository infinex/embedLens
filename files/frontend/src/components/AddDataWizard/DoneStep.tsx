import React from 'react';
import { Button, Result, Typography, Tag } from 'antd';
import { StepProps } from './types';
import { Link } from 'react-router-dom';

const { Paragraph, Text } = Typography;
interface DoneStepProps extends Omit<StepProps, 'onNext'> {
  onFinish: () => void;
  jobId: string | null;
}

const DoneStep: React.FC<DoneStepProps> = ({ onBack, onFinish, jobId }) => {
  return (
    <div className="p-6 flex flex-col items-center">
      <Result
        status="success"
        title="File Uploaded & Processing Started"
        subTitle={
          jobId ? 
          <Text>File processing and embedding generation have started. Your Job ID is: <Tag color='purple'>{jobId}</Tag></Text> : 
          <Text>File processing has started. Embedding job ID will be available shortly if applicable.</Text>
        }
        extra={[
          <Button type="primary" key="finish" onClick={onFinish}>
            Finish
          </Button>,
          onBack ? <Button key="back" onClick={onBack}>Review Selections</Button> : null,
        ].filter(Boolean) // Filter out null if onBack is not provided
      }
      />

      {jobId && (
        <Paragraph className="mt-4">
          You can monitor the job progress <Link to={`/job/${jobId}/progress`}>here</Link>.
        </Paragraph>
      )}

      {!jobId && (
        <Paragraph className="mt-4">
          You can monitor the job progress in the project's job list.
        </Paragraph>
      )}
    </div>
  );
};

export default DoneStep; 