import { Check, HelpCircle, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/cn';

type PolicyAction = 'allow' | 'ask' | 'deny';
type CategoryAction = PolicyAction | 'custom';

interface PolicySwitchOption<T extends string> {
  value: T;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  hoverClass: string;
}

const ACTION_OPTIONS: PolicySwitchOption<CategoryAction>[] = [
  {
    value: 'allow',
    icon: <Check className="w-3.5 h-3.5" />,
    label: 'Allow',
    activeClass: 'bg-emerald-500 text-white shadow-sm',
    hoverClass: 'hover:bg-emerald-50 hover:text-emerald-600',
  },
  {
    value: 'ask',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    label: 'Ask',
    activeClass: 'bg-amber-500 text-white shadow-sm',
    hoverClass: 'hover:bg-amber-50 hover:text-amber-600',
  },
  {
    value: 'deny',
    icon: <X className="w-3.5 h-3.5" />,
    label: 'Deny',
    activeClass: 'bg-red-500 text-white shadow-sm',
    hoverClass: 'hover:bg-red-50 hover:text-red-600',
  },
  {
    value: 'custom',
    icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
    label: 'Custom',
    activeClass: 'bg-blue-500 text-white shadow-sm',
    hoverClass: 'hover:bg-blue-50 hover:text-blue-600',
  },
];

interface PolicySwitchProps {
  value: CategoryAction;
  onChange: (value: CategoryAction) => void;
  showCustom?: boolean;
}

export function PolicySwitch({ value, onChange, showCustom = true }: PolicySwitchProps) {
  const options = showCustom ? ACTION_OPTIONS : ACTION_OPTIONS.filter((o) => o.value !== 'custom');

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.label}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              isActive
                ? option.activeClass
                : cn('text-muted-foreground', option.hoverClass)
            )}
          >
            {option.icon}
            <span className={cn(isActive ? '' : 'hidden sm:inline')}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
