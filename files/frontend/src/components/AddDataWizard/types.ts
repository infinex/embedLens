export interface UploadedFile {
  file: File;
  // Potentially add other metadata here if needed later, e.g., previewUrl
}

// Based on the `columns` field in `models.File` in your backend (files.py, schemas.py)
export interface FileColumnInfo {
  names: string[];
  types: { [column_name: string]: string }; // e.g. { "colA": "int64", "colB": "object" }
  sample_size: number;
  numeric_columns: string[];
  text_columns: string[]; 
}

export interface EmbeddingSelection {
  selectedColumn: string; // Can be null if no column is selected yet
  modelName: string;      // Default model can be set initially
}

// Define props for each step if they need to pass data or functions
export interface StepProps {
  onNext: (data?: any) => void; // Allow passing data forward (e.g. embedding selection)
  onBack?: () => void;
  // Add other shared props as they become necessary
  // For example, to pass data between steps via the main wizard:
  // wizardData: Partial<AddDataWizardState>;
  // updateWizardData: (update: Partial<AddDataWizardState>) => void;
} 