
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'teacher' | 'student' | null;

export const useRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        console.log('[useRole] No user found, setting role to null');
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('[useRole] Fetching role for user:', user.id);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[useRole] Query result:', { data, error });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          const userRole = data?.role as UserRole || null;
          console.log('[useRole] Setting role to:', userRole);
          setRole(userRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  console.log('[useRole] Current state:', { role, loading, userId: user?.id });
  
  return { role, loading };
};
