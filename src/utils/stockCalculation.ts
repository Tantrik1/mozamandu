
export interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  stock_quantity?: number;
  size_variants?: SizeVariant[];
}

export interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
}

export const calculateProductStock = (
  hasColorVariants: boolean,
  hasSizeVariants: boolean,
  baseStock: number,
  colorVariants: ColorVariant[] = []
): number => {
  // If no variants, use base stock
  if (!hasColorVariants && !hasSizeVariants) {
    return baseStock;
  }

  // If has color and size variants, sum all size variant stocks
  if (hasColorVariants && hasSizeVariants) {
    return colorVariants.reduce((total, colorVariant) => {
      const sizeStocks = colorVariant.size_variants?.reduce((sum, sizeVariant) => {
        return sum + (sizeVariant.stock_quantity || 0);
      }, 0) || 0;
      return total + sizeStocks;
    }, 0);
  }

  // If has only color variants, sum color variant stocks
  if (hasColorVariants && !hasSizeVariants) {
    return colorVariants.reduce((total, colorVariant) => {
      return total + (colorVariant.stock_quantity || 0);
    }, 0);
  }

  return baseStock;
};

export const validateVariants = (
  hasColorVariants: boolean,
  hasSizeVariants: boolean,
  colorVariants: ColorVariant[]
): string[] => {
  const errors: string[] = [];

  if (!hasColorVariants && !hasSizeVariants) {
    return errors;
  }

  if (hasColorVariants && colorVariants.length === 0) {
    errors.push('At least one color variant is required when color variants are enabled');
    return errors;
  }

  colorVariants.forEach((colorVariant, colorIndex) => {
    if (hasColorVariants && !colorVariant.color_name.trim()) {
      errors.push(`Color variant ${colorIndex + 1} must have a name`);
    }

    if (hasSizeVariants) {
      if (!colorVariant.size_variants || colorVariant.size_variants.length === 0) {
        errors.push(`Color variant ${colorIndex + 1} must have at least one size when size variants are enabled`);
      } else {
        colorVariant.size_variants.forEach((sizeVariant, sizeIndex) => {
          if (!sizeVariant.size_name.trim()) {
            errors.push(`Size variant ${sizeIndex + 1} in color ${colorIndex + 1} must have a name`);
          }
          if (sizeVariant.stock_quantity < 0) {
            errors.push(`Size variant ${sizeIndex + 1} in color ${colorIndex + 1} cannot have negative stock`);
          }
        });
      }
    } else if (hasColorVariants) {
      if ((colorVariant.stock_quantity || 0) < 0) {
        errors.push(`Color variant ${colorIndex + 1} cannot have negative stock`);
      }
    }
  });

  return errors;
};
