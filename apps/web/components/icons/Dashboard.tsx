import { Home } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const DashboardIcon = ({ className }: IconProps) => (
  <Home className={className} />
);
