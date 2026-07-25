import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, MessageCircle } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  isLoading: boolean;
}

const faqEmojis = ['❓', '📦', '💳', '🚚', '↩️', '📏', '✨', '🛡️', '⏰', '💬'];

export const FAQSection = memo(function FAQSection({
  faqs,
  isLoading
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Center Aligned Section Header without Eyebrow */}
        <div className="text-center mb-8 md:mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-foreground">Frequently Asked </span>
            <span className="text-destructive">Questions</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Find answers to all your queries regarding ordering, delivery, fabric care, and returns
          </p>
        </div>

        {/* FAQ Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 md:mb-12">
          {faqs.slice(0, 4).map((faq, index) => (
            <div
              key={faq.id}
              className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-start gap-3.5 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">
                  {faqEmojis[index % faqEmojis.length]}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-foreground text-sm sm:text-base leading-snug block pr-2">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 mt-1 ${
                    openIndex === index ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-5 pl-11 sm:pl-13 text-muted-foreground leading-relaxed text-xs sm:text-sm border-t border-border/40 pt-3">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA Banner */}
        <div className="bg-foreground text-background rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg border border-border/40">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 shrink-0">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-0.5">Have additional questions?</h3>
              <p className="text-background/80 text-xs sm:text-sm">Our customer happiness team is available to assist you anytime.</p>
            </div>
          </div>
          <Button asChild size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 font-bold shrink-0 shadow-md">
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </div>
      </div>
    </section>
  );
});