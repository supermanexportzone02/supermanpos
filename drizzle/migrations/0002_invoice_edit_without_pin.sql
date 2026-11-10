CREATE OR REPLACE FUNCTION public.update_sale_by_staff(
  _sale_id uuid, _invoice_no text, _customer_id uuid, _subtotal numeric, _discount numeric,
  _total numeric, _paid numeric, _due numeric, _created_at timestamptz, _items jsonb, _actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = _actor_id AND s.active = true AND lower(s.role) IN ('admin','manager','owner')
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit invoices';
  END IF;
  PERFORM public.update_sale_with_items(_sale_id, _invoice_no, _customer_id, _subtotal, _discount, _total, _paid, _due, _created_at, _items);
END;
$$;
REVOKE ALL ON FUNCTION public.update_sale_by_staff(uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sale_by_staff(uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz, jsonb, uuid) TO anon, authenticated;