import React from 'react';
import * as LucideIcons from 'lucide-react';

export interface AppIconProps {
  name: string;
  className?: string;
}

/**
 * AppIcon: Pure stateless icon wrapper without any internal hooks.
 * Dynamically resolves icons by name safely, falling back to LucideIcons.HelpCircle.
 */
export const AppIcon: React.FC<AppIconProps> = ({ name, className }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

export default AppIcon;
