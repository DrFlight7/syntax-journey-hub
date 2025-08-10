-- Create exams-related tables with RLS and triggers
-- 1) Exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Policies for exams
DO $$ BEGIN
  -- Teachers manage their own exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exams' AND policyname = 'Teachers can manage their own exams'
  ) THEN
    CREATE POLICY "Teachers can manage their own exams"
    ON public.exams
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid())
    WITH CHECK (public.has_role(auth.uid(), 'teacher'::app_role) AND created_by = auth.uid());
  END IF;

  -- Students can view exams assigned to them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exams' AND policyname = 'Students can view assigned exams'
  ) THEN
    CREATE POLICY "Students can view assigned exams"
    ON public.exams
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exam_assignments ea
        WHERE ea.exam_id = exams.id AND ea.student_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_exams_updated_at'
  ) THEN
    CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 2) Exam tasks
CREATE TABLE IF NOT EXISTS public.exam_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  initial_code TEXT NOT NULL,
  expected_output TEXT,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_exam_tasks_exam FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE
);

ALTER TABLE public.exam_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Teachers manage tasks for their exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_tasks' AND policyname = 'Teachers can manage exam tasks'
  ) THEN
    CREATE POLICY "Teachers can manage exam tasks"
    ON public.exam_tasks
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_tasks.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_tasks.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    );
  END IF;

  -- Students can view tasks for exams assigned to them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_tasks' AND policyname = 'Students can view tasks of assigned exams'
  ) THEN
    CREATE POLICY "Students can view tasks of assigned exams"
    ON public.exam_tasks
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exam_assignments ea WHERE ea.exam_id = exam_tasks.exam_id AND ea.student_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_exam_tasks_updated_at'
  ) THEN
    CREATE TRIGGER trg_exam_tasks_updated_at
    BEFORE UPDATE ON public.exam_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 3) Exam assignments
CREATE TABLE IF NOT EXISTS public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned', -- assigned | in_progress | submitted | graded
  CONSTRAINT uq_exam_student UNIQUE (exam_id, student_id),
  CONSTRAINT fk_exam_assignments_exam FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE
);

ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Teachers can manage assignments for their exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_assignments' AND policyname = 'Teachers can manage exam assignments'
  ) THEN
    CREATE POLICY "Teachers can manage exam assignments"
    ON public.exam_assignments
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_assignments.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_assignments.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    );
  END IF;

  -- Students can view their own assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_assignments' AND policyname = 'Students can view own assignments'
  ) THEN
    CREATE POLICY "Students can view own assignments"
    ON public.exam_assignments
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());
  END IF;
END $$;

-- 4) Exam submissions
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  exam_task_id UUID NOT NULL,
  student_id UUID NOT NULL,
  submitted_code TEXT NOT NULL,
  execution_output TEXT,
  validation_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade NUMERIC,
  feedback TEXT,
  CONSTRAINT fk_exam_submissions_exam FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_submissions_task FOREIGN KEY (exam_task_id) REFERENCES public.exam_tasks (id) ON DELETE CASCADE
);

ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Students can insert/view their own submissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_submissions' AND policyname = 'Students can insert own exam submissions'
  ) THEN
    CREATE POLICY "Students can insert own exam submissions"
    ON public.exam_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_submissions' AND policyname = 'Students can view own exam submissions'
  ) THEN
    CREATE POLICY "Students can view own exam submissions"
    ON public.exam_submissions
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());
  END IF;

  -- Teachers can view and grade submissions for their exams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_submissions' AND policyname = 'Teachers can view submissions for their exams'
  ) THEN
    CREATE POLICY "Teachers can view submissions for their exams"
    ON public.exam_submissions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_submissions.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_submissions' AND policyname = 'Teachers can grade submissions for their exams'
  ) THEN
    CREATE POLICY "Teachers can grade submissions for their exams"
    ON public.exam_submissions
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_submissions.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.exams e WHERE e.id = exam_submissions.exam_id AND e.created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'::app_role)
      )
    );
  END IF;
END $$;

-- 5) Exam drafts for autosave
CREATE TABLE IF NOT EXISTS public.exam_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_task_id UUID NOT NULL,
  student_id UUID NOT NULL,
  draft_code TEXT NOT NULL DEFAULT ''::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_exam_draft UNIQUE (exam_task_id, student_id),
  CONSTRAINT fk_exam_draft_task FOREIGN KEY (exam_task_id) REFERENCES public.exam_tasks (id) ON DELETE CASCADE
);

ALTER TABLE public.exam_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exam_drafts' AND policyname = 'Students can manage own exam drafts'
  ) THEN
    CREATE POLICY "Students can manage own exam drafts"
    ON public.exam_drafts
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- Function to update last_saved_at
CREATE OR REPLACE FUNCTION public.set_exam_drafts_last_saved_at()
RETURNS trigger AS $$
BEGIN
  NEW.last_saved_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on exam_drafts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_exam_drafts_last_saved_at'
  ) THEN
    CREATE TRIGGER trg_exam_drafts_last_saved_at
    BEFORE UPDATE ON public.exam_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_exam_drafts_last_saved_at();
  END IF;
END $$;