
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ModernProductCard } from '@/components/customer/ModernProductCard';
import { Badge } from '@/components/ui/badge';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { ChevronRight, Home, Info } from 'lucide-react';

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
  stock_quantity: number;
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  image_url: string | null;
  minimum_quantity: number;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

export default function SubcategoryPage() {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subcategoryId) {
      fetchSubcategoryData();
    }
  }, [subcategoryId]);

  const fetchSubcategoryData = async () => {
    if (!subcategoryId) return;

    try {
      // Fetch subcategory details
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select(`
          *,
          categories(id, name)
        `)
        .eq('id', subcategoryId)
        .eq('status', 'on')
        .single();

      if (subcategoryError) throw subcategoryError;
      setSubcategory(subcategoryData);

      // Fetch discount tiers for this subcategory
      const { data: tiersData, error: tiersError } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .order('min_quantity', { ascending: true });

      if (tiersError) throw tiersError;
      setDiscountTiers(tiersData || []);

      // Fetch products in this subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      if (productsData) {
        // Calculate stock for each product
        const productsWithStock = await Promise.all(
          productsData.map(async (product) => {
            try {
              const stock = await getProductStockSummary(product.id);
              return {
                ...product,
                stock_quantity: stock,
              };
            } catch (error) {
              console.error('Error calculating stock for product:', product.id, error);
              return {
                ...product,
                stock_quantity: 0,
              };
            }
          })
        );
        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error fetching subcategory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVolumeDiscountInfo = () => {
    if (discountTiers.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Volume Discounts Available</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {discountTiers.map((tier) => (
            <div key={tier.id} className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {tier.min_quantity}+ units
                </span>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Save Rs {tier.discount_amount}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-4 bg-blue-50 p-2 rounded-lg">
          💡 <strong>Tip:</strong> Discounts apply automatically when minimum quantities are met
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg text-gray-600">Loading products...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 shadow-sm max-w-md mx-auto">
              <p className="text-gray-500 text-lg mb-2">Subcategory not found</p>
              <p className="text-gray-400 text-sm">The subcategory you're looking for doesn't exist or has been removed.</p>
              <Link to="/" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link 
                  to={`/category/${subcategory.categories?.id}`}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {subcategory.categories?.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-blue-600 font-medium">{subcategory.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Subcategory Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Subcategory Image */}
            {subcategory.image_url && (
              <div className="lg:w-1/3">
                <img
                  src={subcategory.image_url}
                  alt={subcategory.name}
                  className="w-full h-64 lg:h-48 object-cover rounded-lg shadow-sm"
                />
              </div>
            )}
            
            {/* Subcategory Info */}
            <div className="flex-1">
              <div className="mb-4">
                <Badge variant="outline" className="mb-3 text-blue-600 border-blue-200 bg-blue-50">
                  {subcategory.categories?.name}
                </Badge>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{subcategory.name}</h1>
                {subcategory.description && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">{subcategory.description}</p>
                )}
              </div>
              
              {/* Pricing Information */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-6 py-3 shadow-sm">
                  <span className="text-sm text-green-700 font-medium block">Base Price</span>
                  <span className="text-2xl font-bold text-green-800">Rs {subcategory.selling_price}</span>
                </div>
                {subcategory.minimum_quantity > 1 && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg px-6 py-3 shadow-sm">
                    <span className="text-sm text-orange-700 font-medium block">Min Quantity</span>
                    <span className="text-2xl font-bold text-orange-800">{subcategory.minimum_quantity}</span>
                  </div>
                )}
              </div>

              {/* Product Count Badge */}
              {products.length > 0 && (
                <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                  {products.length} product{products.length !== 1 ? 's' : ''} available
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Volume Discount Information */}
        {renderVolumeDiscountInfo()}

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl p-8 shadow-sm max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <p className="text-gray-500 text-lg mb-2">No products available</p>
              <p className="text-gray-400 text-sm">Check back later for new arrivals in this category!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
            <ModernProductCard
              key={product.id}
               product={{ ...product, subcategory_id: subcategory?.id || '' }}
               subcategorySellingPrice={subcategory.selling_price}
            />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
