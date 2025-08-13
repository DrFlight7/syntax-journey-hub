-- Fix security vulnerability: Restrict profiles table access to authenticated users only
-- Remove public read access and implement proper authentication-based policies

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Create new secure policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Optional: Create a more restrictive policy if you want users to only see their own profile
-- Uncomment the lines below and comment the policy above if you prefer this approach:
-- CREATE POLICY "Users can view their own profile" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (auth.uid() = id);