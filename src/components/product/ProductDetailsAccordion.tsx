import { memo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileText, Sparkles, Leaf, Info } from 'lucide-react';

interface ProductDetailsAccordionProps {
  description?: string | null;
  materialComposition?: string | null;
  careInstructions?: string | null;
}

export const ProductDetailsAccordion = memo(function ProductDetailsAccordion({
  description,
  materialComposition,
  careInstructions
}: ProductDetailsAccordionProps) {
  // Default values if not provided
  const defaultMaterial = 'Premium quality fabric blend designed for comfort and durability.';
  const defaultCare = [
    'Machine wash cold with similar colors',
    'Do not bleach',
    'Tumble dry low',
    'Iron on low heat if needed'
  ];

  const material = materialComposition || defaultMaterial;
  // Parse care instructions - handle both string and array formats
  const parseCareInstructions = (instructions: string | null | undefined): string[] => {
    if (!instructions) return defaultCare;
    // If it's a comma-separated string, split it
    if (instructions.includes(',')) {
      return instructions.split(',').map(s => s.trim()).filter(Boolean);
    }
    // If it has newlines, split by newlines
    if (instructions.includes('\n')) {
      return instructions.split('\n').map(s => s.trim()).filter(Boolean);
    }
    // Otherwise return as single item array
    return [instructions];
  };
  const care = parseCareInstructions(careInstructions);

  return (
    <div className="border-t border-border pt-6">
      <Accordion type="single" collapsible defaultValue="description" className="w-full">
        {/* Product Description */}
        {description && (
          <AccordionItem value="description" className="border-b border-border">
            <AccordionTrigger className="text-base font-semibold hover:no-underline py-4">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Product Details
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                {description}
              </p>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Fabric & Care */}
        <AccordionItem value="fabric" className="border-b border-border">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Fabric & Care
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">Material Composition</h4>
                <p>{material}</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Care Instructions</h4>
                <ul className="list-disc list-inside space-y-1">
                  {care.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brand Story */}
        <AccordionItem value="brand" className="border-b border-border">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              The Mozamandu Promise
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                At Mozamandu, we believe that everyday essentials should be extraordinary. 
                Each product is crafted with attention to detail, using premium materials 
                that prioritize both comfort and style.
              </p>
              <p>
                Our commitment to quality means rigorous testing and careful selection 
                of materials. When you choose Mozamandu, you are choosing products designed 
                to last and bring joy to your daily routine.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sustainability */}
        <AccordionItem value="sustainability" className="border-b-0">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Sustainability
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                We are committed to reducing our environmental footprint. Our packaging 
                is made from recycled materials, and we continuously work to improve 
                our supply chain sustainability.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">
                  Recyclable Packaging
                </span>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">
                  Eco-Conscious
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});
