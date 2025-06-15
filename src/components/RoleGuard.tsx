
import React from 'react';
import { useRole, UserRole } from '@/hooks/useRole';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback = null }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  console.log('[RoleGuard] Current state:', {
    user: user?.id,
    role,
    allowedRoles,
    authLoading,
    roleLoading,
    hasAccess: allowedRoles.includes(role)
  });

  if (authLoading || roleLoading) {
    console.log('[RoleGuard] Still loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(role)) {
    console.log('[RoleGuard] Access denied:', { user: !!user, role, allowedRoles });
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Current role: {role || 'None'}</p>
          <p className="text-sm text-gray-500">Required roles: {allowedRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  console.log('[RoleGuard] Access granted!');
  return <>{children}</>;
};

export default RoleGuard;
