
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hash column
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin_hash text;

-- Migrate existing plaintext PINs to bcrypt hashes
UPDATE public.staff
   SET pin_hash = crypt(pin, gen_salt('bf'))
 WHERE pin IS NOT NULL AND pin_hash IS NULL;

-- Add has_pin generated column for safe client display
ALTER TABLE public.staff DROP COLUMN IF EXISTS has_pin;
ALTER TABLE public.staff
  ADD COLUMN has_pin boolean GENERATED ALWAYS AS (pin_hash IS NOT NULL) STORED;

-- Column-level privileges: hide pin and pin_hash from client roles
REVOKE SELECT ON public.staff FROM anon, authenticated;
GRANT SELECT (id, name, role, active, created_at, has_pin) ON public.staff TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.staff TO anon, authenticated;

-- Verify a staff PIN and return safe fields on success
CREATE OR REPLACE FUNCTION public.verify_staff_pin(_staff_id uuid, _pin text)
RETURNS TABLE(id uuid, name text, role text, active boolean, has_pin boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role, s.active, (s.pin_hash IS NOT NULL) AS has_pin
    FROM public.staff s
   WHERE s.id = _staff_id
     AND s.active = true
     AND (
       s.pin_hash IS NULL
       OR (_pin IS NOT NULL AND s.pin_hash = crypt(_pin, s.pin_hash))
     );
END;
$$;

-- Change a staff PIN; verifies old PIN when one is set
CREATE OR REPLACE FUNCTION public.set_staff_pin(_staff_id uuid, _old_pin text, _new_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_hash text;
BEGIN
  IF _new_pin IS NULL OR _new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  SELECT pin_hash INTO cur_hash FROM public.staff WHERE id = _staff_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  IF cur_hash IS NOT NULL THEN
    IF _old_pin IS NULL OR cur_hash <> crypt(_old_pin, cur_hash) THEN
      RAISE EXCEPTION 'Current PIN is incorrect';
    END IF;
  END IF;

  UPDATE public.staff
     SET pin_hash = crypt(_new_pin, gen_salt('bf')),
         pin = NULL
   WHERE id = _staff_id;
  RETURN true;
END;
$$;

-- Create a new staff member with a hashed PIN
CREATE OR REPLACE FUNCTION public.create_staff_with_pin(_name text, _role text, _pin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.verify_staff_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_with_pin(text, text, text) TO anon, authenticated;
