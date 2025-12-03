import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

export function PageHeader({ title, subtitle, action, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="w-10 h-10 bg-palette-yellow rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-palette-dark" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
