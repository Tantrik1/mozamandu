import { ProductForm } from './ProductForm';

interface CreateProductFormProps {
  onSave: () => void;
  onCancel: () => void;
}

export function CreateProductForm({ onSave, onCancel }: CreateProductFormProps) {
  return <ProductForm mode="create" onSave={onSave} onCancel={onCancel} />;
}
