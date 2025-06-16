
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import TaskCard from './TaskCard';

interface Task {
  id: string;
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

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList = ({ tasks, loading, onAddTask, onEditTask, onDeleteTask }: TaskListProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Tasks</h3>
        <Button onClick={onAddTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first task to start building your course content
          </p>
          <Button onClick={onAddTask} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create First Task
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks
            .sort((a, b) => a.order_index - b.order_index)
            .map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
