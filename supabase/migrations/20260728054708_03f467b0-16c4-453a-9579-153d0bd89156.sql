DROP FUNCTION IF EXISTS public.create_staff_with_pin(text, text, text);
DROP FUNCTION IF EXISTS public.set_staff_pin(uuid, text, text);

CREATE OR REPLACE FUNCTION public.is_staff_admin(_actor_id uuid, _actor_pin text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = _actor_id
      AND s.active = true
      AND s.role IN ('admin','owner')
      AND s.pin_hash IS NOT NULL
      AND _actor_pin IS NOT NULL
      AND s.pin_hash = crypt(_actor_pin, s.pin_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.create_staff_with_pin(_actor_id uuid, _actor_pin text, _name text, _role text, _pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_staff_admin(_actor_id, _actor_pin) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Name required';
  END IF;
  IF _pin IS NULL OR _pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  INSERT INTO public.staff(name, role, pin_hash, active)
  VALUES (trim(_name), coalesce(_role,'cashier'), crypt(_pin, gen_salt('bf')), true)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_pin(_actor_id uuid, _actor_pin text, _staff_id uuid, _new_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  actor_ok boolean := false;
  actor_hash text;
BEGIN
  IF _new_pin IS NULL OR _new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  IF public.is_staff_admin(_actor_id, _actor_pin) THEN
    actor_ok := true;
  ELSIF _actor_id = _staff_id THEN
    SELECT pin_hash INTO actor_hash FROM public.staff WHERE id = _actor_id AND active = true;
    actor_ok := actor_hash IS NOT NULL AND _actor_pin IS NOT NULL AND actor_hash = crypt(_actor_pin, actor_hash);
  END IF;

  IF NOT actor_ok THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = _staff_id) THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  UPDATE public.staff
     SET pin_hash = crypt(_new_pin, gen_salt('bf')),
         pin = NULL
   WHERE id = _staff_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_staff_with_pin(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_staff_with_pin(uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text, uuid, text) TO anon, authenticated;