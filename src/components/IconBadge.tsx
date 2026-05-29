import type { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function IconBadge({ icon: Icon, label, className = "" }: IconBadgeProps) {
  return (
    <span className={`icon-badge ${className}`} aria-label={label} title={label}>
      <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}
