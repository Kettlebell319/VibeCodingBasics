import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to VibeCoding!
          </CardTitle>
          <CardDescription>
            Your subscription has been activated successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              You now have access to all the features of your selected plan.
            </p>
            <p className="text-sm text-gray-500">
              A confirmation email has been sent to your inbox.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/" className="w-full">
              <Button className="w-full">
                Start Asking Questions
              </Button>
            </Link>
            
            <Link href="/subscription" className="w-full">
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}