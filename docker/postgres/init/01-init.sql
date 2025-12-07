-- Initial database setup
-- This script runs when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add any initial schema or seed data here
-- Example:
-- CREATE TABLE users (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   email VARCHAR(255) UNIQUE NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
