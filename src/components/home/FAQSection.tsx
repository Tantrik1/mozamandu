import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown, Package, Ruler, Sparkles, RefreshCw, MessageCircle } from 'lucide-react';
interface FAQ {
  id: string;
  question: string;
  answer: string;
}
interface FAQSectionProps {
  faqs: FAQ[];
  isLoading: boolean;
}
const categories = [{
  icon: Package,
  label: 'Ordering & Shipping',
  color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
}, {
  icon: Ruler,
  label: 'Sizing & Fit',
  color: 'bg-teal-50 hover:bg-teal-100 border-teal-200'
}, {
  icon: Sparkles,
  label: 'Product Care',
  color: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
}, {
  icon: RefreshCw,
  label: 'Returns & Exchanges',
  color: 'bg-pink-50 hover:bg-pink-100 border-pink-200'
}];
export const FAQSection = memo(function FAQSection({
  faqs,
  isLoading
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (isLoading) {
    return <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-muted rounded-xl h-14 animate-pulse" />)}
          </div>
        </div>
      </section>;
  }
  if (faqs.length === 0) return null;
  return <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-0">
        {/* Header */}
        <div className="text-center mb-2 md:mb-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find answers to all your queries about our products and services.
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-12 animate-fade-in" style={{
        animationDelay: '0.1s'
      }}>
          {categories.map((cat, idx) => <Link key={idx} to="/faq" className={`group flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border ${cat.color} transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
              <cat.icon className="w-8 h-8 md:w-10 md:h-10 text-foreground/70 mb-2 md:mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-xs md:text-sm font-medium text-foreground/80 text-center leading-tight">{cat.label}</span>
            </Link>)}
        </div>

        {/* Popular Questions */}
        <div className="animate-fade-in" style={{
        animationDelay: '0.2s'
      }}>
          <div className="flex items-center gap-3 mb-6">
            
            
          </div>

          <div className="space-y-3">
            {faqs.slice(0, 5).map((faq, index) => <div key={faq.id} className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-muted/30 transition-colors">
                  <span className="font-medium text-foreground pr-4 text-sm md:text-base">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 md:px-5 pb-4 md:pb-5 text-muted-foreground leading-relaxed text-sm md:text-base">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {/* Contact CTA Banner */}
        <div className="mt-10 md:mt-12 bg-foreground/90 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in" style={{
        animationDelay: '0.3s'
      }}>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-lg md:text-xl font-semibold text-background mb-1">Still need help?</h4>
              <p className="text-background/70 text-sm">Contact our support team anytime!</p>
            </div>
          </div>
          <Button asChild className="rounded-full px-6 md:px-8 bg-primary hover:bg-primary/90">
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </div>
      </div>
    </section>;
});