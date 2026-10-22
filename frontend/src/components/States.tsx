import type { ReactNode } from 'react';
import { TypedApiError } from '../api/client';
import { Button } from './Button';
import styles from './States.module.css';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Shown instead of a raw message when the server refused the request. */
  forbiddenTitle?: string;
}

/** Error state with the contract's requestId, so a report is actionable. */
export function ErrorState({ error, onRetry, forbiddenTitle }: ErrorStateProps) {
  const apiError = error instanceof TypedApiError ? error : null;
  const message = apiError?.message ?? (error instanceof Error ? error.message : 'The request failed.');

  return (
    <div className={styles.block} role="alert">
      <h2 className={styles.title}>
        {apiError?.isForbidden ? (forbiddenTitle ?? 'You do not have access to this') : 'Something went wrong'}
      </h2>
      <p className={styles.message}>{message}</p>
      {apiError?.requestId ? (
        <p className={styles.meta}>
          Request reference <code>{apiError.requestId}</code>
        </p>
      ) : null}
      {onRetry && !apiError?.isForbidden ? (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'success';
  children: ReactNode;
}) {
  return (
    <div className={[styles.notice, styles[tone]].join(' ')} role={tone === 'warning' ? 'alert' : undefined}>
      {children}
    </div>
  );
}
