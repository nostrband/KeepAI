import { FileText, Github, Globe, Trello } from 'lucide-react';
import { cn } from '../lib/cn';

interface ServiceIconProps {
  service: string;
  className?: string;
}

export function ServiceIcon({ service, className }: ServiceIconProps) {
  const iconClass = cn('w-5 h-5', className);

  switch (service) {
    case 'gmail':
      return <img src="/gmail.png" alt="Gmail" className={iconClass} />;
    case 'notion':
      return <FileText className={cn(iconClass, 'text-gray-800')} />;
    case 'github':
      return <Github className={cn(iconClass, 'text-gray-800')} />;
    case 'airtable':
      return <img src="/airtable.png" alt="Airtable" className={iconClass} />;
    case 'trello':
      return <Trello className={cn(iconClass, 'text-blue-600')} />;
    default:
      return <Globe className={cn(iconClass, 'text-gray-500')} />;
  }
}

export function serviceName(service: string): string {
  switch (service) {
    case 'gmail': return 'Gmail';
    case 'notion': return 'Notion';
    case 'github': return 'GitHub';
    case 'airtable': return 'Airtable';
    case 'trello': return 'Trello';
    default: return service;
  }
}
