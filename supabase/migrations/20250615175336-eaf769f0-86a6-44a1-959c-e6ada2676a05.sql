
-- Create courses table to organize learning content
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  language TEXT NOT NULL DEFAULT 'python',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tasks table for individual coding challenges
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  initial_code TEXT NOT NULL,
  expected_output TEXT,
  test_cases JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_progress table to track learning progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  current_task_id UUID REFERENCES public.tasks(id),
  completed_tasks INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Create task_submissions table to store user submissions
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_code TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  execution_output TEXT,
  validation_results JSONB DEFAULT '{}'::jsonb,
  attempt_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses (public read access)
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true);

-- RLS Policies for tasks (public read access for published courses)
CREATE POLICY "Anyone can view tasks from published courses" ON public.tasks
  FOR SELECT USING (
    course_id IN (SELECT id FROM public.courses WHERE is_published = true)
  );

-- RLS Policies for user_progress (users can only see their own progress)
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for task_submissions (users can only see their own submissions)
CREATE POLICY "Users can view their own submissions" ON public.task_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" ON public.task_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_tasks_course_id ON public.tasks(course_id);
CREATE INDEX idx_tasks_order_index ON public.tasks(order_index);
CREATE INDEX idx_user_progress_user_course ON public.user_progress(user_id, course_id);
CREATE INDEX idx_task_submissions_user_task ON public.task_submissions(user_id, task_id);

-- Insert sample course and tasks for testing
INSERT INTO public.courses (title, description, difficulty_level, language, is_published) VALUES
('Python Fundamentals', 'Learn the basics of Python programming', 'beginner', 'python', true);

-- Get the course ID for inserting tasks
WITH course_data AS (
  SELECT id FROM public.courses WHERE title = 'Python Fundamentals'
)
INSERT INTO public.tasks (course_id, title, description, instructions, initial_code, expected_output, order_index, difficulty_level) 
SELECT 
  course_data.id,
  'Variables and Print Statements',
  'Learn how to create variables and print them',
  'Create variables for your name, age, and favorite color, then print them using the format shown in the expected output.',
  '# Create your variables here
name = "Your Name"
age = 0
favorite_color = "blue"

# Print them using the format below
print("Hello, my name is", name)
print("I am", age, "years old")  
print("My favorite color is", favorite_color)',
  'Hello, my name is Alice
I am 25 years old
My favorite color is purple',
  1,
  'beginner'
FROM course_data;
