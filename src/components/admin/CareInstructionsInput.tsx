import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Shirt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CareInstructionsInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CareInstructionsInput({ value, onChange }: CareInstructionsInputProps) {
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      if (Array.isArray(value)) {
        const filtered = value.filter(item => item && item.trim() !== '');
        setInstructions(filtered.length > 0 ? filtered : ['']);
      } else if (typeof value === 'string') {
        const parsed = value.split('\n').filter(item => item.trim() !== '');
        setInstructions(parsed.length > 0 ? parsed : ['']);
      } else {
        setInstructions(['']);
      }
    } else {
      setInstructions(['']);
    }
  }, []);

  const updateParent = (newInstructions: string[]) => {
    setInstructions(newInstructions);
    const filtered = newInstructions.filter(item => item.trim() !== '');
    onChange(filtered.join('\n'));
  };

  const addInstruction = () => {
    updateParent([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      const newInstructions = instructions.filter((_, i) => i !== index);
      updateParent(newInstructions);
    }
  };

  const updateInstruction = (index: number, newValue: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = newValue;
    updateParent(newInstructions);
  };

  const quickAddOptions = [
    'Machine wash cold',
    'Do not bleach',
    'Tumble dry low',
    'Iron on low heat',
  ];

  const handleQuickAdd = (text: string) => {
    if (!instructions.some(i => i.toLowerCase() === text.toLowerCase())) {
      const filtered = instructions.filter(i => i.trim() !== '');
      updateParent([...filtered, text]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
          <Shirt className="h-3 w-3" /> Care Instructions
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addInstruction}
          className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Quick Add Chips */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {quickAddOptions.map((option) => {
          const isAdded = instructions.some(i => i.toLowerCase() === option.toLowerCase());
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleQuickAdd(option)}
              disabled={isAdded}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-full transition-all ${
                isAdded 
                  ? 'bg-primary/10 text-primary border border-primary/30 cursor-not-allowed' 
                  : 'bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30'
              }`}
            >
              {isAdded ? '✓ ' : '+ '}{option}
            </button>
          );
        })}
      </div>
      
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {instructions.map((instruction, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{index + 1}</span>
              </div>
              <Input
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder={`e.g., Machine wash cold`}
                className="flex-1 h-9 sm:h-10 rounded-xl text-xs sm:text-sm border-border/50 focus:border-primary"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(index)}
                disabled={instructions.length === 1}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-30"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {instructions.filter(i => i.trim()).length === 0 && (
        <p className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          Click quick-add chips above or type custom instructions
        </p>
      )}
    </div>
  );
}
