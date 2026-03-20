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

function CloudflareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.509 16.516c.149-.084.264-.224.322-.399l.683-2.371c.039-.132.048-.272.023-.406a.645.645 0 00-.181-.361.603.603 0 00-.357-.171.618.618 0 00-.395.072l-3.158 1.729a1.74 1.74 0 00-.493-.226H6.39c-.07 0-.138.011-.203.032l.267-.922c.101-.345.088-.714-.032-1.05a1.599 1.599 0 00-.702-.844l-1.372-.86a.126.126 0 01-.059-.08.126.126 0 01.009-.099c.023-.041.06-.07.104-.081l.56-.156c.539-.15.987-.52 1.237-1.02.249-.498.282-1.077.09-1.6l-.903-2.5a.133.133 0 01.004-.101.133.133 0 01.075-.068l.114-.032a5.918 5.918 0 014.034.534 5.89 5.89 0 012.791 3.092c.34-.119.709-.09 1.025.08a1.26 1.26 0 01.617.791 3.193 3.193 0 012.455 1.455 3.17 3.17 0 01.407 2.809l-.372 1.29a.133.133 0 01-.065.079.129.129 0 01-.1.008l-.197-.068c-.061.209-.166.403-.31.561zM3.201 16.516a.874.874 0 00.625-.26.874.874 0 00.26-.625.874.874 0 00-.26-.625.874.874 0 00-.625-.26.874.874 0 00-.625.26.874.874 0 00-.26.625c0 .237.093.46.26.625.168.168.39.26.625.26z" />
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
    case 'agentmail':
      return <img src="/agentmail.png" alt="AgentMail" className={iconClass} />;
    case 'cloudflare':
      return <CloudflareIcon className={cn(iconClass, 'text-[#f48120]')} />;
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
    case 'agentmail': return 'AgentMail';
    case 'cloudflare': return 'Cloudflare';
    default: return service;
  }
}
