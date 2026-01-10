import { Bot } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const BotsIcon = ({ className }: IconProps) => (
  <Bot className={className} />
);
