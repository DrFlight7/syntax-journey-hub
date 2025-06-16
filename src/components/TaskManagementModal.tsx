
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TaskList from './TaskList';
import TaskForm from './TaskForm';

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  is_published: boolean;
  created_at: string;
}

interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  initial_code: string;
  expected_output: string | null;
  difficulty_level: string;
  tags: string[];
  order_index: number;
  test_cases: any;
}

interface TaskManagementModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

const TaskManagementModal = ({ course, isOpen, onClose }: TaskManagementModalProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (course && isOpen) {
      fetchTasks();
    }
  }, [course, isOpen]);

  const fetchTasks = async () => {
    if (!course) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    if (!course) return;

    setFormLoading(true);
    try {
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            initial_code: formData.initial_code,
            expected_output: formData.expected_output || null,
            difficulty_level: formData.difficulty_level,
            tags: formData.tags || [],
            order_index: formData.order_index,
            test_cases: formData.test_cases || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTask.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert({
            course_id: course.id,
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            initial_code: formData.initial_code,
            expected_output: formData.expected_output || null,
            difficulty_level: formData.difficulty_level,
            tags: formData.tags || [],
            order_index: formData.order_index,
            test_cases: formData.test_cases || null
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      setIsFormOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isFormOpen 
              ? (editingTask ? 'Edit Task' : 'Add New Task')
              : `Manage Tasks - ${course.title}`
            }
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {isFormOpen ? (
            <TaskForm
              task={editingTask}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              loading={formLoading}
              taskCount={tasks.length}
            />
          ) : (
            <TaskList
              tasks={tasks}
              loading={loading}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskManagementModal;
