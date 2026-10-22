import { Link } from 'react-router-dom';
import styles from './StatusPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>That page does not exist</h1>
      <p className={styles.body}>
        The address may be mistyped, or the record may have been closed. Closed records are kept as history rather
        than deleted, so a search from the students screen will usually still find the pupil.
      </p>
      <Link className={styles.link} to="/">
        Return to your home screen
      </Link>
    </div>
  );
}
