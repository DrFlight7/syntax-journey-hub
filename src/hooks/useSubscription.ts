import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[useSubscription] Checking subscription...');
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        console.error('[useSubscription] Error checking subscription:', error);
        toast({
          title: "Error",
          description: "Failed to check subscription status",
          variant: "destructive",
        });
        setLoading(false); // ensure loading is reset
        return;
      }
      setSubscriptionData(data);
    } catch (error) {
      console.error('[useSubscription] Exception checking subscription:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[useSubscription] Creating checkout session...');
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) {
        console.error('[useSubscription] Error creating checkout session:', error);
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('[useSubscription] Exception creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // REAL: PayPal integration
  const createPaypalCheckoutSession = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe with PayPal.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // NOTE: You should replace the below PayPal PLAN_ID with your live/sandbox plan (created at developer.paypal.com)
      const PAYPAL_PLAN_ID = "P-TEST-PREMIUM-PLANID"; // <-- Replace this with your actual Plan ID

      const { data, error } = await supabase.functions.invoke('create-paypal-checkout', {
        body: { plan_id: PAYPAL_PLAN_ID },
      });

      if (error) {
        toast({
          title: "PayPal Error",
          description: error.message || "Failed to launch PayPal checkout.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url; // Replace window.open() with redirect for better UX
      } else {
        toast({
          title: "PayPal Error",
          description: "No approval link returned. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "PayPal Integration Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[useSubscription] Opening customer portal...');
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        console.error('[useSubscription] Error opening customer portal:', error);
        toast({
          title: "Error",
          description: "Failed to open customer portal",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('[useSubscription] Exception opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defensive: if user changes from active to null, always reset loading
    if (!user) {
      setLoading(false);
      setSubscriptionData({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
      });
      return;
    }
    checkSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    ...subscriptionData,
    loading,
    checkSubscription,
    createCheckoutSession,
    createPaypalCheckoutSession,
    openCustomerPortal,
  };
};
