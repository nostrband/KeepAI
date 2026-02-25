import { cn } from '../lib/cn';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        'bg-gray-50 border border-border rounded-md px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all',
        className
      )}
    >
      {children}
    </pre>
  );
}
