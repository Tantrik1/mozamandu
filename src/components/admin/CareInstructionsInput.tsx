import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Shirt, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CareInstructionsInputProps {
  value: string;
  onChange: (value: string) => void;
}

const QUICK_OPTIONS = [
  'Machine wash cold',
  'Hand wash only',
  'Do not bleach',
  'Tumble dry low',
  'Hang to dry',
  'Iron on low heat',
  'Do not iron',
  'Dry clean only',
];

export function CareInstructionsInput({ value, onChange }: CareInstructionsInputProps) {
  const [instructions, setInstructions] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Parse value on mount and when value changes externally
  useEffect(() => {
    if (value) {
      let parsed: string[] = [];
      if (Array.isArray(value)) {
        parsed = (value as unknown as string[]).filter(item => item && String(item).trim() !== '');
      } else if (typeof value === 'string') {
        parsed = value.split('\n').filter(item => item.trim() !== '');
      }
      setInstructions(parsed);
    } else {
      setInstructions([]);
    }
  }, []);

  const updateParent = useCallback((newInstructions: string[]) => {
    setInstructions(newInstructions);
    const filtered = newInstructions.filter(item => item.trim() !== '');
    onChange(filtered.join('\n'));
  }, [onChange]);

  const toggleInstruction = (text: string) => {
    const exists = instructions.some(i => i.toLowerCase() === text.toLowerCase());
    if (exists) {
      updateParent(instructions.filter(i => i.toLowerCase() !== text.toLowerCase()));
    } else {
      updateParent([...instructions, text]);
    }
  };

  const addCustomInstruction = () => {
    const trimmed = customValue.trim();
    if (trimmed && !instructions.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      updateParent([...instructions, trimmed]);
      setCustomValue('');
      setShowCustomInput(false);
    }
  };

  const removeInstruction = (index: number) => {
    updateParent(instructions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Shirt className="h-3 w-3" />
          Care Instructions
        </Label>
        <span className="text-[10px] text-muted-foreground">
          {instructions.length} selected
        </span>
      </div>

      {/* Quick Select Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_OPTIONS.map((option) => {
          const isSelected = instructions.some(i => i.toLowerCase() === option.toLowerCase());
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleInstruction(option)}
              className={`
                px-3 py-2 text-xs rounded-lg transition-all text-left flex items-center justify-between
                ${isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50 hover:bg-muted text-foreground border border-border/50'
                }
              `}
            >
              <span className="truncate">{option}</span>
              {isSelected && <Check className="h-3 w-3 flex-shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Custom Instructions */}
      <AnimatePresence>
        {showCustomInput ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <Input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Add custom instruction..."
              className="flex-1 h-9 rounded-lg text-xs"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInstruction())}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={addCustomInstruction}
              disabled={!customValue.trim()}
              className="h-9 px-3 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowCustomInput(false); setCustomValue(''); }}
              className="h-9 px-3 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3 w-3" />
            Add custom instruction
          </motion.button>
        )}
      </AnimatePresence>

      {/* Selected Custom Instructions (only show non-preset ones) */}
      {instructions.filter(i => !QUICK_OPTIONS.some(opt => opt.toLowerCase() === i.toLowerCase())).length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <Label className="text-[10px] text-muted-foreground">Custom Instructions</Label>
          <div className="flex flex-wrap gap-1.5">
            {instructions
              .filter(i => !QUICK_OPTIONS.some(opt => opt.toLowerCase() === i.toLowerCase()))
              .map((instruction, index) => (
                <motion.div
                  key={instruction}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                >
                  <span>{instruction}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const originalIndex = instructions.findIndex(i => i === instruction);
                      removeInstruction(originalIndex);
                    }}
                    className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
