
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
import { Plus, Edit, Trash2, Search, CreditCard, QrCode, Upload, X } from 'lucide-react';

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
    const fileExt = qrCodeFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `payment-qr-codes/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, qrCodeFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload QR code image",
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-gray-600 mt-1">Manage payment methods and QR codes</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg">
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
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> QR code
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (Max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
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
                <Button type="submit" disabled={uploading} className="bg-green-600 hover:bg-green-700">
                  {uploading ? 'Uploading...' : editingPaymentMethod ? 'Update' : 'Create'} Payment Method
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Methods</p>
                <p className="text-2xl font-bold text-gray-900">{totalPaymentMethods}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Methods</p>
                <p className="text-2xl font-bold text-green-600">{activePaymentMethods}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <QrCode className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Methods</p>
                <p className="text-2xl font-bold text-red-600">{totalPaymentMethods - activePaymentMethods}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payment methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
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
                      onClick={() => handleDelete(paymentMethod.id)}
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
    </div>
  );
}
