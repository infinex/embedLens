import React, { useEffect } from 'react';
import { Button, Typography, Select, Form, Radio, Space, Tooltip } from 'antd';
import { StepProps, FileColumnInfo, EmbeddingSelection } from './types';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface PreviewFieldsStepProps extends StepProps {
  fileColumnInfo: FileColumnInfo | null;
  currentSelection: EmbeddingSelection;
  setSelection: React.Dispatch<React.SetStateAction<EmbeddingSelection>>;
  // onNext will be called with the EmbeddingSelection
}

const availableModels = [
  { id: 'openai-text-embedding-ada-002', name: 'OpenAI Ada v2 (1536 dim)' },
  // Add other models as needed, e.g.:
  // { id: 'cohere-embed-english-v2.0', name: 'Cohere English v2 (4096 dim)' },
  // { id: 'voyage-lite-01', name: 'Voyage Lite (1024 dim)' },
];

const PreviewFieldsStep: React.FC<PreviewFieldsStepProps> = ({ 
  onNext,
  onBack,
  fileColumnInfo,
  currentSelection,
  setSelection 
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    // Set initial form values when currentSelection or fileColumnInfo changes
    if (fileColumnInfo) {
      form.setFieldsValue({
        selectedColumn: currentSelection.selectedColumn || (fileColumnInfo.text_columns.length > 0 ? fileColumnInfo.text_columns[0] : undefined),
        modelName: currentSelection.modelName || availableModels[0].id,
      });
      // Update parent state if initial selection was made based on text_columns
      if (!currentSelection.selectedColumn && fileColumnInfo.text_columns.length > 0) {
        setSelection(prev => ({ 
          ...prev, 
          selectedColumn: fileColumnInfo.text_columns[0],
          modelName: prev.modelName || availableModels[0].id
        }));
      }
    }
  }, [fileColumnInfo, currentSelection.selectedColumn, currentSelection.modelName, form, setSelection]);

  const handleValuesChange = (_: any, allValues: EmbeddingSelection) => {
    setSelection(allValues);
  };

  const handleNext = () => {
    form.validateFields().then(values => {
      onNext(values); // Pass the validated form values (EmbeddingSelection)
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  if (!fileColumnInfo) {
    return (
      <div className="p-6">
        <Title level={3} className="mb-4">Preview and select Fields</Title>
        <Paragraph>File information is not available yet. Please ensure a file has been uploaded.</Paragraph>
        <div className="flex justify-end space-x-4 mt-6">
          <Button onClick={onBack}>Back</Button>
          <Button type="primary" disabled>
            Review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title level={3} className="mb-4">Preview and select Fields</Title>
      <Paragraph className="mb-6">
        Select the column containing the text data you want to embed and choose an embedding model.
      </Paragraph>
      
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          selectedColumn: currentSelection.selectedColumn,
          modelName: currentSelection.modelName,
        }}
      >
        <Form.Item
          name="selectedColumn"
          label="Select Text Column for Embedding"
          rules={[{ required: true, message: 'Please select a column for embedding' }]}
          tooltip={{ title: 'Choose the column from your file that contains the primary text content to be embedded.', icon: <InfoCircleOutlined /> }}
        >
          <Select placeholder="Select a column">
            {fileColumnInfo.text_columns.map(colName => (
              <Option key={colName} value={colName}>{colName} (Type: {fileColumnInfo.types[colName]})</Option>
            ))}
            {fileColumnInfo.numeric_columns.filter(nc => !fileColumnInfo.text_columns.includes(nc)).map(colName => (
                 <Option key={colName} value={colName} disabled>{colName} (Type: {fileColumnInfo.types[colName]} - Not text)</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="modelName"
          label="Select Embedding Model"
          rules={[{ required: true, message: 'Please select an embedding model' }]}
          tooltip="Different models have varying performance, dimensionality, and cost."
        >
          <Radio.Group>
            <Space direction="vertical">
              {availableModels.map(model => (
                <Radio key={model.id} value={model.id}>{model.name}</Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* Placeholder for Data Preview Table if needed */}
        {/* <div className="bg-gray-100 p-4 rounded mb-6">
          <Text className="italic">Data Preview Table (Optional) - Showing sample from '{currentSelection.selectedColumn || "[Not Selected]"}'</Text>
        </div> */}

      </Form>

      <div className="flex justify-end space-x-4 mt-8">
        <Button onClick={onBack}>Back</Button>
        <Button type="primary" onClick={handleNext}>
          Review
        </Button>
      </div>
    </div>
  );
};

export default PreviewFieldsStep; 