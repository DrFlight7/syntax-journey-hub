
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

export const useTaskManager = (courseId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load course and initial task
  useEffect(() => {
    if (user && courseId) {
      loadUserProgress(courseId);
    } else if (user && !courseId) {
      loadUserProgressForFirstCourse();
    }
  }, [user, courseId]);

  const loadUserProgress = async (targetCourseId: string) => {
    try {
      console.log('[TASK-MANAGER] Loading progress for course:', targetCourseId);

      // Get the specific course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', targetCourseId)
        .eq('is_published', true)
        .single();

      if (courseError) {
        console.error('[TASK-MANAGER] Course error:', courseError);
        throw courseError;
      }

      console.log('[TASK-MANAGER] Course loaded:', courseData);
      setCurrentCourse(courseData);

      // Get all tasks for this course
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('course_id', targetCourseId)
        .order('order_index');

      if (tasksError) {
        console.error('[TASK-MANAGER] Tasks error:', tasksError);
        throw tasksError;
      }

      console.log('[TASK-MANAGER] Tasks loaded:', tasks);
      setAllTasks(tasks || []);

      // Get or create user progress
      let { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', targetCourseId)
        .maybeSingle();

      if (progressError) {
        console.error('[TASK-MANAGER] Progress error:', progressError);
        throw progressError;
      }

      // If no progress exists, create it
      if (!progress && tasks && tasks.length > 0) {
        console.log('[TASK-MANAGER] Creating new progress');
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            course_id: targetCourseId,
            current_task_id: tasks[0].id,
            total_tasks: tasks.length,
            completed_tasks: 0,
            completion_percentage: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('[TASK-MANAGER] Create progress error:', createError);
          throw createError;
        }
        progress = newProgress;
      }

      console.log('[TASK-MANAGER] Progress loaded:', progress);
      setUserProgress(progress);

      // Set current task
      if (progress?.current_task_id) {
        const task = tasks?.find(t => t.id === progress.current_task_id);
        console.log('[TASK-MANAGER] Setting current task:', task);
        setCurrentTask(task || null);
      } else if (tasks && tasks.length > 0) {
        console.log('[TASK-MANAGER] Setting first task as current');
        setCurrentTask(tasks[0]);
      }

    } catch (error) {
      console.error('[TASK-MANAGER] Error loading user progress:', error);
      toast({
        title: "Error",
        description: "Failed to load your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgressForFirstCourse = async () => {
    try {
      // First, get the first published course (for backward compatibility)
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
      await loadUserProgress(course.id);
    } catch (error) {
      console.error('Error loading first course progress:', error);
      setIsLoading(false);
    }
  };

  const resetProgress = async () => {
    if (!user || !currentCourse) {
      toast({
        title: "Error",
        description: "No user or course found to reset progress for.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Delete all task submissions for this user and course
      const { error: submissionsError } = await supabase
        .from('task_submissions')
        .delete()
        .eq('user_id', user.id)
        .in('task_id', allTasks.map(task => task.id));

      if (submissionsError) throw submissionsError;

      // Reset user progress to the first task
      const firstTask = allTasks.find(task => task.order_index === 1);
      if (!firstTask) {
        throw new Error('No first task found');
      }

      const { error: progressError } = await supabase
        .from('user_progress')
        .update({
          current_task_id: firstTask.id,
          completed_tasks: 0,
          completion_percentage: 0,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('course_id', currentCourse.id);

      if (progressError) throw progressError;

      // Update local state
      setCurrentTask(firstTask);
      if (userProgress) {
        setUserProgress({
          ...userProgress,
          current_task_id: firstTask.id,
          completed_tasks: 0,
          completion_percentage: 0
        });
      }

      toast({
        title: "Progress Reset",
        description: "Your progress has been reset to the beginning. You can now retest the platform!",
      });

    } catch (error) {
      console.error('Error resetting progress:', error);
      toast({
        title: "Error",
        description: "Failed to reset progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitTask = async (code: string): Promise<boolean> => {
    if (!currentTask || !user || !userProgress) return false;

    try {
      console.log('[SUBMIT-TASK] Submitting code:', code);
      console.log('[SUBMIT-TASK] Task ID:', currentTask.id);
      console.log('[SUBMIT-TASK] Language:', currentCourse?.language || 'python');

      // Call the validate-code edge function
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-code', {
        body: {
          code,
          taskId: currentTask.id,
          language: currentCourse?.language || 'python'
        }
      });

      console.log('[SUBMIT-TASK] Validation result:', validationResult);
      console.log('[SUBMIT-TASK] Validation error:', validationError);

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

      console.log('[SUBMIT-TASK] Is correct:', isCorrect);
      console.log('[SUBMIT-TASK] Execution output:', validationResult?.executionOutput);

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
        console.log('[SUBMIT-TASK] Code is correct, calling moveToNextTask');
        await moveToNextTask();
        console.log('[SUBMIT-TASK] moveToNextTask completed successfully');
        toast({
          title: "Correct! ✅",
          description: "Great job! Moving to the next task.",
        });
        return true;
      } else {
        // Enhanced error messaging with debugging details
        const errorDetails = validationResult?.executionOutput || "Your output doesn't match the expected result.";
        const validationDetails = validationResult?.validationResults?.details || '';
        
        const fullMessage = validationDetails && validationDetails !== errorDetails 
          ? `${errorDetails}\n\nDetails: ${validationDetails}`
          : errorDetails;

        toast({
          title: "Not quite right ❌",
          description: fullMessage,
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      
      // Enhanced error messaging for debugging
      let errorMessage = "Failed to submit your solution. Please try again.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }
      
      toast({
        title: "Submission Error ⚠️",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const moveToNextTask = async () => {
    console.log('[MOVE-TO-NEXT-TASK] Starting function');
    if (!currentTask || !userProgress || !allTasks) {
      console.log('[MOVE-TO-NEXT-TASK] Missing required data:', { 
        currentTask: !!currentTask, 
        userProgress: !!userProgress, 
        allTasks: !!allTasks 
      });
      return;
    }

    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    const nextTask = allTasks[currentIndex + 1];
    console.log('[MOVE-TO-NEXT-TASK] Current task index:', currentIndex, 'Next task exists:', !!nextTask);

    try {
      // Check if this task was already completed before (excluding the current submission)
      console.log('[MOVE-TO-NEXT-TASK] Checking existing submissions for task:', currentTask.id);
      const { data: existingSubmissions, error: submissionError } = await supabase
        .from('task_submissions')
        .select('is_correct, submitted_at')
        .eq('user_id', user!.id)
        .eq('task_id', currentTask.id)
        .eq('is_correct', true)
        .order('submitted_at', { ascending: true });

      if (submissionError) {
        console.error('[MOVE-TO-NEXT-TASK] Error fetching submissions:', submissionError);
        throw submissionError;
      }

      console.log('[MOVE-TO-NEXT-TASK] Existing correct submissions:', existingSubmissions?.length || 0);

      // If there are 2 or more correct submissions, this task was already completed before
      const wasAlreadyCompleted = existingSubmissions && existingSubmissions.length > 1;
      console.log('[MOVE-TO-NEXT-TASK] Was already completed:', wasAlreadyCompleted);
      
      // Only increment completed_tasks if this is the first time completing this task
      const newCompletedTasks = wasAlreadyCompleted 
        ? userProgress.completed_tasks 
        : Math.min(userProgress.completed_tasks + 1, userProgress.total_tasks);
      
      const newCompletionPercentage = Math.min((newCompletedTasks / userProgress.total_tasks) * 100, 100);

      console.log('[MOVE-TO-NEXT-TASK] Progress update:', {
        oldCompleted: userProgress.completed_tasks,
        newCompleted: newCompletedTasks,
        totalTasks: userProgress.total_tasks,
        newPercentage: newCompletionPercentage
      });

      const updateData = {
        completed_tasks: newCompletedTasks,
        completion_percentage: newCompletionPercentage,
        current_task_id: nextTask?.id || null,
        last_activity_at: new Date().toISOString(),
        ...(newCompletionPercentage === 100 ? { completed_at: new Date().toISOString() } : {})
      };

      console.log('[MOVE-TO-NEXT-TASK] Updating user progress with:', updateData);

      const { error } = await supabase
        .from('user_progress')
        .update(updateData)
        .eq('id', userProgress.id);

      if (error) {
        console.error('[MOVE-TO-NEXT-TASK] Error updating progress:', error);
        throw error;
      }

      console.log('[MOVE-TO-NEXT-TASK] Successfully updated user progress');

      // Update local state
      setUserProgress({ ...userProgress, ...updateData });
      if (nextTask) {
        setCurrentTask(nextTask);
        console.log('[MOVE-TO-NEXT-TASK] Moved to next task:', nextTask.title);
      } else {
        console.log('[MOVE-TO-NEXT-TASK] No next task available - course completed');
      }
    } catch (error) {
      console.error('[MOVE-TO-NEXT-TASK] Function failed:', error);
      throw error;
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
    loadUserProgress,
    resetProgress
  };
};
