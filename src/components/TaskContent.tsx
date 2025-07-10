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
  month?: string;
  week?: string;
  theory_concept?: string;
  real_world_application?: string;
  learning_objectives?: string[];
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Task Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-gray-900">{task.title}</h2>
            <div className="flex items-center space-x-2">
              <span className="bg-white/80 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                Task {task.order_index}
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {task.difficulty_level}
              </span>
            </div>
          </div>

          {/* Task Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Month:</span>
              <p className="text-gray-900">{task.month || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Week:</span>
              <p className="text-gray-900">{task.week || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Task:</span>
              <p className="text-gray-900">{task.order_index}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Order:</span>
              <p className="text-gray-900">{task.order_index}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Theory/Concept */}
          {task.theory_concept && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
                Theory/Concept
              </h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                <p className="text-blue-900 leading-relaxed">{task.theory_concept}</p>
              </div>
            </div>
          )}

          {/* Real-world Application */}
          {task.real_world_application && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-green-500 rounded-full mr-3"></span>
                Real-world Application
              </h3>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                <p className="text-green-900 leading-relaxed">{task.real_world_application}</p>
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {task.learning_objectives && task.learning_objectives.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-purple-500 rounded-full mr-3"></span>
                Learning Objectives
              </h3>
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
                <ul className="list-disc list-inside space-y-2 text-purple-900">
                  {task.learning_objectives.map((objective, index) => (
                    <li key={index} className="leading-relaxed">{objective}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="w-1 h-6 bg-gray-500 rounded-full mr-3"></span>
              Description
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{task.description}</p>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="w-1 h-6 bg-orange-500 rounded-full mr-3"></span>
              Instructions
            </h3>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
              <div className="text-orange-900">
                {task.instructions.split('\n').map((instruction, index) => (
                  <div key={index} className="flex items-start mb-2 last:mb-0">
                    <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full mr-3 mt-0.5 min-w-[24px] text-center">
                      {index + 1}
                    </span>
                    <p className="leading-relaxed flex-1">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Initial Code */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="w-1 h-6 bg-cyan-500 rounded-full mr-3"></span>
              Initial Code
            </h3>
            <div className="bg-gray-900 border border-gray-300 rounded-lg p-4 overflow-x-auto">
              <pre className="text-gray-100 text-sm font-mono whitespace-pre-wrap">{task.initial_code}</pre>
            </div>
          </div>

          {/* Expected Output */}
          {task.expected_output && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-emerald-500 rounded-full mr-3"></span>
                Expected Output
              </h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <pre className="text-emerald-900 text-sm font-mono whitespace-pre-wrap">{task.expected_output}</pre>
              </div>
            </div>
          )}

          {/* Test Cases */}
          {task.test_cases && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-red-500 rounded-full mr-3"></span>
                Test Cases
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <pre className="text-red-900 text-sm font-mono whitespace-pre-wrap">
                  {typeof task.test_cases === 'string' ? task.test_cases : JSON.stringify(task.test_cases, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-1 h-6 bg-pink-500 rounded-full mr-3"></span>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag, index) => (
                  <span key={index} className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    #{tag}
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
