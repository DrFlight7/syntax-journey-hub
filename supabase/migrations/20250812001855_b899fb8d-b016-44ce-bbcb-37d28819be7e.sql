-- Fix RLS recursion causing 500 on exams queries by removing recursive policy on user_roles
-- The policy "Teachers can view student roles" references has_role(), which itself queries user_roles
-- This creates recursion when other table policies (like exams) call has_role().

-- Drop the problematic policy on user_roles
DROP POLICY IF EXISTS "Teachers can view student roles" ON public.user_roles;