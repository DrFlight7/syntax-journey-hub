
import { CheckCircle, Clock, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string;
  difficulty_level: string;
  order_index: number;
}

interface Course {
  title: string;
  description: string;
  difficulty_level: string;
}

interface UserProgress {
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
}

const TaskContent = ({ 
  task, 
  course, 
  userProgress, 
  allTasks, 
  canMoveToNext, 
  onPreviousTask, 
  onNextTask 
}: TaskContentProps) => {
  if (!task || !course) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-2">No Tasks Available</h2>
          <p className="text-gray-500">There are no tasks available at the moment.</p>
        </div>
      </div>
    );
  }

  const currentTaskIndex = allTasks.findIndex(t => t.id === task.id);
  const isCompleted = userProgress && currentTaskIndex < userProgress.completed_tasks;

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Course Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(course.difficulty_level)}`}>
            {course.difficulty_level}
          </span>
        </div>
        <p className="text-gray-600 text-sm">{course.description}</p>
        
        {/* Progress Bar */}
        {userProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {userProgress.completed_tasks} / {userProgress.total_tasks} tasks
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(userProgress.completion_percentage)}%
              </span>
            </div>
            <Progress value={userProgress.completion_percentage} className="h-2" />
          </div>
        )}
      </div>

      {/* Task Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onPreviousTask}
          disabled={currentTaskIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-2">
          {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
          <span className="text-sm font-medium text-gray-600">
            Task {task.order_index} of {allTasks.length}
          </span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            const nextTask = allTasks[currentTaskIndex + 1];
            if (nextTask) onNextTask(nextTask.id);
          }}
          disabled={!canMoveToNext || currentTaskIndex === allTasks.length - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Task Content */}
      <div className="flex-grow overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl font-bold text-gray-800">{task.title}</h2>
            {isCompleted && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <Trophy className="w-3 h-3" />
                Completed
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(task.difficulty_level)}`}>
              {task.difficulty_level}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Estimated: 5-10 minutes
            </span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Description</h3>
            <p className="text-gray-700 leading-relaxed">{task.description}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-xl font-semibold text-blue-800 mb-3">Instructions</h3>
            <div className="text-blue-700 leading-relaxed whitespace-pre-wrap">
              {task.instructions}
            </div>
          </div>

          {/* Task List Overview */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">All Tasks in This Course</h3>
            <div className="space-y-2">
              {allTasks.map((t, index) => {
                const taskCompleted = userProgress && index < userProgress.completed_tasks;
                const isCurrent = t.id === task.id;
                
                return (
                  <div 
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isCurrent 
                        ? 'bg-blue-100 border-blue-300' 
                        : taskCompleted 
                          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onNextTask(t.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      taskCompleted 
                        ? 'bg-green-600 text-white' 
                        : isCurrent 
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}>
                      {taskCompleted ? '✓' : t.order_index}
                    </div>
                    <span className={`font-medium ${
                      isCurrent ? 'text-blue-800' : taskCompleted ? 'text-green-800' : 'text-gray-700'
                    }`}>
                      {t.title}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskContent;
