import { ProductForm } from './ProductForm';

interface EditProductFormProps {
  productId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditProductForm({ productId, onSave, onCancel }: EditProductFormProps) {
  return <ProductForm mode="edit" productId={productId} onSave={onSave} onCancel={onCancel} />;
}
