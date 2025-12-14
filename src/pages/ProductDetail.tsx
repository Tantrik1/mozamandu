import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  ChevronLeft, 
  ChevronRight,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Package,
  Check,
  AlertTriangle,
  Zap,
  Heart,
  Share2,
  Home as HomeIcon
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
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [productStock, setProductStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { addToCart, cartItems, updateQuantity, removeFromCart } = useRobustCart();

  // Build image gallery from color variants
  const images: string[] = [];
  if (product?.image_url) images.push(product.image_url);
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

  // Mock cart item for pricing calculation
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

  // Update current image when color is selected
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
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch subcategory with category
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*, category:categories(id, name)')
        .eq('id', productData.subcategory_id)
        .single();

      if (!subcategoryError && subcategoryData) {
        setSubcategory(subcategoryData);
      }

      // Fetch discount tiers
      const { data: tiersData } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', productData.subcategory_id)
        .order('min_quantity');

      if (tiersData) {
        setDiscountTiers({ [productData.subcategory_id]: tiersData });
      }

      // Fetch color variants
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

      // Fetch stock
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-muted rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-12 bg-muted rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CustomerHeader />
      
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <HomeIcon className="w-3.5 h-3.5" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            {subcategory?.category && (
              <>
                <Link 
                  to={`/categories/${subcategory.category.id}`} 
                  className="hover:text-primary transition-colors"
                >
                  {subcategory.category.name}
                </Link>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </>
            )}
            {subcategory && (
              <>
                <Link 
                  to={`/subcategories/${subcategory.id}`} 
                  className="hover:text-primary transition-colors"
                >
                  {subcategory.name}
                </Link>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          
          {/* Image Gallery - Left Side */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-2xl overflow-hidden border border-border/50 shadow-lg group">
              <img 
                src={images[currentImageIndex] || '/placeholder.svg'} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.is_featured && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                    <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                  </Badge>
                )}
                {savings > 0 && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                    Save Rs. {savings.toFixed(0)}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button 
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isWishlisted 
                      ? 'bg-red-500 text-white' 
                      : 'bg-background/90 backdrop-blur-sm hover:bg-background text-foreground'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                <button className="w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      currentImageIndex === index 
                        ? 'border-primary shadow-lg scale-105' 
                        : 'border-border/50 hover:border-primary/50'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info - Right Side */}
          <div className="space-y-6">
            {/* Title & Category */}
            <div>
              {subcategory && (
                <Link 
                  to={`/subcategories/${subcategory.id}`}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {subcategory.name}
                </Link>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-1 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-3">
              {productStock > 0 ? (
                productStock <= 5 ? (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Only {productStock} left - Order soon!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    In Stock ({productStock} available)
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Out of Stock
                </Badge>
              )}
            </div>

            <Separator />

            {/* Pricing */}
            <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-6 border border-border/50">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-bold text-foreground">
                  Rs. {marginalPrice.toFixed(0)}
                </span>
                {savings > 0 && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      Rs. {basePrice.toFixed(0)}
                    </span>
                    <Badge className="bg-red-500 text-white">
                      {Math.round((1 - marginalPrice / basePrice) * 100)}% OFF
                    </Badge>
                  </>
                )}
              </div>
              
              {/* Discount Tiers Info */}
              {discountTiers[product.subcategory_id]?.length > 0 && (
                <div className="mt-4 p-3 bg-background/60 rounded-xl">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Volume Discounts Available!
                  </p>
                  <div className="mt-2 space-y-1">
                    {discountTiers[product.subcategory_id].map(tier => (
                      <p key={tier.id} className="text-xs text-muted-foreground">
                        Buy {tier.min_quantity}+ items → Save Rs. {tier.discount_amount}/item
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Color Selection */}
            {product.has_color_variants && colorVariants.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Color: <span className="text-primary">{colorVariants.find(c => c.id === selectedColor)?.color_name}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {colorVariants.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedColor === color.id 
                          ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {color.image_url ? (
                        <img src={color.image_url} alt={color.color_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          {color.color_name.slice(0, 2)}
                        </div>
                      )}
                      {selectedColor === color.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
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
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Size: <span className="text-primary">{sizeVariants.find(s => s.id === selectedSize)?.size_name}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sizeVariants.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`min-w-[48px] h-12 px-4 rounded-xl font-medium transition-all ${
                        selectedSize === size.id 
                          ? 'bg-primary text-primary-foreground shadow-lg' 
                          : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                      }`}
                    >
                      {size.size_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Quantity & Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Quantity:</span>
                <div className="flex items-center bg-muted rounded-xl overflow-hidden border border-border">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-16 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(productStock, quantity + 1))}
                    disabled={quantity >= productStock}
                    className="w-12 h-12 flex items-center justify-center hover:bg-background transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  (Max: {productStock})
                </span>
              </div>

              {/* Total Price */}
              {quantity > 1 && (
                <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total for {quantity} items:</span>
                  <span className="text-xl font-bold text-foreground">Rs. {totalPrice.toFixed(0)}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={actionLoading || productStock === 0}
                  className="h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={actionLoading || productStock === 0}
                  className="h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Buy Now
                </Button>
              </div>

              {currentCartQuantity > 0 && (
                <p className="text-sm text-center text-muted-foreground bg-muted/30 rounded-lg py-2">
                  <ShoppingCart className="w-4 h-4 inline mr-1" />
                  You already have {currentCartQuantity} of this item in your cart
                </p>
              )}
            </div>

            <Separator />

            {/* Product Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">About this item</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Fast Delivery</p>
                  <p className="text-xs text-muted-foreground">Within Nepal</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Quality Assured</p>
                  <p className="text-xs text-muted-foreground">100% Original</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Easy Exchange</p>
                  <p className="text-xs text-muted-foreground">Within 2 days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Secure Packaging</p>
                  <p className="text-xs text-muted-foreground">Safe delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
