-- Fix infinite recursion in exams table policies by removing has_role() function calls
-- Replace with direct user_roles table queries to avoid recursion

-- Drop existing policies on exams table
DROP POLICY IF EXISTS "Students can view assigned exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can manage their own exams" ON public.exams;

-- Create new policies without has_role() function to avoid recursion
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

CREATE POLICY "Teachers can manage their own exams" 
ON public.exams 
FOR ALL 
USING (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'
  )
)
WITH CHECK (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'
  )
);