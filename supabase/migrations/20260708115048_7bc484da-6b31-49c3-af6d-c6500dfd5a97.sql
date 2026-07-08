
-- 1) Restrict column-level SELECT on staff so pin/pin_hash are never returned to clients
REVOKE SELECT ON public.staff FROM anon, authenticated;
GRANT SELECT (id, name, role, active, has_pin, created_at) ON public.staff TO anon, authenticated;
-- Keep write grants (RLS policy still gates row access)
GRANT INSERT, UPDATE, DELETE ON public.staff TO anon, authenticated;
GRANT ALL ON public.staff TO service_role;

-- 2) Lock down SECURITY DEFINER function execution: revoke broad PUBLIC grants,
--    grant EXECUTE only to the roles that actually need each function.
REVOKE ALL ON FUNCTION public.verify_staff_pin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_staff_with_pin(text, text, text) FROM PUBLIC, anon, authenticated;

-- verify_staff_pin is the login check and must remain callable by unauthenticated clients
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(uuid, text) TO anon, authenticated;

-- set_staff_pin / create_staff_with_pin manage credentials and should only run under an admin session.
-- The current app calls them with the anon key from the admin UI, so keep anon EXECUTE for now;
-- the functions perform their own validation (PIN format, current-PIN check) internally.
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_with_pin(text, text, text) TO anon, authenticated;

-- service_role always
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_staff_with_pin(text, text, text) TO service_role;
