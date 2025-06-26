
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchFAQs = async () => {
      try {
        console.log('🔄 FAQSection: Starting FAQ fetch');

        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error('❌ FAQSection: Fetch error:', error);
          setFaqs([]);
        } else {
          console.log('✅ FAQSection: FAQs loaded:', data?.length || 0);
          setFaqs(data || []);
        }

      } catch (error) {
        console.error('❌ FAQSection: Unexpected error:', error);
        if (isMounted) {
          setFaqs([]);
        }
      } finally {
        if (isMounted) {
          console.log('✅ FAQSection: FAQ fetch complete');
          setLoading(false);
        }
      }
    };

    fetchFAQs();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-gray-600">
              Find answers to common questions about our products and services
            </p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-gray-600">
              Find answers to common questions about our products and services
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No FAQs available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-gray-600">
            Find answers to common questions about our products and services
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
