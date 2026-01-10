import { Megaphone } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const PromotionalIcon = ({ className }: IconProps) => (
  <Megaphone className={className} />
);
