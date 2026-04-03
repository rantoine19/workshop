-- Add title column to chat_sessions
-- Title is auto-generated from the first user message (first 50 chars)
ALTER TABLE chat_sessions ADD COLUMN title text;
