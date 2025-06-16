
-- Add RLS policies for tasks table to ensure teachers can only manage tasks for their own courses
CREATE POLICY "Teachers can view tasks from their own courses" ON public.tasks
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM public.courses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert tasks to their own courses" ON public.tasks
  FOR INSERT WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can update tasks from their own courses" ON public.tasks
  FOR UPDATE USING (
    course_id IN (
      SELECT id FROM public.courses WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete tasks from their own courses" ON public.tasks
  FOR DELETE USING (
    course_id IN (
      SELECT id FROM public.courses WHERE created_by = auth.uid()
    )
  );

-- Add created_by column to courses table if it doesn't exist (for the RLS policies to work)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
