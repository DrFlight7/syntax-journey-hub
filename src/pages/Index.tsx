
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';

const Index = () => {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (role === 'student') {
        navigate('/student/dashboard');
      } else {
        // User has no role assigned, redirect to auth to select role
        navigate('/auth');
      }
    }
  }, [user, role, loading, roleLoading, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
