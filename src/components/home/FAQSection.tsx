import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  isLoading: boolean;
}

export const FAQSection = memo(function FAQSection({ faqs, isLoading }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (isLoading) {
    return (
      <section className="py-10 md:py-12 lg:py-16 bg-muted/30">
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
    <section className="py-10 md:py-12 lg:py-16 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Find answers to common questions about our products, shipping, and policies.
          </p>
        </div>

        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/faq">View All FAQs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
