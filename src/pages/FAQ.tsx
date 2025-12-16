import { memo } from 'react';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

const FAQPage = memo(function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs-page'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return faqs;
    const term = searchTerm.toLowerCase();
    return faqs.filter((faq: FAQ) =>
      faq.question.toLowerCase().includes(term) ||
      faq.answer.toLowerCase().includes(term)
    );
  }, [searchTerm, faqs]);

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg mb-8">Find answers to common questions about our products and services</p>
          
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-muted rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No FAQs found matching your search.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq: FAQ, index: number) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={`item-${index}`} 
                    className="bg-card rounded-lg border animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                      <span className="font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <p className="text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </>
        )}

        <div className="mt-12 p-6 bg-card rounded-lg border text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">Can't find what you're looking for? Contact our customer support team.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div>
              <span className="font-medium">Email:</span> support@mozamandu.com
            </div>
            <div>
              <span className="font-medium">Phone:</span> +977-1-234-5678
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
});

export default FAQPage;
