
import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 FAQSection: Starting FAQ fetch');

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ FAQSection: Loading timeout after 10 seconds');
        setError('Loading took too long. Please try again.');
        setLoading(false);
      }
    }, 10000);

    const fetchFAQs = async () => {
      try {
        console.log('🔄 FAQSection: Fetching FAQs...');
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(6);

        if (error) {
          console.error('❌ FAQSection: Error fetching FAQs:', error);
          // Check for RLS issues
          if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
            console.warn('⚠️ FAQSection: RLS may be blocking FAQ access');
          }
          throw error;
        }

        if (!isMounted) return;

        console.log('✅ FAQSection: FAQs fetched:', data?.length || 0);
        setFaqs(data || []);
        setError(null);
      } catch (error) {
        console.error('❌ FAQSection: Exception during FAQ fetch:', error);
        if (isMounted) {
          setError('Failed to load FAQs. Please try again.');
        }
      } finally {
        if (isMounted) {
          console.log('✅ FAQSection: Setting loading to false');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchFAQs();

    return () => {
      console.log('🧹 FAQSection: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 text-lg">Find answers to common questions about our products and services</p>
          </div>
          <div className="text-center">Loading FAQs...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600 text-lg">Find answers to common questions about our products and services</p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.id} value={`item-${index}`} className="bg-white rounded-lg border">
              <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                <span className="font-medium">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <p className="text-gray-600">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-8">
          <Link to="/faq">
            <Button variant="outline" size="lg">
              View All FAQs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
