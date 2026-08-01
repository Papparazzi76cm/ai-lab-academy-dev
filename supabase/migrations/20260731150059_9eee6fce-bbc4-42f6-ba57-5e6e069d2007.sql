DROP POLICY IF EXISTS "Published courses public read" ON public.courses;
CREATE POLICY "Published courses public read" ON public.courses FOR SELECT
USING (status = 'published');

CREATE POLICY "Admins read all courses" ON public.courses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;