
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface CheckoutSession {
  startTime: number;
  lastActivity: number;
  timeoutWarningShown: boolean;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 25 * 60 * 1000; // Show warning at 25 minutes

export const useCheckoutSession = () => {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Initialize session
    const initSession = () => {
      const now = Date.now();
      const newSession: CheckoutSession = {
        startTime: now,
        lastActivity: now,
        timeoutWarningShown: false
      };
      setSession(newSession);
      sessionStorage.setItem('checkoutSession', JSON.stringify(newSession));
    };

    // Check for existing session
    const savedSession = sessionStorage.getItem('checkoutSession');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        const now = Date.now();
        
        if (now - parsedSession.startTime > SESSION_TIMEOUT) {
          // Session expired
          setIsExpired(true);
          sessionStorage.removeItem('checkoutSession');
          sessionStorage.removeItem('checkoutInfo');
          toast({
            title: "Session Expired",
            description: "Your checkout session has expired. Please start over.",
            variant: "destructive",
          });
        } else {
          setSession(parsedSession);
        }
      } catch {
        initSession();
      }
    } else {
      initSession();
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const checkTimeout = () => {
      const now = Date.now();
      const timeElapsed = now - session.startTime;

      if (timeElapsed > SESSION_TIMEOUT) {
        setIsExpired(true);
        sessionStorage.removeItem('checkoutSession');
        sessionStorage.removeItem('checkoutInfo');
        toast({
          title: "Session Expired",
          description: "Your checkout session has expired. Please start over.",
          variant: "destructive",
        });
        return;
      }

      if (timeElapsed > WARNING_TIME && !session.timeoutWarningShown) {
        const remainingTime = Math.ceil((SESSION_TIMEOUT - timeElapsed) / 60000);
        toast({
          title: "Session Timeout Warning",
          description: `Your session will expire in ${remainingTime} minutes. Please complete your checkout soon.`,
          variant: "destructive",
        });
        
        const updatedSession = { ...session, timeoutWarningShown: true };
        setSession(updatedSession);
        sessionStorage.setItem('checkoutSession', JSON.stringify(updatedSession));
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session]);

  const updateActivity = () => {
    if (!session || isExpired) return;

    const now = Date.now();
    const updatedSession = { ...session, lastActivity: now };
    setSession(updatedSession);
    sessionStorage.setItem('checkoutSession', JSON.stringify(updatedSession));
  };

  const clearSession = () => {
    setSession(null);
    setIsExpired(false);
    sessionStorage.removeItem('checkoutSession');
  };

  return {
    session,
    isExpired,
    updateActivity,
    clearSession,
    remainingTime: session ? Math.max(0, SESSION_TIMEOUT - (Date.now() - session.startTime)) : 0
  };
};
