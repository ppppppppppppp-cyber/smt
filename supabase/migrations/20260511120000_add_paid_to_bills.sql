-- Add paid column to bills table
ALTER TABLE public.bills ADD COLUMN paid BOOLEAN NOT NULL DEFAULT false;