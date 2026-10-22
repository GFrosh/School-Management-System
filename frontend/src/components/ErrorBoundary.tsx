import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './ErrorBoundary.module.css';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this is where a reporter (Sentry et al.) would be called.
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.page} role="alert">
        <h1 className={styles.title}>This screen stopped responding</h1>
        <p className={styles.body}>
          Nothing was saved. The rest of the system is still available — reload to continue, and if it happens again
          quote the reference below to the administrator.
        </p>
        <p className={styles.meta}>
          Reference <code>{this.state.error.message.slice(0, 120)}</code>
        </p>
        <Button variant="primary" onClick={() => window.location.assign('/')}>
          Reload the application
        </Button>
      </div>
    );
  }
}
