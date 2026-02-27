import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center gap-2 ${className ?? 'mb-6'}`}>
      <button
        onClick={() => navigate(-1)}
        className="p-1 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h1 className="text-2xl font-bold">{children}</h1>
    </div>
  );
}
