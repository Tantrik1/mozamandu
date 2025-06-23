
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Star } from 'lucide-react';

interface ComboCongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  combo: {
    name: string;
    description: string;
    combo_subcategories: {
      subcategory_id: string;
      price: number;
    }[];
  };
  subcategoriesData: { [key: string]: { name: string } };
}

export function ComboCongratsModal({ 
  isOpen, 
  onClose, 
  combo, 
  subcategoriesData 
}: ComboCongratsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Gift className="h-6 w-6" />
            🎉 Congratulations!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="text-lg font-semibold text-green-700">
                Combo Mode Applied!
              </span>
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
            </div>
            <p className="text-sm text-gray-600">{combo.description}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-3">
              Special Combo Prices:
            </h3>
            <div className="space-y-2">
              {combo.combo_subcategories.map((cs) => (
                <div key={cs.subcategory_id} className="flex justify-between items-center">
                  <span className="text-sm text-green-700">
                    {subcategoriesData[cs.subcategory_id]?.name || 'Subcategory'}
                  </span>
                  <span className="text-sm font-bold text-green-800">
                    ${cs.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button 
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
