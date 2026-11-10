CREATE OR REPLACE FUNCTION public.update_sale_with_items_authorized(
  _sale_id uuid,
  _invoice_no text,
  _customer_id uuid,
  _subtotal numeric,
  _discount numeric,
  _total numeric,
  _paid numeric,
  _due numeric,
  _created_at timestamptz,
  _items jsonb,
  _actor_id uuid,
  _actor_pin text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old_customer_id uuid;
  v_old_total numeric;
  v_adjustment record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = _actor_id
      AND s.active = true
      AND lower(s.role) IN ('admin', 'manager', 'owner')
      AND s.pin_hash IS NOT NULL
      AND _actor_pin IS NOT NULL
      AND s.pin_hash = crypt(_actor_pin, s.pin_hash)
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit invoices';
  END IF;

  IF _invoice_no IS NULL OR btrim(_invoice_no) = '' THEN
    RAISE EXCEPTION 'Invoice number is required';
  END IF;
  IF _created_at IS NULL OR _subtotal < 0 OR _discount < 0 OR _total < 0 OR _paid < 0 OR _due < 0 THEN
    RAISE EXCEPTION 'Invoice values must be valid and non-negative';
  END IF;
  IF _discount > _subtotal OR _total <> _subtotal - _discount OR _due <> GREATEST(0, _total - _paid) THEN
    RAISE EXCEPTION 'Invoice totals do not match the line items';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'Invoice items must be an array';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(_items) AS item(product_id uuid, product_name text, price numeric, quantity integer)
    WHERE item.product_name IS NULL OR btrim(item.product_name) = ''
       OR item.price IS NULL OR item.price < 0
       OR item.quantity IS NULL OR item.quantity < 1
  ) THEN
    RAISE EXCEPTION 'Invoice items must have a name, non-negative price, and positive quantity';
  END IF;
  IF COALESCE((SELECT SUM(item.price * item.quantity) FROM jsonb_to_recordset(_items) AS item(product_id uuid, product_name text, price numeric, quantity integer)), 0) <> _subtotal THEN
    RAISE EXCEPTION 'Subtotal does not match the invoice items';
  END IF;

  SELECT customer_id, total
    INTO v_old_customer_id, v_old_total
    FROM public.sales
    WHERE id = _sale_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice was not found';
  END IF;

  FOR v_adjustment IN
    SELECT product_id, SUM(quantity_delta)::integer AS quantity_delta
    FROM (
      SELECT product_id, SUM(quantity)::integer AS quantity_delta
      FROM public.sale_items
      WHERE sale_id = _sale_id AND product_id IS NOT NULL
      GROUP BY product_id
      UNION ALL
      SELECT item.product_id, -SUM(item.quantity)::integer AS quantity_delta
      FROM jsonb_to_recordset(_items) AS item(product_id uuid, product_name text, price numeric, quantity integer)
      WHERE item.product_id IS NOT NULL
      GROUP BY item.product_id
    ) AS adjustments
    GROUP BY product_id
  LOOP
    IF v_adjustment.quantity_delta <> 0 THEN
      UPDATE public.products
        SET stock = stock + v_adjustment.quantity_delta
        WHERE id = v_adjustment.product_id
          AND stock + v_adjustment.quantity_delta >= 0;
      IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.products WHERE id = v_adjustment.product_id) THEN
          RAISE EXCEPTION 'Not enough stock to save this invoice';
        END IF;
        RAISE EXCEPTION 'A product on this invoice no longer exists';
      END IF;
    END IF;
  END LOOP;

  IF v_old_customer_id IS NOT DISTINCT FROM _customer_id THEN
    IF _customer_id IS NOT NULL THEN
      UPDATE public.customers
        SET total_purchase = GREATEST(0, total_purchase + _total - v_old_total),
            points = GREATEST(0, points + floor(_total / 100)::integer - floor(v_old_total / 100)::integer)
        WHERE id = _customer_id;
    END IF;
  ELSE
    IF v_old_customer_id IS NOT NULL THEN
      UPDATE public.customers
        SET total_purchase = GREATEST(0, total_purchase - v_old_total),
            points = GREATEST(0, points - floor(v_old_total / 100)::integer)
        WHERE id = v_old_customer_id;
    END IF;
    IF _customer_id IS NOT NULL THEN
      UPDATE public.customers
        SET total_purchase = total_purchase + _total,
            points = points + floor(_total / 100)::integer
        WHERE id = _customer_id;
    END IF;
  END IF;

  UPDATE public.sales
    SET invoice_no = _invoice_no,
        customer_id = _customer_id,
        subtotal = _subtotal,
        discount = _discount,
        total = _total,
        paid = _paid,
        due = _due,
        created_at = _created_at
    WHERE id = _sale_id;

  DELETE FROM public.sale_items WHERE sale_id = _sale_id;
  INSERT INTO public.sale_items (sale_id, product_id, product_name, price, quantity, total)
    SELECT _sale_id, item.product_id, item.product_name, item.price, item.quantity, item.price * item.quantity
    FROM jsonb_to_recordset(_items) AS item(product_id uuid, product_name text, price numeric, quantity integer);
END;
$$;

REVOKE ALL ON FUNCTION public.update_sale_with_items_authorized(uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz, jsonb, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sale_with_items_authorized(uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz, jsonb, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.update_sale_with_items(uuid, text, uuid, numeric, numeric, numeric, numeric, numeric, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;