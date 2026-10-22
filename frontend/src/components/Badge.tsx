import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'pending' | 'published' | 'info' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}

/**
 * Status is never communicated by colour alone: every badge carries its own
 * word, and an icon when a tone needs to be scannable.
 */
export function Badge({ tone = 'neutral', icon, children, title }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')} title={title}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}
