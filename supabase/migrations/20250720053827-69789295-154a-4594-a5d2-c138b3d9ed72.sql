-- Update the handle_new_user function to extract Google profile data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      CONCAT(
        new.raw_user_meta_data->>'first_name', 
        ' ', 
        new.raw_user_meta_data->>'last_name'
      ),
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$function$;