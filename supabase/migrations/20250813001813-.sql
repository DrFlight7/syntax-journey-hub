-- Completely fix the infinite recursion in exams table policies
-- Drop ALL existing policies and recreate them properly

-- First, disable RLS temporarily to avoid issues
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on exams table
DROP POLICY IF EXISTS "Students can view assigned exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can manage their own exams" ON public.exams;

-- Re-enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create new simple policies without any function calls
CREATE POLICY "Students can view assigned exams" 
ON public.exams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM exam_assignments ea
    WHERE ea.exam_id = exams.id 
    AND ea.student_id = auth.uid()
  )
);

-- Create teacher policy with direct role check (no function calls)
CREATE POLICY "Teachers can manage their own exams" 
ON public.exams 
FOR ALL 
USING (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  )
)
WITH CHECK (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  )
);