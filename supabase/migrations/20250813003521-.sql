-- Fix infinite recursion in exam policies by using security definer functions consistently

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view assigned exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can manage their own exams" ON public.exams;

-- Create clean, non-recursive policies for exams
CREATE POLICY "Teachers can manage their own exams" 
ON public.exams 
FOR ALL 
USING (created_by = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view assigned exams" 
ON public.exams 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM exam_assignments ea 
  WHERE ea.exam_id = exams.id AND ea.student_id = auth.uid()
));