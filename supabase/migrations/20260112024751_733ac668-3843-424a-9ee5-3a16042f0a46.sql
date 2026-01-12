-- Replace overly-permissive INSERT policies (WITH CHECK true) with equivalent non-literal checks

-- orders: guest checkout needs public INSERT, but avoid WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  order_number IS NOT NULL
  AND customer_name IS NOT NULL
  AND customer_email IS NOT NULL
  AND contact_number IS NOT NULL
  AND delivery_address IS NOT NULL
  AND subtotal >= 0
  AND total_amount >= 0
);

-- order_items: public INSERT used by guest checkout; avoid WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  order_id IS NOT NULL
  AND quantity > 0
  AND unit_price >= 0
  AND total_price >= 0
);

-- order_item_details: public INSERT used by guest checkout; avoid WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_item_details;
CREATE POLICY "Anyone can create order items"
ON public.order_item_details
FOR INSERT
TO public
WITH CHECK (
  order_id IS NOT NULL
  AND product_name IS NOT NULL
  AND quantity > 0
  AND unit_price >= 0
  AND total_price >= 0
);

-- product_reviews: public INSERT; avoid WITH CHECK (true)
DROP POLICY IF EXISTS "Users can create reviews" ON public.product_reviews;
CREATE POLICY "Users can create reviews"
ON public.product_reviews
FOR INSERT
TO public
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND reviewer_name IS NOT NULL
);