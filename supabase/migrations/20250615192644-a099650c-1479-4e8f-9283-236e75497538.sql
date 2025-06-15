
-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Add created_by field to courses table
ALTER TABLE public.courses ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  badge_icon TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  progress JSONB DEFAULT '{}',
  UNIQUE (user_id, achievement_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student roles" ON public.user_roles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'teacher') AND role = 'student'
  );

-- RLS policies for courses
CREATE POLICY "Everyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "Teachers can view their own courses" ON public.courses
  FOR SELECT USING (
    public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
  );

CREATE POLICY "Teachers can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
  );

CREATE POLICY "Teachers can update their own courses" ON public.courses
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
  );

CREATE POLICY "Teachers can delete their own courses" ON public.courses
  FOR DELETE USING (
    public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid()
  );

-- RLS policies for achievements
CREATE POLICY "Everyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage achievements" ON public.achievements
  FOR ALL USING (public.has_role(auth.uid(), 'teacher'));

-- RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all user achievements" ON public.user_achievements
  FOR SELECT USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "System can create user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (true);

-- Insert some default achievements
INSERT INTO public.achievements (title, description, criteria, badge_icon, points) VALUES
('First Steps', 'Complete your first coding task', '{"type": "task_completion", "count": 1}', '🎯', 10),
('Quick Learner', 'Complete 5 tasks in a single day', '{"type": "daily_tasks", "count": 5}', '⚡', 25),
('Course Master', 'Complete an entire course', '{"type": "course_completion", "count": 1}', '🏆', 50),
('Persistent Coder', 'Complete 10 tasks total', '{"type": "task_completion", "count": 10}', '💪', 30),
('Perfect Score', 'Get a task right on the first try', '{"type": "first_try_success", "count": 1}', '⭐', 15);
