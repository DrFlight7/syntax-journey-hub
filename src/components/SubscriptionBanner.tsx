
import React, { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, CreditCard, Paypal } from 'lucide-react';

const SubscriptionBanner = () => {
  const {
    subscribed,
    subscription_tier,
    subscription_end,
    loading,
    createCheckoutSession,
    createPaypalCheckoutSession,
    openCustomerPortal,
  } = useSubscription();

  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal'>('stripe');

  if (subscribed) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Premium Subscription Active</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            You have access to all premium features. 
            {subscription_end && (
              <span className="block mt-1">
                Subscription ends: {new Date(subscription_end).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={openCustomerPortal}
            disabled={loading}
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-100"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-800">Unlock Premium Features</CardTitle>
        <CardDescription className="text-blue-700">
          Subscribe for ₱299/month to access all coding lessons and premium features. 
          <span className="block mt-1">Choose your preferred payment method:</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Button
            variant={selectedProvider === 'stripe' ? "default" : "outline"}
            className={`flex-1 ${selectedProvider === 'stripe' ? "bg-blue-600 hover:bg-blue-700" : ""}`}
            onClick={() => setSelectedProvider('stripe')}
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay with Card (Stripe)
          </Button>
          <Button
            variant={selectedProvider === 'paypal' ? "default" : "outline"}
            className={`flex-1 ${selectedProvider === 'paypal' ? "bg-yellow-400 hover:bg-yellow-500 text-black" : ""}`}
            onClick={() => setSelectedProvider('paypal')}
            disabled={loading}
          >
            <Paypal className="w-4 h-4 mr-2" />
            Pay with PayPal
          </Button>
        </div>
        <Button
          onClick={
            selectedProvider === 'stripe'
              ? createCheckoutSession
              : createPaypalCheckoutSession
          }
          disabled={loading}
          className={
            selectedProvider === 'paypal'
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black w-full'
              : 'bg-blue-600 hover:bg-blue-700 w-full'
          }
        >
          {loading
            ? "Loading..."
            : selectedProvider === 'paypal'
              ? "Subscribe with PayPal"
              : "Subscribe Now - ₱299/month"}
        </Button>
        <div className="text-xs mt-4 text-gray-500">
          <span className="font-semibold">PayPal works with individual accounts—no business name required!</span><br />
          Card payments via Stripe support Visa/Mastercard/GCash Card. More options coming soon.
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;
