import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  initial_code: string;
  expected_output: string | null;
  test_cases: any;
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

interface TaskContentProps {
  task: Task | null;
  course: Course | null;
  userProgress: UserProgress | null;
  allTasks: Task[];
  canMoveToNext: boolean;
  onPreviousTask: () => void;
  onNextTask: (taskId: string) => void;
  onResetProgress: () => void;
}

const TaskContent = ({ 
  task, 
  course, 
  userProgress, 
  allTasks, 
  canMoveToNext, 
  onPreviousTask, 
  onNextTask,
  onResetProgress 
}: TaskContentProps) => {
  if (!task || !course) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No task available</p>
      </div>
    );
  }

  const currentTaskIndex = allTasks.findIndex(t => t.id === task.id);
  const canMoveToPrevious = currentTaskIndex > 0;

  return (
    <div className="space-y-6">
      {/* Header with progress and reset button */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {course.difficulty_level}
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {course.language}
            </div>
          </div>
        </div>
        <Button
          onClick={onResetProgress}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset Progress</span>
        </Button>
      </div>

      {/* Progress Bar */}
      {userProgress && (
        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${userProgress.completion_percentage}%` }}
          ></div>
          <p className="text-sm text-gray-600 mt-2">
            Progress: {userProgress.completed_tasks} / {userProgress.total_tasks} tasks completed 
            ({userProgress.completion_percentage.toFixed(1)}%)
          </p>
        </div>
      )}

      {/* Task Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">{task.title}</h2>
          <div className="flex items-center space-x-2">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
              Task {task.order_index}
            </span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
              {task.difficulty_level}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{task.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Instructions</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 leading-relaxed">{task.instructions}</p>
            </div>
          </div>

          {task.expected_output && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Expected Output</h3>
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap text-gray-800">{task.expected_output}</pre>
              </div>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, index) => (
                  <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <Button
          onClick={onPreviousTask}
          disabled={!canMoveToPrevious}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous Task</span>
        </Button>

        <div className="text-sm text-gray-500">
          Task {currentTaskIndex + 1} of {allTasks.length}
        </div>

        <Button
          onClick={() => {
            const nextTaskIndex = currentTaskIndex + 1;
            if (nextTaskIndex < allTasks.length) {
              onNextTask(allTasks[nextTaskIndex].id);
            }
          }}
          disabled={!canMoveToNext || currentTaskIndex >= allTasks.length - 1}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <span>Next Task</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TaskContent;
