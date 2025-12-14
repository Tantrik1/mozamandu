import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';

const featuredProducts = [
  { id: 1, name: 'Classic Red', price: 299, image: '/lovable-uploads/51654152-d02f-443b-bb60-fd75dace40ee.png' },
  { id: 2, name: 'Navy Blue', price: 349, image: '/lovable-uploads/30eed4ab-ddd8-442c-aeae-041fd7ae3be3.png' },
  { id: 3, name: 'Sport Pro', price: 399, image: '/lovable-uploads/e02f8f14-3960-44fa-87db-499a23b30f02.png' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-rose-100 via-purple-200 to-indigo-300">
      {/* Large faded brand text in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[20vw] font-black text-white/20 tracking-wider whitespace-nowrap">
          MOZAMANDU
        </span>
      </div>

      {/* Decorative curved shape */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[60%] h-[120%] bg-white/10 rounded-l-full blur-sm" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[60vh]">
          {/* Left content */}
          <div className="text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-zinc-800 leading-tight mb-6">
              <span className="italic font-light">Are you ready to</span>
              <span className="block text-rose-600 italic">step in style</span>
            </h1>

            <p className="text-zinc-600 text-lg max-w-md mb-8 leading-relaxed">
              Premium quality socks crafted with care. Experience unmatched comfort 
              and bold designs for every occasion.
            </p>

            <Button 
              asChild 
              size="lg" 
              className="bg-zinc-100 hover:bg-white text-zinc-900 rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
            >
              <Link to="/categories">
                BUY NOW
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right - Hero product image */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <img
                src="/lovable-uploads/9e1dcca9-44bc-44a8-aa02-56cef600abbb.png"
                alt="Premium Mozamandu Socks"
                className="w-full h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
            </div>
          </div>
        </div>

        {/* Bottom product cards */}
        <div className="relative z-20 mt-8 lg:mt-0">
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {featuredProducts.map((product) => (
              <Link 
                key={product.id} 
                to="/categories"
                className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[200px]"
              >
                <div className="w-16 h-16 flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-800 text-sm">{product.name}</h3>
                  <p className="text-rose-600 font-bold">Rs. {product.price}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
