
-- STAFF
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  pin text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO anon, authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  barcode text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  total_purchase numeric(12,2) NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  due numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  price numeric(12,2) NOT NULL,
  quantity integer NOT NULL,
  total numeric(12,2) NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO anon, authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- Seed staff
INSERT INTO public.staff (name, role, pin) VALUES
  ('Admin', 'admin', '1234'),
  ('Salesman', 'salesman', '0000');

-- Seed sample products
INSERT INTO public.products (name, category, barcode, price, cost, stock) VALUES
  ('Premium Cotton Shirt', 'Shirt', 'SH001', 1200, 800, 25),
  ('Formal White Shirt', 'Shirt', 'SH002', 1500, 1000, 18),
  ('Slim Fit Pant', 'Pant', 'PN001', 1800, 1200, 30),
  ('Classic Chino Pant', 'Pant', 'PN002', 1600, 1100, 22),
  ('Round Neck T-Shirt', 'T-Shirt', 'TS001', 550, 300, 50),
  ('Graphic T-Shirt', 'T-Shirt', 'TS002', 650, 350, 4),
  ('Polo Sport', 'Polo', 'PO001', 950, 600, 35),
  ('Classic Polo', 'Polo', 'PO002', 1100, 700, 12),
  ('Blue Denim Jeans', 'Jeans', 'JN001', 2200, 1500, 20),
  ('Black Slim Jeans', 'Jeans', 'JN002', 2400, 1600, 0),
  ('Kids T-Shirt', 'Kids Collection', 'KD001', 400, 220, 40),
  ('Kids Jeans', 'Kids Collection', 'KD002', 1200, 800, 15);
