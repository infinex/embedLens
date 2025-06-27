# EmbedLens Frontend Documentation

## Project Overview
EmbedLens is a React-based frontend application for visualizing and managing embeddings. It provides an interactive interface for uploading data, generating embeddings, and creating visualizations using various dimensionality reduction techniques.

## Technology Stack
- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **UI Library**: Ant Design 5.25.0
- **Routing**: React Router DOM 6.4.0
- **Visualization**: DeepScatter (custom package)
- **HTTP Client**: Axios 1.0.0
- **Data Processing**: Apache Arrow
- **Styling**: Tailwind CSS 4.1.3

## Project Structure
```
src/
├── api/                    # API client configurations
├── components/             # React components
│   ├── AddDataWizard/     # Multi-step data upload wizard
│   ├── __tests__/         # Component tests
│   └── *.tsx              # Individual components
├── assets/                # Static assets
├── lib/                   # Utility libraries
└── *.tsx                  # Main app files
```

## Key Components

### App.tsx
Main application component with routing configuration:
- `/embeddings/:embeddingId` - Embedding visualization page
- `/add-data` - Data upload wizard
- `/job/:jobId/progress` - Job progress tracking

### EmbeddingVisualization
Main visualization component featuring:
- Interactive 2D/3D scatter plots using DeepScatter
- UMAP and PCA dimensionality reduction options
- Cluster filtering and point selection
- Real-time job progress monitoring
- Data export (CSV/JSON)
- Responsive layout with controls sidebar

### AddDataWizard
Multi-step wizard for data upload:
1. **SelectSourceStep** - File selection and upload
2. **PreviewFieldsStep** - Column selection and preview
3. **ReviewStep** - Configuration review
4. **DoneStep** - Job completion and navigation

### JobProgressTracker
Real-time job monitoring with:
- Progress bar and status updates
- Error handling and display
- Polling mechanism for status updates

## API Integration

### Base Configuration
- Default API URL: `http://localhost:8000/api/v1`
- Authentication: Bearer token from localStorage
- Error handling with axios interceptors

### Key Endpoints
- `POST /files/upload/{projectId}` - File upload
- `POST /embeddings/{fileId}/generate` - Trigger embedding generation
- `GET /embeddings/{embeddingId}/progress` - Job progress
- `GET /visualizations/file/{embeddingId}` - Visualization data
- `GET /visualizations/{vizId}/export` - Data export

## Build Scripts
- `npm run dev` - Development server (host 0.0.0.0)
- `npm run build` - Production build (TypeScript + Vite)
- `npm run lint` - ESLint code checking
- `npm run preview` - Preview production build

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint with React hooks and refresh plugins
- Ant Design components for consistent UI
- Responsive design with flexbox layouts

### State Management
- React hooks for local state
- URL parameters for routing state
- localStorage for authentication tokens
- Polling for real-time updates

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages via Ant Design alerts
- Centralized API error handling

### Testing
- Jest and React Testing Library setup
- Test files in `__tests__/` directories
- Component and integration testing support

## Key Features
1. **Interactive Visualizations** - 2D/3D scatter plots with zoom/pan
2. **Data Upload** - CSV/file upload with column mapping
3. **Embedding Generation** - Support for multiple models (OpenAI, etc.)
4. **Progress Tracking** - Real-time job monitoring
5. **Data Export** - CSV/JSON export functionality
6. **Responsive Design** - Works on desktop and mobile
7. **Error Recovery** - Graceful error handling and user feedback