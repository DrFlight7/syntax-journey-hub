
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, CreditCard, Wallet } from 'lucide-react';

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
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={createCheckoutSession}
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? "Processing..." : "Pay with Card (Stripe)"}
          </Button>
          <Button
            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
            onClick={createPaypalCheckoutSession}
            disabled={loading}
          >
            <Wallet className="w-4 h-4 mr-2" />
            {loading ? "Processing..." : "Pay with PayPal"}
          </Button>
        </div>
        <div className="text-xs mt-4 text-gray-500">
          <span className="font-semibold">PayPal works with individual accounts—no business name required!</span><br />
          Card payments via Stripe support Visa/Mastercard/GCash Card. More options coming soon.
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;
