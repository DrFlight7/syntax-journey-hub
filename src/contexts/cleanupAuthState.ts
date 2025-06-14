
/**
 * Cleans up ALL Supabase auth state from localStorage and sessionStorage.
 * Prevents authentication limbo states on logout or login.
 */
export const cleanupAuthState = () => {
  // Remove all Supabase auth tokens/keys from localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove all Supabase auth tokens/keys from sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};
