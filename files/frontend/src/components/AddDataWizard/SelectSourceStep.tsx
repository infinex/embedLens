import React, { useState } from 'react';
import { Upload, Button, Typography, message } from 'antd';
import { InboxOutlined, FileOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import { UploadedFile, StepProps } from './types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface SelectSourceStepProps extends StepProps {
  setUploadedFile: (file: UploadedFile | null) => void;
  // Assuming project_id is passed down or available in a context
  // projectId: number; 
}

const SelectSourceStep: React.FC<SelectSourceStepProps> = ({ onNext, setUploadedFile }) => {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const handleFileSelect = (file: File) => {
    const isLt500M = file.size / 1024 / 1024 < 500;
    if (!isLt500M) {
      message.error('File must be smaller than 500MB!');
      setSelectedFile(null);
      setUploadedFile(null);
      return false;
    }
    // Basic type check (can be more robust)
    const allowedTypes = ['.csv', '.parquet'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      message.error('Invalid file type. Only CSV and Parquet are allowed.');
      setSelectedFile(null);
      setUploadedFile(null);
      return false;
    }

    setSelectedFile({ file });
    setUploadedFile({ file });
    message.success(`${file.name} selected.`);
    return true;
  };

  const customRequest: UploadProps['customRequest'] = ({ file, onSuccess, onError }) => {
    // The file parameter here is of type 'RcFile' from antd, which extends File.
    // We cast it to File for our handler.
    const rcFile = file as File;
    if (handleFileSelect(rcFile)) {
      // Simulate a successful "upload" for the Dragger's UI
      // In a real scenario, this might involve an API call, but here we just pass it to the parent.
      setTimeout(() => {
        if (onSuccess) {
          onSuccess('ok'); // Must call onSuccess for Dragger to consider it done
        }
      }, 0);
    } else {
      if (onError) {
        onError(new Error('File validation failed'));
      }
    }
  };
  
  // onChange is still useful for reacting to changes, e.g., clearing the selection if a user removes a file
  // or if an error occurs during the (simulated) upload.
  const handleChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'removed') {
      setSelectedFile(null);
      setUploadedFile(null);
      message.info(`${info.file.name} deselected.`);
    }
    // if (info.file.status === 'error') {
    //   // Error might have been caught in customRequest, but can also handle here
    //   message.error(`${info.file.name} selection failed.`);
    // }
  };

  const draggerProps: UploadProps = {
    name: 'file',
    multiple: false,
    customRequest: customRequest, // Use customRequest to handle the file logic
    onChange: handleChange,      // Use onChange to react to file removal or errors
    showUploadList: false,       // We display the selected file manually
    accept: '.csv,.parquet',
    beforeUpload: (file) => {
      // beforeUpload can be used for synchronous validation.
      // Returning false prevents antd's default upload behavior.
      // We do the main selection logic in customRequest after this.
      return true; // Let it proceed to customRequest
    },
  };

  return (
    <div className="p-6">
      <Title level={3} className="mb-4">Select Source</Title>
      <Text className="mb-6 block">
        Choose a file to upload to the platform by Browse or dropping a file into the designated area.
      </Text>

      <Dragger {...draggerProps} className="mb-6">
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Drop your data file here or click to select</p>
        <p className="ant-upload-hint">
          The maximum file upload size is 500 Mb. Supported types: CSV, Parquet.
        </p>
      </Dragger>

      <div className="mb-6">
        {selectedFile ? (
          <div className="flex items-center p-3 border border-gray-300 rounded">
            <FileOutlined className="mr-2 text-lg" />
            <Text>Selected File: {selectedFile.file.name}</Text>
          </div>
        ) : (
          <Text>Selected File: No file selected</Text>
        )}
      </div>
      
      <div className="flex justify-end space-x-4">
        <Button disabled>Back</Button>
        <Button type="primary" onClick={onNext} disabled={!selectedFile}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default SelectSourceStep; 