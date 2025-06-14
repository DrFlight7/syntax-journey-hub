
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Check subscription status when user lands on success page
    const timer = setTimeout(() => {
      checkSubscription();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkSubscription]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Subscription Successful!
          </CardTitle>
          <CardDescription className="text-green-700">
            Welcome to premium! Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            You now have access to all premium coding lessons and features.
            Your subscription will automatically renew monthly.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="w-full"
          >
            Start Learning
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
