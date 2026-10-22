import styles from './Skeleton.module.css';

interface SkeletonProps {
  rows?: number;
  /** Match the final layout: a table-shaped placeholder, not a lone spinner. */
  variant?: 'table' | 'text' | 'cards';
}

export function Skeleton({ rows = 6, variant = 'table' }: SkeletonProps) {
  if (variant === 'cards') {
    return (
      <div className={styles.cards} aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={styles.card} />
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={styles.text} aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <span key={index} className={styles.line} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.table} aria-hidden="true">
      <div className={styles.head} />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={styles.row} />
      ))}
    </div>
  );
}

export function SkeletonStatus({ label = 'Loading' }: { label?: string }) {
  return (
    <p role="status" className={styles.status}>
      <span className={styles.dot} aria-hidden="true" />
      {label}…
    </p>
  );
}
