
export type OrderStatus = 'pending_payment' | 'payment_confirmed' | 'processing' | 'verified' | 'on_delivery' | 'in_delivery' | 'delivered' | 'cancelled' | 'refunded';

export interface BaseOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  whatsapp_number: string | null;
  delivery_address: string;
  total_amount: number;
  subtotal: number;
  delivery_charge: number;
  paid_amount: number;
  remaining_amount: number;
  payment_percentage: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  pricing_breakdown?: any;
}

export interface OrderItem {
  id: string;
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  pricing_mode: string;
  pricing_details?: any;
}
