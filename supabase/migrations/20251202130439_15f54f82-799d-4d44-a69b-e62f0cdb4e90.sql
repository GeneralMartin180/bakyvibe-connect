-- Fix profiles table: restrict to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Fix likes table: restrict to authenticated users only
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

CREATE POLICY "Likes are viewable by authenticated users"
ON public.likes FOR SELECT
TO authenticated
USING (true);