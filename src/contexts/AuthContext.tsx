
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from './cleanupAuthState';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

// Defensive fallback if context is missing
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[AuthProvider] useAuth called outside provider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// On error, render a fallback log-out screen
const Fallback = () => {
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const forceLogout = () => {
    setMsg("Force logging out...");
    setProcessing(true);
    try {
      cleanupAuthState();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    } catch (_) {
      setMsg("Could not force log out. Please close the tab and clear cookies!");
    }
  };
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white rounded-xl p-8 shadow-lg text-center w-full max-w-md">
        <div className="mb-4 text-lg font-bold text-red-600">App context failed</div>
        <div className="mb-4 text-gray-600">
          An unrecoverable error occurred initializing authentication.<br />
          Try force logging out below.
        </div>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 mb-2"
          onClick={forceLogout}
          disabled={processing}
        >
          {processing ? 'Logging out...' : 'Force Log Out'}
        </button>
        {msg && <div className="text-xs text-gray-500 mt-2">{msg}</div>}
      </div>
    </div>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubed = false;
    try {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (unsubed) return;
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // DEBUG LOG
          console.log('[AuthProvider] onAuthStateChange:', { event, session });

          // Only fire after login
          if (event === 'SIGNED_IN' && session?.user) {
            setTimeout(() => {
              // check-subscription can happen elsewhere, never block context
            }, 0);
          }
        }
      );

      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (unsubed) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // DEBUG LOG
        console.log('[AuthProvider] getSession result:', { session });
      }).catch(e => {
        if (unsubed) return;
        setError(new Error('Failed to get session: ' + e.message));
        setSession(null);
        setUser(null);
        setLoading(false);
      });

      return () => {
        unsubed = true;
        subscription.unsubscribe();
      };
    } catch (e: any) {
      setError(e);
      setUser(null);
      setSession(null);
      setLoading(false);
      console.error('[AuthProvider] Exception setting up:', e);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });
      return { error };
    } catch (error) {
      console.error('signUp error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('signIn error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      return { error };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      cleanupAuthState();
      window.location.href = '/auth';
    } catch (error) {
      // last resort
      cleanupAuthState();
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  if (error) {
    console.error('[AuthProvider] ERROR:', error);
    return <Fallback />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
