
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TaskContent from "../components/TaskContent";
import TaskSubmissionEditor from "../components/TaskSubmissionEditor";
import UserProfile from "../components/UserProfile";
import SubscriptionBanner from "../components/SubscriptionBanner";
import { useTaskManager } from "../hooks/useTaskManager";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Task management
  const {
    currentCourse,
    currentTask,
    userProgress,
    allTasks,
    isLoading: tasksLoading,
    submitTask,
    canMoveToNextTask,
    moveToPreviousTask,
    moveToSpecificTask
  } = useTaskManager();

  // Add stuck loading timer
  const [loadingStuck, setLoadingStuck] = useState(false);
  const stuckTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading && !stuckTimer.current) {
      stuckTimer.current = setTimeout(() => setLoadingStuck(true), 8000);
    }
    if (!loading && stuckTimer.current) {
      clearTimeout(stuckTimer.current);
      stuckTimer.current = null;
      setLoadingStuck(false);
    }
    return () => {
      if (stuckTimer.current) clearTimeout(stuckTimer.current);
    };
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading && loadingStuck) {
    // Show stuck loading fallback UI
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded shadow-lg p-8">
          <p className="text-lg text-red-800 mb-4 font-bold">
            Oops! The app is stuck loading.
          </p>
          <p className="text-gray-700 mb-4">
            Something went wrong while loading your authentication.<br />
            You may need to force a clean logout, or reload the page.
          </p>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 mr-4"
            onClick={() => {
              // Defensive forced logout
              try {
                if (signOut) { signOut(); }
              } catch (_) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/auth';
              }
            }}
          >
            Force Log Out
          </button>
          <button
            className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (loading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="w-full bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Interactive Coding Platform
              </h1>
            </div>
            <div className="flex items-center">
              <UserProfile />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg text-gray-600 font-medium">
              Complete coding tasks and track your progress!
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex justify-center items-start p-4 md:p-6">
        <div className="w-full max-w-7xl">
          {/* Subscription Banner */}
          <SubscriptionBanner />
          
          <div className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Task Content Section */}
            <section className="w-full lg:w-1/2 p-6 md:p-8 overflow-y-auto max-h-[80vh] border-r border-gray-200 bg-gradient-to-b from-white to-gray-50">
              <TaskContent 
                task={currentTask}
                course={currentCourse}
                userProgress={userProgress}
                allTasks={allTasks}
                canMoveToNext={canMoveToNextTask()}
                onPreviousTask={moveToPreviousTask}
                onNextTask={moveToSpecificTask}
              />
            </section>

            {/* Task Submission Editor Section */}
            <section className="w-full lg:w-1/2 flex flex-col">
              <TaskSubmissionEditor 
                task={currentTask}
                language={currentCourse?.language || 'python'}
                onSubmit={submitTask}
              />
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-800 text-white text-center p-4 mt-auto">
        <p className="text-sm">
          &copy; 2025 Interactive Coding Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
