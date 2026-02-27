import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Plug,
  Bot,
  ShieldCheck,
  ScrollText,
  Settings,
  Menu,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useQueue } from '../hooks/use-queue';
import { cn } from '../lib/cn';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/connections', label: 'Connections', icon: Plug },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/approvals', label: 'Approvals', icon: ShieldCheck },
  { path: '/logs', label: 'Logs', icon: ScrollText },
];

export function Header() {
  const location = useLocation();
  const { data: queue } = useQueue();
  const pendingCount = queue?.length ?? 0;

  return (
    <header className="h-[var(--header-height)] border-b border-border bg-white flex items-center px-4 shrink-0">
      <Link to="/" className="text-lg font-semibold text-foreground mr-auto flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="w-6 h-6" />
        KeepAI
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#E5372A]/10 text-[#E5372A] border border-[#E5372A]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5372A] animate-pulse" />
          Beta
        </span>
      </Link>

      {pendingCount > 0 && (
        <Link
          to="/approvals"
          className="mr-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {pendingCount}
          </span>
        </Link>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-[180px]">
          {navItems.map((item) => (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md outline-none cursor-pointer',
                  location.pathname === item.path
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.path === '/approvals' && pendingCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md outline-none cursor-pointer text-foreground hover:bg-accent"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
