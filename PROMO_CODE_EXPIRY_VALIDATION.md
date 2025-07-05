# Promo Code Expiry Date Validation

## Overview
This document describes the implementation of promo code expiry date validation in the checkout process. The system now checks if a promo code has expired and provides specific feedback to users about when the promo code expired.

## Changes Made

### 1. Updated `usePromoCode` Hook (`src/hooks/usePromoCode.tsx`)
- Added `valid_from` and `valid_until` fields to the `PromoCode` interface
- Implemented date validation logic in the `applyPromoCode` function
- Added specific error messages for:
  - Promo codes that haven't become active yet
  - Promo codes that have expired (showing the specific expiry date)

### 2. Updated `CheckoutValidation` Component (`src/components/checkout/CheckoutValidation.tsx`)
- Enhanced the `validatePromoCode` function to show the specific expiry date
- Changed error message from "Promo code has expired" to "Promo code expired on [date]"

### 3. Updated Interface Definitions
- Updated `PromoCode` interfaces in:
  - `src/components/checkout/PromoCodeSection.tsx`
  - `src/components/checkout/OrderSummaryCard.tsx`
- Added `valid_from` and `valid_until` fields for consistency

## Validation Logic

The system now performs the following checks when a promo code is applied:

1. **Existence Check**: Verifies the promo code exists and is active
2. **Start Date Check**: If `valid_from` is set, checks if the current date is after the start date
3. **Expiry Date Check**: If `valid_until` is set, checks if the current date is before the expiry date
4. **Minimum Order Check**: Validates the order total meets the minimum requirement

## Error Messages

### For Expired Promo Codes
- **Title**: "Promo Code Expired"
- **Description**: "This promo code expired on [MM/DD/YYYY]"

### For Future Promo Codes
- **Title**: "Promo Code Not Yet Active"
- **Description**: "This promo code will be active from [MM/DD/YYYY]"

## Database Schema

The promo codes table includes the following date fields:
- `valid_from`: TIMESTAMP WITH TIME ZONE (when the promo code becomes active)
- `valid_until`: TIMESTAMP WITH TIME ZONE (when the promo code expires)

## Usage

The validation is automatically triggered when:
1. A user enters a promo code in the checkout process
2. The checkout validation runs before order submission
3. Any component calls the `applyPromoCode` function

## Example

```typescript
// When a user enters an expired promo code
const result = await applyPromoCode(totalAmount);
// Shows toast: "Promo Code Expired" with "This promo code expired on 12/31/2023"
```

## Testing

To test the expiry validation:
1. Create a promo code with a past expiry date in the admin panel
2. Try to apply it during checkout
3. Verify the specific expiry date is shown in the error message

## Files Modified

- `src/hooks/usePromoCode.tsx` - Main validation logic
- `src/components/checkout/CheckoutValidation.tsx` - Enhanced error messages
- `src/components/checkout/PromoCodeSection.tsx` - Interface update
- `src/components/checkout/OrderSummaryCard.tsx` - Interface update 