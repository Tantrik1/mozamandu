import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFAQs() {
      const { data } = await supabase
        .from('faqs')
        .select('id, question, answer')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(5);

      if (data) {
        setFaqs(data);
      }
      setLoading(false);
    }

    fetchFAQs();
  }, []);

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-muted rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find answers to common questions about our products, shipping, and policies.
          </p>
        </motion.div>

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-card rounded-xl border border-border/50 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/faq">View All FAQs</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
