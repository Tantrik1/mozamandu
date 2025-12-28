import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, GripVertical } from 'lucide-react';

interface CareInstructionsInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CareInstructionsInput({ value, onChange }: CareInstructionsInputProps) {
  const [instructions, setInstructions] = useState<string[]>([]);

  // Parse initial value - handle newlines
  useEffect(() => {
    if (value) {
      const parsed = value.split('\n').filter(item => item.trim() !== '');
      setInstructions(parsed.length > 0 ? parsed : ['']);
    } else {
      setInstructions(['']);
    }
  }, []);

  // Update parent when instructions change
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Care Instructions</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInstruction}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Instruction
        </Button>
      </div>
      
      <div className="space-y-2">
        {instructions.map((instruction, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={instruction}
              onChange={(e) => updateInstruction(index, e.target.value)}
              placeholder={`Instruction ${index + 1} (e.g., Machine wash cold)`}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeInstruction(index)}
              disabled={instructions.length === 1}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {instructions.filter(i => i.trim()).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add care instructions like "Machine wash cold", "Do not bleach", etc.
        </p>
      )}
    </div>
  );
}
