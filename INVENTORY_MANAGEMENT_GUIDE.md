# Inventory Management System - Complete Guide

## Overview

This document provides a comprehensive guide to the inventory management system implemented for the Mozamandu Gear Shop e-commerce platform. The system provides centralized inventory management with automatic stock tracking, real-time updates, and comprehensive reporting.

## 🏗️ System Architecture

### Database Schema

The inventory system is built around the `product_inventory` table which centralizes all stock management:

```sql
CREATE TABLE public.product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  
  -- Variant Information
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE,
  size_variant_id UUID REFERENCES public.size_variants(id) ON DELETE CASCADE,
  
  -- Product Details (denormalized for performance)
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  size_code TEXT,
  
  -- Stock Management
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_stock) STORED,
  
  -- Pricing
  cost_price NUMERIC,
  selling_price NUMERIC,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Key Features

1. **Centralized Inventory Management**: All stock data is stored in one table
2. **Automatic Stock Calculation**: `available_stock` is automatically calculated
3. **Variant Support**: Handles products with color and size variants
4. **Real-time Updates**: Live inventory updates via Supabase real-time
5. **Stock Reservation**: Automatic stock reservation during checkout
6. **Audit Trail**: Complete history of inventory changes
7. **Low Stock Alerts**: Automatic notifications for low stock items

## 🔧 Setup Instructions

### 1. Database Migration

Run the latest migration to set up the inventory system:

```bash
supabase db push
```

This will create:
- `product_inventory` table
- RLS policies for security
- Triggers for automatic stock management
- Functions for inventory operations
- Audit trail system

### 2. Frontend Integration

The inventory system is integrated into the admin panel at `/admin/inventory`. The main components are:

- `InventoryManagement.tsx` - Main inventory management page
- `InventoryVariantForm.tsx` - Inventory management within product forms
- `inventoryManager.ts` - Utility functions for inventory operations

### 3. Real-time Setup

Real-time subscriptions are automatically configured for:
- Inventory changes
- Stock updates
- Order status changes

## 📊 Inventory Management Features

### 1. Dashboard Overview

The inventory dashboard provides:
- Total inventory items count
- Active items count
- Low stock alerts (≤10 items)
- Out of stock items
- Total stock value

### 2. Advanced Filtering

Filter inventory by:
- **Search**: Product name, SKU, color, size
- **Category**: Filter by product category
- **Subcategory**: Filter by product subcategory
- **Stock Status**: In stock, low stock, out of stock
- **Status**: Active or inactive items

### 3. Inline Editing

Edit inventory items directly from the table:
- Stock quantity updates
- Cost price adjustments
- Selling price modifications
- Status changes

### 4. Stock Management

#### Automatic Stock Operations

The system automatically handles:

1. **Order Creation**: Reserves stock when orders are created
2. **Order Updates**: Adjusts reserved stock when order quantities change
3. **Order Cancellation**: Releases reserved stock when orders are cancelled
4. **Order Completion**: Converts reserved stock to actual stock reduction

#### Manual Stock Operations

Admins can manually:
- Update stock quantities
- Adjust reserved stock
- Set cost and selling prices
- Activate/deactivate inventory items

### 5. Stock Validation

The system validates stock availability:
- Prevents overselling
- Checks stock before order creation
- Validates stock during checkout
- Provides real-time stock status

## 🔄 Workflow Integration

### Product Creation

When a new product is created:

1. **Base Product**: Creates inventory item for the base product
2. **Color Variants**: Creates inventory items for each color variant
3. **Size Variants**: Creates inventory items for each size variant
4. **SKU Generation**: Automatically generates unique SKUs
5. **Stock Initialization**: Sets initial stock quantities

### Order Processing

The order workflow integrates with inventory:

1. **Cart Addition**: Validates stock availability
2. **Checkout**: Reserves stock for the order
3. **Payment**: Maintains stock reservation
4. **Order Completion**: Reduces actual stock
5. **Cancellation**: Releases reserved stock

### Stock Updates

Stock can be updated through:

1. **Admin Panel**: Manual updates via inventory management
2. **Product Forms**: Updates during product editing
3. **API Calls**: Programmatic updates
4. **Bulk Operations**: Mass updates for multiple items

## 🛡️ Security & Permissions

### Row Level Security (RLS)

The inventory system uses RLS policies:

```sql
-- Admins can manage all inventory
CREATE POLICY "Admins can manage all inventory"
  ON public.product_inventory
  FOR ALL
  USING (is_admin());

-- Anyone can view active inventory
CREATE POLICY "Anyone can view active inventory"
  ON public.product_inventory
  FOR SELECT
  USING (is_active = true);

-- Service role can update stock during order processing
CREATE POLICY "Service role can update inventory stock"
  ON public.product_inventory
  FOR UPDATE
  USING (auth.role() = 'service_role');
```

### Access Control

- **Admins**: Full access to all inventory operations
- **Customers**: Read-only access to active inventory
- **Service Role**: Stock update permissions for order processing

## 📈 Analytics & Reporting

### Inventory Analytics

The system provides comprehensive analytics:

```typescript
interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
  total_available_stock: number;
  total_reserved_stock: number;
}
```

### Low Stock Alerts

Get alerts for items with low stock:

```typescript
const lowStockAlerts = await getLowStockAlerts(10); // Items with ≤10 stock
```

### Stock Value Calculation

Calculate total inventory value:

```typescript
const totalValue = calculateInventoryValue(inventoryItems);
```

## 🔧 API Functions

### Core Functions

```typescript
// Get product inventory
const inventory = await getProductInventory(productId);

// Get inventory summary
const summary = await getInventorySummary(productId);

// Sync product to inventory
await syncProductToInventory(productId);

// Update inventory item
await updateInventoryItem(inventoryId, updates);

// Check stock availability
const availability = await checkStockAvailability(productId, colorId, sizeId, quantity);
```

### Real-time Subscriptions

```typescript
// Subscribe to inventory changes
const subscription = subscribeToInventoryChanges(productId, (payload) => {
  console.log('Inventory updated:', payload);
});

// Subscribe to all inventory changes
const allChanges = subscribeToAllInventoryChanges((payload) => {
  console.log('Any inventory changed:', payload);
});
```

## 🚀 Migration from Old System

### Automatic Migration

The system includes an automatic migration function:

```sql
SELECT public.migrate_to_product_inventory();
```

This function:
1. Reads existing product data
2. Creates inventory items for all variants
3. Generates unique SKUs
4. Preserves existing stock quantities
5. Maintains pricing information

### Manual Migration

For custom migration scenarios:

```typescript
// Sync individual products
await syncProductToInventory(productId);

// Bulk sync multiple products
for (const productId of productIds) {
  await syncProductToInventory(productId);
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Inventory Page Blank**
   - Check if the route is properly configured in `Admin.tsx`
   - Verify the `InventoryManagement` component is imported
   - Check browser console for errors

2. **Stock Not Updating**
   - Verify RLS policies are correctly set
   - Check if user has admin permissions
   - Ensure triggers are properly installed

3. **Real-time Not Working**
   - Verify Supabase real-time is enabled
   - Check subscription setup
   - Ensure proper channel configuration

4. **SKU Conflicts**
   - The system automatically handles SKU conflicts
   - SKUs are generated with uniqueness checks
   - Manual SKU updates are supported

### Debug Tools

1. **Database Queries**
   ```sql
   -- Check inventory items
   SELECT * FROM product_inventory WHERE product_id = 'your-product-id';
   
   -- Check stock summary
   SELECT * FROM get_product_inventory_summary('your-product-id');
   
   -- Check low stock alerts
   SELECT * FROM get_low_stock_alerts(10);
   ```

2. **Frontend Debug**
   ```typescript
   // Enable debug logging
   console.log('Inventory data:', inventoryItems);
   console.log('Stock summary:', summary);
   ```

## 📋 Best Practices

### Inventory Management

1. **Regular Stock Checks**: Monitor low stock alerts regularly
2. **Accurate Pricing**: Keep cost and selling prices updated
3. **Stock Validation**: Always validate stock before order creation
4. **Audit Trail**: Review inventory changes through audit logs

### Performance Optimization

1. **Indexes**: Database indexes are automatically created for performance
2. **Denormalization**: Product details are denormalized for faster queries
3. **Real-time**: Use real-time subscriptions for live updates
4. **Caching**: Consider caching frequently accessed inventory data

### Security

1. **RLS Policies**: All inventory operations are protected by RLS
2. **Input Validation**: Validate all inventory updates
3. **Audit Logging**: All changes are logged for security
4. **Permission Checks**: Verify user permissions before operations

## 🔮 Future Enhancements

### Planned Features

1. **Barcode Integration**: Support for barcode scanning
2. **Supplier Management**: Track inventory from suppliers
3. **Reorder Points**: Automatic reorder notifications
4. **Inventory Forecasting**: Predict stock needs
5. **Multi-location Support**: Support for multiple warehouses
6. **Batch Operations**: Bulk inventory updates
7. **Export/Import**: CSV import/export functionality

### Integration Opportunities

1. **Accounting Systems**: Integration with accounting software
2. **Shipping Providers**: Real-time stock updates to shipping systems
3. **Marketplace Integration**: Sync inventory across multiple platforms
4. **Analytics Platforms**: Enhanced reporting and analytics

## 📞 Support

For technical support or questions about the inventory management system:

1. Check this documentation first
2. Review the database migrations
3. Check the browser console for errors
4. Verify Supabase configuration
5. Contact the development team

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready 