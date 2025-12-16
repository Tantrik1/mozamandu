import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  ChevronRight,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Package,
  Check,
  Zap,
  Heart,
  Share2,
  Home as HomeIcon,
  Eye,
  X,
  Sparkles,
  Clock,
  BadgeCheck
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  category_id: string;
  subcategory_id: string;
  status: string;
}

interface ColorVariant {
  id: string;
  color_name: string;
  has_sizes: boolean;
  image_url: string | null;
}

interface SizeVariant {
  id: string;
  size_name: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface Subcategory {
  id: string;
  name: string;
  selling_price: number;
  minimum_quantity: number;
  description: string | null;
  category: {
    id: string;
    name: string;
  } | null;
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [productStock, setProductStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const { addToCart, cartItems } = useRobustCart();

  // Build image gallery
  const images: string[] = [];
  if (product?.image_url) images.push(product.image_url);
  additionalImages.forEach(img => {
    if (!images.includes(img)) images.push(img);
  });
  colorVariants.forEach(cv => {
    if (cv.image_url && !images.includes(cv.image_url)) {
      images.push(cv.image_url);
    }
  });

  const getCartQuantity = () => {
    const cartItem = cartItems.find(item => {
      const productMatch = item.productId === product?.id;
      const colorMatch = item.colorVariantId === (selectedColor || null);
      const sizeMatch = item.sizeVariantId === (selectedSize || null);
      
      if (!product?.has_color_variants) {
        return productMatch && !item.colorVariantId && !item.sizeVariantId;
      }
      if (product?.has_color_variants && !product?.color_has_size_variants) {
        return productMatch && colorMatch && !item.sizeVariantId;
      }
      if (product?.has_color_variants && product?.color_has_size_variants) {
        return productMatch && colorMatch && sizeMatch;
      }
      return productMatch;
    });
    return cartItem?.quantity || 0;
  };

  const currentCartQuantity = getCartQuantity();

  const mockCartItem = product ? {
    id: 'mock',
    productId: product.id,
    productName: product.name,
    quantity: Math.max(currentCartQuantity + quantity, 1),
    basePrice: product.selling_price || subcategory?.selling_price || 0,
    subcategoryId: product.subcategory_id,
    colorVariantId: selectedColor || null,
    sizeVariantId: selectedSize || null,
    addedOrder: 999,
  } : null;

  const { getItemPricing } = useSubcategoryTieredPricing({
    cartItems: mockCartItem ? [mockCartItem] : [],
    discountTiers
  });

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  useEffect(() => {
    if (selectedColor && product?.color_has_size_variants) {
      fetchSizeVariants(selectedColor);
    }
  }, [selectedColor, product?.color_has_size_variants]);

  useEffect(() => {
    if (selectedColor) {
      const colorVariant = colorVariants.find(cv => cv.id === selectedColor);
      if (colorVariant?.image_url) {
        const imageIndex = images.indexOf(colorVariant.image_url);
        if (imageIndex !== -1) {
          setCurrentImageIndex(imageIndex);
        }
      }
    }
  }, [selectedColor, colorVariants, images]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*, category:categories(id, name)')
        .eq('id', productData.subcategory_id)
        .single();

      if (!subcategoryError && subcategoryData) {
        setSubcategory(subcategoryData);
      }

      const { data: tiersData } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', productData.subcategory_id)
        .order('min_quantity');

      if (tiersData) {
        setDiscountTiers({ [productData.subcategory_id]: tiersData });
      }

      if (productData.has_color_variants) {
        const { data: colorsData } = await supabase
          .from('color_variants')
          .select('id, color_name, has_sizes, image_url')
          .eq('product_id', productId);

        if (colorsData && colorsData.length > 0) {
          setColorVariants(colorsData);
          setSelectedColor(colorsData[0].id);
        }
      }

      const { data: additionalImagesData } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', productId)
        .eq('is_primary', false)
        .order('created_at');

      if (additionalImagesData) {
        setAdditionalImages(additionalImagesData.map(img => img.image_url));
      }

      const stock = await getProductStockSummary(productId!);
      setProductStock(stock);

    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSizeVariants = async (colorVariantId: string) => {
    try {
      const { data, error } = await supabase
        .from('size_variants')
        .select('id, size_name')
        .eq('color_variant_id', colorVariantId);

      if (error) throw error;
      setSizeVariants(data || []);
      if (data && data.length > 0) {
        setSelectedSize(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching size variants:', error);
    }
  };

  const basePrice = product?.selling_price || subcategory?.selling_price || 0;
  
  const getMarginalPrice = () => {
    const totalSubcategoryQuantity = cartItems
      .filter(item => item.subcategoryId === product?.subcategory_id)
      .reduce((total, item) => total + item.quantity, 0);
    
    const tiers = discountTiers[product?.subcategory_id || ''] || [];
    const sortedTiers = tiers.sort((a, b) => a.min_quantity - b.min_quantity);
    
    let applicableTier = null;
    for (const tier of sortedTiers) {
      if (totalSubcategoryQuantity + quantity >= tier.min_quantity && 
          (tier.max_quantity === null || totalSubcategoryQuantity + quantity <= tier.max_quantity)) {
        applicableTier = tier;
      }
    }
    
    if (applicableTier) {
      return basePrice - applicableTier.discount_amount;
    }
    return basePrice;
  };

  const marginalPrice = getMarginalPrice();
  const totalPrice = marginalPrice * quantity;
  const savings = basePrice > marginalPrice ? (basePrice - marginalPrice) * quantity : 0;
  const discountPercent = basePrice > marginalPrice ? Math.round((1 - marginalPrice / basePrice) * 100) : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    
    setActionLoading(true);
    try {
      await addToCart({
        productId: product.id,
        productName: product.name,
        quantity,
        colorVariantId: selectedColor || undefined,
        sizeVariantId: selectedSize || undefined,
        unitPrice: product.selling_price || subcategory?.selling_price || 0,
      });
      
      toast({
        title: 'Added to Cart',
        description: `${quantity} ${product.name} added to your cart`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/checkout');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-3xl animate-pulse" />
              <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-20 h-20 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
              <div className="h-14 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-24 h-24 bg-muted rounded-full mx-auto flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or doesn't exist.</p>
          <Button onClick={() => navigate('/')} size="lg" className="rounded-full">
            <HomeIcon className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      
      {/* Breadcrumb */}
      <div className="border-b border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 shrink-0">
              <HomeIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            {subcategory?.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <Link 
                  to={`/categories/${subcategory.category.id}`} 
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  {subcategory.category.name}
                </Link>
              </>
            )}
            {subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <Link 
                  to={`/subcategories/${subcategory.id}`} 
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  {subcategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-medium truncate max-w-[150px] sm:max-w-[250px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          
          {/* Image Gallery */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Main Image with Zoom */}
            <div 
              ref={imageRef}
              className="relative aspect-square bg-gradient-to-br from-muted/30 to-muted/60 rounded-2xl lg:rounded-3xl overflow-hidden cursor-zoom-in group"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img 
                src={images[currentImageIndex] || '/placeholder.svg'} 
                alt={product.name}
                className={cn(
                  "w-full h-full object-contain transition-transform duration-200",
                  isZoomed && "scale-150"
                )}
                style={isZoomed ? {
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                } : undefined}
              />
              
              {/* Zoom Hint */}
              <div className="absolute bottom-4 left-4 bg-foreground/80 text-background text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Hover to zoom
              </div>

              {/* Top Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.is_featured && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1" /> Featured
                  </Badge>
                )}
                {discountPercent > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground shadow-lg">
                    -{discountPercent}%
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button 
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all",
                    isWishlisted 
                      ? "bg-destructive text-destructive-foreground" 
                      : "bg-background/95 backdrop-blur-sm hover:bg-background text-foreground"
                  )}
                >
                  <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
                </button>
                <button className="w-10 h-10 bg-background/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-foreground/80 text-background text-xs px-3 py-1.5 rounded-full">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all",
                      currentImageIndex === index 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category & Title */}
            <div>
              {subcategory && (
                <Link 
                  to={`/subcategories/${subcategory.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium mb-2"
                >
                  {subcategory.name}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Stock & Shipping Info */}
            <div className="flex flex-wrap items-center gap-3">
              {productStock > 0 ? (
                productStock <= 5 ? (
                  <div className="inline-flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/50 px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4" />
                    Only {productStock} left!
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 px-3 py-1.5 rounded-full">
                    <BadgeCheck className="w-4 h-4" />
                    In Stock
                  </div>
                )
              ) : (
                <div className="inline-flex items-center gap-1.5 text-sm text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
                  <X className="w-4 h-4" />
                  Out of Stock
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" />
                Free shipping
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-2xl p-5 sm:p-6 border border-border/50">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-foreground">
                  Rs. {marginalPrice.toFixed(0)}
                </span>
                {savings > 0 && (
                  <span className="text-lg text-muted-foreground line-through mb-1">
                    Rs. {basePrice.toFixed(0)}
                  </span>
                )}
              </div>
              
              {savings > 0 && (
                <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  You save Rs. {savings.toFixed(0)} on this order!
                </p>
              )}

              {/* Volume Discount Tiers */}
              {discountTiers[product.subcategory_id]?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Buy More, Save More!
                  </p>
                  <div className="grid gap-2">
                    {discountTiers[product.subcategory_id].map((tier, index) => (
                      <div 
                        key={tier.id} 
                        className={cn(
                          "flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors",
                          index === 0 ? "bg-primary/5 border border-primary/20" : "bg-background/50"
                        )}
                      >
                        <span className="text-muted-foreground">
                          Buy {tier.min_quantity}+ items
                        </span>
                        <span className="font-semibold text-green-600">
                          Save Rs. {tier.discount_amount}/item
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Color Selection */}
            {product.has_color_variants && colorVariants.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  Color: <span className="font-normal text-muted-foreground">{colorVariants.find(c => c.id === selectedColor)?.color_name}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorVariants.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={cn(
                        "relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all",
                        selectedColor === color.id 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {color.image_url ? (
                        <img src={color.image_url} alt={color.color_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {color.color_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {selectedColor === color.id && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.color_has_size_variants && sizeVariants.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  Size: <span className="font-normal text-muted-foreground">{sizeVariants.find(s => s.id === selectedSize)?.size_name}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeVariants.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={cn(
                        "min-w-[44px] h-11 px-4 rounded-lg font-medium text-sm transition-all",
                        selectedSize === size.id 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                      )}
                    >
                      {size.size_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="space-y-4 pt-2">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground">Quantity:</span>
                <div className="flex items-center bg-muted rounded-lg overflow-hidden border border-border">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-11 h-11 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-base tabular-nums">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(productStock, quantity + 1))}
                    disabled={quantity >= productStock}
                    className="w-11 h-11 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {productStock > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {productStock} available
                  </span>
                )}
              </div>

              {/* Total for Quantity */}
              {quantity > 1 && (
                <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total for {quantity} items:</span>
                  <span className="text-xl font-bold text-foreground">Rs. {totalPrice.toFixed(0)}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={actionLoading || productStock === 0}
                  variant="outline"
                  className="h-12 sm:h-14 text-base font-semibold rounded-xl border-2 hover:bg-muted"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={actionLoading || productStock === 0}
                  className="h-12 sm:h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Buy Now
                </Button>
              </div>

              {currentCartQuantity > 0 && (
                <p className="text-sm text-center text-muted-foreground bg-muted/30 rounded-lg py-2.5 flex items-center justify-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  {currentCartQuantity} already in cart
                </p>
              )}
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="pt-4 border-t border-border/50">
                <h3 className="text-base font-semibold text-foreground mb-3">About this item</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                  {product.description}
                </p>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                { icon: Truck, title: "Fast Delivery", subtitle: "Within Nepal" },
                { icon: Shield, title: "Quality Assured", subtitle: "100% Original" },
                { icon: RefreshCw, title: "Easy Exchange", subtitle: "Within 2 days" },
                { icon: Package, title: "Secure Packaging", subtitle: "Safe delivery" },
              ].map((badge, index) => (
                <div key={index} className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <badge.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{badge.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{badge.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 lg:hidden z-50">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground">Rs. {marginalPrice.toFixed(0)}</p>
            {discountPercent > 0 && (
              <p className="text-xs text-green-600">{discountPercent}% off</p>
            )}
          </div>
          <Button 
            onClick={handleAddToCart}
            disabled={actionLoading || productStock === 0}
            variant="outline"
            className="h-11 px-4 rounded-xl font-semibold"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleBuyNow}
            disabled={actionLoading || productStock === 0}
            className="h-11 px-6 rounded-xl font-semibold"
          >
            Buy Now
          </Button>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />

      <Footer />
    </div>
  );
}
