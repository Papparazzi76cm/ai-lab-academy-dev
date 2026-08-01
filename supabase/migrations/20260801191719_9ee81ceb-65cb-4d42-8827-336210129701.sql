CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _full_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;

  SELECT u.raw_user_meta_data->>'full_name' INTO _full_name
  FROM auth.users u WHERE u.id = _uid;

  INSERT INTO public.profiles (id, full_name)
  VALUES (_uid, _full_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_current_user() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO service_role;