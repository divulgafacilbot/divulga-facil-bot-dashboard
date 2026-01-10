import { FileText } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const TemplatesIcon = ({ className }: IconProps) => (
  <FileText className={className} />
);
