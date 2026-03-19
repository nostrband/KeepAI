import { FileText, Github, Globe, Trello, Twitter } from 'lucide-react';
import { cn } from '../lib/cn';

interface ServiceIconProps {
  service: string;
  className?: string;
}

function StripeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.076c0 4.72 2.891 6.394 6.572 7.776 2.36.888 3.174 1.554 3.174 2.546 0 .992-.838 1.602-2.382 1.602-2.036 0-4.886-.884-6.908-2.088l-.9 5.555C5.038 23.477 7.879 24 11.076 24c2.582 0 4.7-.636 6.234-1.896 1.636-1.34 2.432-3.196 2.432-5.482 0-4.876-2.96-6.542-5.766-7.472z" />
    </svg>
  );
}

function HetznerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 4h2.6v6.4h12.4V4H20.8v16h-2.6v-7.2H5.8V20H3.2V4z" />
    </svg>
  );
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
    case 'x':
      return <Twitter className={cn(iconClass, 'text-gray-800')} />;
    case 'stripe':
      return <StripeIcon className={cn(iconClass, 'text-[#635bff]')} />;
    case 'hetzner':
      return <HetznerIcon className={cn(iconClass, 'text-[#d50c2d]')} />;
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
    case 'x': return 'X';
    case 'stripe': return 'Stripe';
    case 'hetzner': return 'Hetzner Cloud';
    default: return service;
  }
}
