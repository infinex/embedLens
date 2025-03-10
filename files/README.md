# Embedding Visualization Application

A web application for visualizing high-dimensional embeddings using React and FastAPI.

## Features

- File upload (CSV, Parquet) and processing
- Text embedding generation using OpenAI or HuggingFace models
- Interactive 2D and 3D visualizations using Deep Scatter
- Multiple visualization methods (UMAP, PCA)
- Clustering and filtering capabilities
- Export functionality (CSV, JSON)
- Progress tracking for long-running operations

## Setup

### Prerequisites

- Python 3.9+
- Node.js 14+
- Docker and Docker Compose
- PostgreSQL 15 with pgvector extension
- Redis

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd embedding-visualizer