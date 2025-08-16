// components/ui/tier-badge.tsx
import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'free' | 'pro';
  className?: string;
}

export default function TierBadge({ tier, className }: TierBadgeProps) {
  const config = {
    free: {
      label: 'Free',
      variant: 'secondary' as const,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    pro: {
      label: 'Pro', 
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    }
  };

  // Handle cases where tier might be undefined or an old value
  const tierConfig = config[tier as keyof typeof config];
  
  if (!tierConfig) {
    // Fallback for undefined or old tier values
    return (
      <Badge variant="secondary" className={`bg-gray-100 text-gray-700 border-gray-200 ${className || ''}`}>
        {tier || 'Free'}
      </Badge>
    );
  }

  const { label, variant, className: tierClassName } = tierConfig;

  return (
    <Badge variant={variant} className={`${tierClassName} ${className || ''}`}>
      {label}
    </Badge>
  );
}