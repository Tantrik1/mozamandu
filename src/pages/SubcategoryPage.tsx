
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/customer/ProductCard';
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
import { ChevronRight, Home } from 'lucide-react';

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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Volume Discounts Available</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {discountTiers.map((tier, index) => (
            <div key={tier.id} className="flex items-center justify-between bg-white p-2 rounded border">
              <span className="text-gray-600">
                {tier.min_quantity}+ units
              </span>
              <span className="font-medium text-green-600">
                Save Rs {tier.discount_amount}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">
          *Discounts apply automatically when minimum quantities are met
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Subcategory not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/category/${subcategory.categories?.id}`}>
                {subcategory.categories?.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{subcategory.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Subcategory Header */}
      <div className="mb-8">
        <div className="mb-4">
          <Badge variant="outline" className="mb-3">
            {subcategory.categories?.name}
          </Badge>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{subcategory.name}</h1>
          {subcategory.description && (
            <p className="text-gray-600 text-lg leading-relaxed mb-4">{subcategory.description}</p>
          )}
          
          {/* Pricing Information */}
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <span className="text-sm text-green-700 font-medium">Base Price: </span>
              <span className="text-lg font-bold text-green-800">Rs {subcategory.selling_price}</span>
            </div>
            {subcategory.minimum_quantity > 1 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                <span className="text-sm text-orange-700 font-medium">Min Qty: </span>
                <span className="text-lg font-bold text-orange-800">{subcategory.minimum_quantity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Subcategory Image */}
        {subcategory.image_url && (
          <div className="mb-6">
            <img
              src={subcategory.image_url}
              alt={subcategory.name}
              className="w-full h-48 md:h-64 object-cover rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Volume Discount Information */}
        {renderVolumeDiscountInfo()}

        {/* Product Count Badge */}
        {products.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {products.length} product{products.length !== 1 ? 's' : ''} available
          </Badge>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <p className="text-gray-500 text-lg mb-2">No products available in this category.</p>
            <p className="text-gray-400 text-sm">Check back later for new arrivals!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              subcategorySellingPrice={subcategory.selling_price}
              discountTiers={discountTiers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
