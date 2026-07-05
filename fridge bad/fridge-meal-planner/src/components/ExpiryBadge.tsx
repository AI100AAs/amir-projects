import { cn, expiryColor, expiryLabel } from '../lib/utils';

interface Props {
  days: number | undefined;
  className?: string;
}

export default function ExpiryBadge({ days, className }: Props) {
  if (days === undefined) return null;
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      expiryColor(days),
      className,
    )}>
      {expiryLabel(days)}
    </span>
  );
}
