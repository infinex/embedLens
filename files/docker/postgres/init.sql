-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Update the embeddings table to use vector type
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_vectors vector[];