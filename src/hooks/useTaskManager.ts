
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  initial_code: string;
  expected_output: string | null;
  test_cases: Json;
  order_index: number;
  difficulty_level: string;
  tags: string[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  language: string;
}

interface UserProgress {
  id: string;
  course_id: string;
  current_task_id: string | null;
  completed_tasks: number;
  total_tasks: number;
  completion_percentage: number;
}

export const useTaskManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load course and initial task
  useEffect(() => {
    if (user) {
      loadUserProgress();
    }
  }, [user]);

  const loadUserProgress = async () => {
    try {
      // First, get the first published course (for now)
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at')
        .limit(1);

      if (coursesError) throw coursesError;
      if (!courses || courses.length === 0) {
        console.log('No published courses found');
        setIsLoading(false);
        return;
      }

      const course = courses[0];
      setCurrentCourse(course);

      // Get all tasks for this course
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index');

      if (tasksError) throw tasksError;
      setAllTasks(tasks || []);

      // Get or create user progress
      let { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();

      if (progressError) throw progressError;

      // If no progress exists, create it
      if (!progress && tasks && tasks.length > 0) {
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            course_id: course.id,
            current_task_id: tasks[0].id,
            total_tasks: tasks.length,
            completed_tasks: 0,
            completion_percentage: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        progress = newProgress;
      }

      setUserProgress(progress);

      // Set current task
      if (progress?.current_task_id) {
        const task = tasks?.find(t => t.id === progress.current_task_id);
        setCurrentTask(task || null);
      } else if (tasks && tasks.length > 0) {
        setCurrentTask(tasks[0]);
      }

    } catch (error) {
      console.error('Error loading user progress:', error);
      toast({
        title: "Error",
        description: "Failed to load your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitTask = async (code: string): Promise<boolean> => {
    if (!currentTask || !user || !userProgress) return false;

    try {
      // Call the validate-code edge function
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-code', {
        body: {
          code,
          taskId: currentTask.id,
          language: currentCourse?.language || 'python'
        }
      });

      if (validationError) throw validationError;

      // Get the latest attempt number
      const { data: submissions } = await supabase
        .from('task_submissions')
        .select('attempt_number')
        .eq('user_id', user.id)
        .eq('task_id', currentTask.id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = submissions && submissions.length > 0 
        ? (submissions[0].attempt_number || 0) + 1 
        : 1;

      const isCorrect = validationResult?.isCorrect || false;

      // Save submission
      const { error: submissionError } = await supabase
        .from('task_submissions')
        .insert({
          user_id: user.id,
          task_id: currentTask.id,
          submitted_code: code,
          is_correct: isCorrect,
          execution_output: validationResult?.executionOutput || 'No output',
          validation_results: validationResult?.validationResults || {},
          attempt_number: attemptNumber
        });

      if (submissionError) throw submissionError;

      if (isCorrect) {
        await moveToNextTask();
        toast({
          title: "Correct!",
          description: "Great job! Moving to the next task.",
        });
        return true;
      } else {
        toast({
          title: "Not quite right",
          description: validationResult?.executionOutput || "Your output doesn't match the expected result. Try again!",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        title: "Error",
        description: "Failed to submit your solution. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const moveToNextTask = async () => {
    if (!currentTask || !userProgress || !allTasks) return;

    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    const nextTask = allTasks[currentIndex + 1];

    const newCompletedTasks = userProgress.completed_tasks + 1;
    const newCompletionPercentage = (newCompletedTasks / userProgress.total_tasks) * 100;

    const updateData = {
      completed_tasks: newCompletedTasks,
      completion_percentage: newCompletionPercentage,
      current_task_id: nextTask?.id || null,
      last_activity_at: new Date().toISOString(),
      ...(newCompletionPercentage === 100 ? { completed_at: new Date().toISOString() } : {})
    };

    const { error } = await supabase
      .from('user_progress')
      .update(updateData)
      .eq('id', userProgress.id);

    if (error) throw error;

    // Update local state
    setUserProgress({ ...userProgress, ...updateData });
    if (nextTask) {
      setCurrentTask(nextTask);
    }
  };

  const canMoveToNextTask = (): boolean => {
    if (!currentTask || !allTasks || !userProgress) return false;
    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    return currentIndex < userProgress.completed_tasks;
  };

  const moveToPreviousTask = () => {
    if (!currentTask || !allTasks) return;
    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    if (currentIndex > 0) {
      setCurrentTask(allTasks[currentIndex - 1]);
    }
  };

  const moveToSpecificTask = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      setCurrentTask(task);
    }
  };

  return {
    currentCourse,
    currentTask,
    userProgress,
    allTasks,
    isLoading,
    submitTask,
    canMoveToNextTask,
    moveToPreviousTask,
    moveToSpecificTask,
    loadUserProgress
  };
};
