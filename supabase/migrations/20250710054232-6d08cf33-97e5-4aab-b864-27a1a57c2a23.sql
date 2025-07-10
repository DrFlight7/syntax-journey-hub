-- Add new fields to tasks table for enhanced task information
ALTER TABLE public.tasks 
ADD COLUMN month text,
ADD COLUMN week text,
ADD COLUMN theory_concept text,
ADD COLUMN real_world_application text,
ADD COLUMN learning_objectives text[];