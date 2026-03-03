import { cn } from '../lib/cn';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        'bg-muted border border-border rounded-xl px-4 py-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all',
        className
      )}
    >
      {children}
    </pre>
  );
}
