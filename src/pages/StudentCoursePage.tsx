
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, CheckCircle, Circle, BookOpen } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import UserProfile from '@/components/UserProfile';
import { useTaskManager } from '@/hooks/useTaskManager';
import TaskSubmissionEditor from '@/components/TaskSubmissionEditor';

const StudentCoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const {
    currentCourse,
    currentTask,
    userProgress,
    allTasks,
    isLoading,
    submitTask,
    moveToSpecificTask
  } = useTaskManager(courseId);

  // Set the first task as selected when tasks are loaded
  useEffect(() => {
    if (allTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(allTasks[0].id);
      moveToSpecificTask(allTasks[0].id);
    }
  }, [allTasks, selectedTaskId, moveToSpecificTask]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    moveToSpecificTask(taskId);
  };

  const getTaskStatus = (taskId: string) => {
    if (!userProgress) return 'locked';
    
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    const completedTasks = userProgress.completed_tasks;
    
    if (taskIndex < completedTasks) return 'completed';
    if (taskIndex === completedTasks) return 'current';
    return 'locked';
  };

  const isTaskAccessible = (taskId: string) => {
    const status = getTaskStatus(taskId);
    return status === 'completed' || status === 'current';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Course not found</h2>
            <p className="text-gray-600 mb-4">The course you're looking for doesn't exist or isn't published.</p>
            <Button onClick={() => navigate('/student/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionPercentage = userProgress?.completion_percentage || 0;

  return (
    <RoleGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="w-full bg-white shadow-lg border-b border-blue-100">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/student/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{currentCourse.title}</h1>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {currentCourse.language}
                    </Badge>
                    {currentCourse.difficulty_level && (
                      <Badge variant="outline" className="capitalize">
                        {currentCourse.difficulty_level}
                      </Badge>
                    )}
                    <span className="text-sm text-gray-600">
                      {userProgress?.completed_tasks || 0} of {allTasks.length} tasks completed
                    </span>
                  </div>
                </div>
              </div>
              <UserProfile />
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <Progress value={completionPercentage} className="h-2" />
              <p className="text-sm text-gray-600 mt-1">
                {Math.round(completionPercentage)}% complete
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Task List Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {allTasks.map((task, index) => {
                      const status = getTaskStatus(task.id);
                      const isAccessible = isTaskAccessible(task.id);
                      const isSelected = selectedTaskId === task.id;
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => isAccessible && handleTaskSelect(task.id)}
                          disabled={!isAccessible}
                          className={`w-full p-3 text-left transition-colors border-l-4 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900'
                              : status === 'completed'
                              ? 'bg-green-50 border-green-500 text-green-900 hover:bg-green-100'
                              : status === 'current'
                              ? 'bg-yellow-50 border-yellow-500 text-yellow-900 hover:bg-yellow-100'
                              : 'bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : status === 'current' ? (
                              <Play className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {index + 1}. {task.title}
                              </p>
                              {task.difficulty_level && (
                                <p className="text-xs opacity-75 capitalize">
                                  {task.difficulty_level}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task Content */}
            <div className="lg:col-span-3">
              {selectedTaskId && currentTask ? (
                <TaskSubmissionEditor
                  task={currentTask}
                  language={currentCourse.language}
                  onSubmit={submitTask}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      Select a task to start learning
                    </h3>
                    <p className="text-gray-500 text-center">
                      Choose a task from the sidebar to begin working on it
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default StudentCoursePage;
