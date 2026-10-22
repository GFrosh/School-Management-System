import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  /** Explain why it is empty and what to do next. */
  explanation: string;
  action?: ReactNode;
}

export function EmptyState({ title, explanation, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.explanation}>{explanation}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
