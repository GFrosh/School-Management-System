import { Link } from 'react-router-dom';
import styles from './StatusPage.module.css';

/**
 * A real 403 page, not a blank screen. Reached by direct URL edit as well as by
 * the route guard, because the UI is never the security boundary.
 */
export function ForbiddenPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>403</p>
      <h1 className={styles.title}>This record is outside your access</h1>
      <p className={styles.body}>
        Your account is signed in, but this page belongs to a class, subject or child you are not attached to. If you
        believe you should have access, ask the school office to check your teaching assignments or guardian links —
        both are what the server consults on every request.
      </p>
      <Link className={styles.link} to="/">
        Return to your home screen
      </Link>
    </div>
  );
}
