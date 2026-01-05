-- AI Development Engine Schema v1.0
-- Tracks autonomous agent loops and stores EARS requirements

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Track every autonomous "Loop" iteration
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  healing_iterations INTEGER DEFAULT 1,
  success_rate FLOAT DEFAULT 1.0, -- Calculated: 1 / iterations
  execution_time_ms INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by task
CREATE INDEX IF NOT EXISTS idx_agent_metrics_task_id ON agent_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_created_at ON agent_metrics(created_at DESC);

-- Store EARS (Easy Approach to Requirements Syntax) Requirements
-- Format: "While <state>, when <trigger>, the <system> shall <response>"
CREATE TABLE IF NOT EXISTS project_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  requirements JSONB NOT NULL DEFAULT '[]', -- EARS format requirements
  design_doc TEXT,
  task_list JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'implemented')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for project lookup
CREATE INDEX IF NOT EXISTS idx_project_specs_project_id ON project_specs(project_id);

-- Vector memory for architectural consistency
-- Stores embeddings of completed tasks for future reference
CREATE TABLE IF NOT EXISTS vector_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pgvector extension for similarity search (if available)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Index for vector similarity search (requires pgvector)
-- CREATE INDEX IF NOT EXISTS idx_vector_memories_embedding ON vector_memories 
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI Development Queue - tracks queued tasks
CREATE TABLE IF NOT EXISTS ai_task_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id TEXT UNIQUE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('code_generation', 'pr_review', 'bug_fix', 'refactor', 'test_generation')),
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'healing')),
  payload JSONB NOT NULL,
  result JSONB,
  iteration INTEGER DEFAULT 1,
  error_logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_status ON ai_task_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_task_queue_priority ON ai_task_queue(priority DESC, created_at ASC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for project_specs
DROP TRIGGER IF EXISTS update_project_specs_updated_at ON project_specs;
CREATE TRIGGER update_project_specs_updated_at
  BEFORE UPDATE ON project_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE agent_metrics IS 'Tracks metrics for each autonomous AI development loop iteration';
COMMENT ON TABLE project_specs IS 'Stores EARS-format requirements and design documents for projects';
COMMENT ON TABLE vector_memories IS 'Stores embeddings of completed tasks for architectural consistency';
COMMENT ON TABLE ai_task_queue IS 'Queue for AI development tasks with self-healing support';
