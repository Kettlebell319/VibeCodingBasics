// components/ui/tier-badge.tsx
import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'explorer' | 'builder' | 'expert';
  className?: string;
}

export default function TierBadge({ tier, className }: TierBadgeProps) {
  const config = {
    explorer: {
      label: 'Explorer',
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    builder: {
      label: 'Builder', 
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    expert: {
      label: 'Expert',
      variant: 'default' as const, 
      className: 'bg-purple-100 text-purple-700 border-purple-200'
    }
  };

  const { label, variant, className: tierClassName } = config[tier];

  return (
    <Badge variant={variant} className={`${tierClassName} ${className || ''}`}>
      {label}
    </Badge>
  );
}