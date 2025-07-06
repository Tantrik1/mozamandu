import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdminPasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    actionType: 'cancel_order' | 'delete_item' | 'critical_action';
}

export function AdminPasswordDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    actionType
}: AdminPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleVerifyPassword = async () => {
        if (!password.trim()) {
            setError('Please enter your admin password');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                setError('Authentication error. Please log in again.');
                return;
            }

            // Verify admin role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                setError('Unable to verify admin privileges');
                return;
            }

            if (profile.role !== 'admin') {
                setError('You do not have admin privileges for this action');
                return;
            }

            // For development, use environment variable or default password
            // In production, this should be done server-side with proper hashing
            const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';

            if (password === adminPassword) {
                toast({
                    title: "Password Verified",
                    description: "Admin password confirmed. Proceeding with action.",
                });
                onConfirm();
                handleClose();
            } else {
                setError('Incorrect admin password');
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            setError('Error verifying password. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError('');
        setShowPassword(false);
        setIsVerifying(false);
        onClose();
    };

    const getActionColor = () => {
        switch (actionType) {
            case 'cancel_order':
                return 'text-red-600';
            case 'delete_item':
                return 'text-orange-600';
            case 'critical_action':
                return 'text-purple-600';
            default:
                return 'text-red-600';
        }
    };

    const getActionIcon = () => {
        switch (actionType) {
            case 'cancel_order':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            case 'delete_item':
                return <AlertTriangle className="h-5 w-5 text-orange-600" />;
            case 'critical_action':
                return <AlertTriangle className="h-5 w-5 text-purple-600" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${getActionColor()}`}>
                        {getActionIcon()}
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {message}
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="admin-password">Admin Password</Label>
                        <div className="relative">
                            <Input
                                id="admin-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your admin password"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleVerifyPassword();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVerifyPassword}
                            disabled={isVerifying || !password.trim()}
                            className={getActionColor().replace('text-', 'bg-').replace('-600', '-600 hover:bg-') + ' text-white'}
                        >
                            {isVerifying ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Verifying...
                                </>
                            ) : (
                                'Confirm Action'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 