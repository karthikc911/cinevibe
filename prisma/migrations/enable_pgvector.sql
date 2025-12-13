-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index for similarity search (will be applied after table creation)
-- This uses HNSW (Hierarchical Navigable Small World) algorithm for fast approximate nearest neighbor search
-- The index will be created on the UserPreference.embedding column

-- Note: Run this after your initial migration creates the UserPreference table
-- CREATE INDEX IF NOT EXISTS user_preference_embedding_idx 
-- ON "UserPreference" USING hnsw (embedding vector_cosine_ops);

-- Alternative: IVFFlat index (faster build, but slower queries)
-- CREATE INDEX IF NOT EXISTS user_preference_embedding_idx 
-- ON "UserPreference" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

