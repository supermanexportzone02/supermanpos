CREATE OR REPLACE FUNCTION public.set_staff_pin(_staff_id uuid, _old_pin text, _new_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF _new_pin IS NULL OR _new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
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
$function$;