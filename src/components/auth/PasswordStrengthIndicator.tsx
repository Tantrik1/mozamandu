
import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const requirements = [
    { 
      label: 'At least 8 characters', 
      met: password.length >= 8 
    },
    { 
      label: 'Contains uppercase letter', 
      met: /[A-Z]/.test(password) 
    },
    { 
      label: 'Contains lowercase letter', 
      met: /[a-z]/.test(password) 
    },
    { 
      label: 'Contains number', 
      met: /\d/.test(password) 
    },
    { 
      label: 'Contains special character (!@#$%^&*)', 
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password) 
    }
  ];

  const metCount = requirements.filter(req => req.met).length;
  const strength = metCount === 0 ? 'Very Weak' : 
                  metCount <= 2 ? 'Weak' : 
                  metCount <= 3 ? 'Fair' : 
                  metCount <= 4 ? 'Good' : 'Strong';
  
  const strengthColor = metCount === 0 ? 'text-gray-400' :
                       metCount <= 2 ? 'text-red-500' :
                       metCount <= 3 ? 'text-orange-500' :
                       metCount <= 4 ? 'text-yellow-500' : 'text-green-500';

  if (!password) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
      <div className={`font-medium mb-2 ${strengthColor}`}>
        Password Strength: {strength}
      </div>
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2">
            {req.met ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-400" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
