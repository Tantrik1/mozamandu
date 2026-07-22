
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, CreditCard, QrCode, Upload, X, Image as ImageIcon } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
}

export function PaymentMethodManagement() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    qr_code_url: '',
    is_active: true,
  });
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Stats
  const activePaymentMethods = paymentMethods.filter(pm => pm.is_active).length;
  const totalPaymentMethods = paymentMethods.length;

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payment methods",
        variant: "destructive",
      });
    } else {
      setPaymentMethods(data || []);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB - will be compressed automatically)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 10MB`,
          variant: "destructive",
        });
        return;
      }

      if (file.type.startsWith('image/')) {
        setQrCodeFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setQrCodePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
      }
    }
  };

  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrCodeFile) return null;

    setUploading(true);

    try {
      const { prepareImageForUpload, THUMBNAIL_COMPRESSION } = await import('@/utils/imageOptimizer');
      
      // Optimize QR code image with thumbnail compression (~150KB)
      const { file: optimizedFile } = await prepareImageForUpload(qrCodeFile, THUMBNAIL_COMPRESSION);
      const { uploadToR2 } = await import('@/utils/r2Upload');
      const publicUrl = await uploadToR2(optimizedFile, 'payment_methods');
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload QR code image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let qrCodeUrl = formData.qr_code_url;
    
    // Upload new QR code if file is selected
    if (qrCodeFile) {
      const uploadedUrl = await uploadQrCode();
      if (!uploadedUrl) return;
      qrCodeUrl = uploadedUrl;
    }

    if (!qrCodeUrl) {
      toast({
        title: "Error",
        description: "Please upload a QR code image",
        variant: "destructive",
      });
      return;
    }

    const paymentMethodData = {
      name: formData.name,
      qr_code_url: qrCodeUrl,
      is_active: formData.is_active,
    };

    let error;
    
    if (editingPaymentMethod) {
      ({ error } = await supabase
        .from('payment_methods')
        .update(paymentMethodData)
        .eq('id', editingPaymentMethod.id));
    } else {
      ({ error } = await supabase
        .from('payment_methods')
        .insert([paymentMethodData]));
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Payment method ${editingPaymentMethod ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchPaymentMethods();
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setFormData({
      name: paymentMethod.name,
      qr_code_url: paymentMethod.qr_code_url,
      is_active: paymentMethod.is_active,
    });
    setQrCodePreview(paymentMethod.qr_code_url);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string, paymentMethodName: string) => {
    // First check if this payment method is being used in any orders
    const { data: ordersUsingPaymentMethod, error: checkError } = await supabase
      .from('customer_orders')
      .select('id')
      .eq('payment_method_id', id)
      .limit(1);

    if (checkError) {
      toast({
        title: "Error",
        description: "Failed to check payment method usage",
        variant: "destructive",
      });
      return;
    }

    if (ordersUsingPaymentMethod && ordersUsingPaymentMethod.length > 0) {
      const shouldDeactivate = confirm(
        `Cannot delete "${paymentMethodName}" because it's being used in existing orders.\n\nWould you like to deactivate it instead? This will hide it from new orders while preserving order history.`
      );

      if (shouldDeactivate) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ is_active: false })
          .eq('id', id);

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Payment method deactivated successfully",
          });
          fetchPaymentMethods();
        }
      }
      return;
    }

    // If no orders are using this payment method, proceed with deletion
    if (!confirm(`Are you sure you want to delete "${paymentMethodName}"? This action cannot be undone.`)) return;

    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
      });
      fetchPaymentMethods();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      qr_code_url: '',
      is_active: true,
    });
    setQrCodeFile(null);
    setQrCodePreview('');
    setEditingPaymentMethod(null);
  };

  const removePreview = () => {
    setQrCodeFile(null);
    setQrCodePreview('');
    if (!editingPaymentMethod) {
      setFormData({ ...formData, qr_code_url: '' });
    }
  };

  const filteredPaymentMethods = paymentMethods.filter(pm =>
    pm.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Payment Methods</h2>
          <p className="text-muted-foreground mt-1">Manage payment methods and QR codes</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingPaymentMethod ? 'Edit Payment Method' : 'Add New Payment Method'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Payment Method Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Bkash, Nagad, Rocket"
                />
              </div>

              <div>
                <Label htmlFor="qr_code">QR Code Image *</Label>
                <div className="mt-2 space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-2 border-dashed flex flex-col items-center justify-center gap-2"
                      onClick={() => setIsMediaPickerOpen(true)}
                    >
                      <ImageIcon className="w-8 h-8 text-primary" />
                      <span className="text-sm font-medium">Select / Upload QR Code Image</span>
                    </Button>
                  </div>

                  {qrCodePreview && (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">QR Code Preview</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removePreview}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-32 h-32 mx-auto border rounded-lg overflow-hidden">
                        <img
                          src={qrCodePreview}
                          alt="QR Code Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : editingPaymentMethod ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalPaymentMethods}</p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{activePaymentMethods}</p>
              </div>
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <QrCode className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{totalPaymentMethods - activePaymentMethods}</p>
              </div>
              <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <X className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search payment methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
          {filteredPaymentMethods.length} of {paymentMethods.length} methods
        </div>
      </div>

      {/* Payment Methods Grid */}
      {filteredPaymentMethods.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first payment method'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaymentMethods.map((paymentMethod) => (
            <Card key={paymentMethod.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-green-600">{paymentMethod.name}</CardTitle>
                    <Badge 
                      variant={paymentMethod.is_active ? 'default' : 'secondary'}
                      className={paymentMethod.is_active ? 'bg-green-100 text-green-800 mt-2' : 'mt-2'}
                    >
                      {paymentMethod.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(paymentMethod)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(paymentMethod.id, paymentMethod.name)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={paymentMethod.qr_code_url}
                      alt={`${paymentMethod.name} QR Code`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-gray-500">
                  Created: {new Date(paymentMethod.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Media Picker Modal */}
      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        folder="payment_methods"
        onSelect={(url) => {
          setQrCodePreview(url);
          setFormData({ ...formData, qr_code_url: url });
        }}
      />
    </div>
  );
}
