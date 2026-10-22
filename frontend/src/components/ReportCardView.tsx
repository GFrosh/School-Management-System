import type { ReactNode } from 'react';
import type { ReportCard, ReportCardSubject } from '../api/types';
import { Badge } from './Badge';
import { RevisedMarker } from './ResultStatusBadge';
import { formatDate, formatDateTime } from '../utils/format';
import styles from './ReportCardView.module.css';

interface ReportCardViewProps {
  card: ReportCard;
  /** Extra line under the header, e.g. a guardian reading a child's card. */
  note?: ReactNode;
}

/**
 * Renders what the API computed. Totals, grades and revisions arrive already
 * calculated — nothing on this screen is derived in the browser, which is why
 * a report card can never disagree with the server.
 */
export function ReportCardView({ card, note }: ReportCardViewProps) {
  const empty = card.subjects.length === 0;
  const metaParts = [card.student.admissionNumber, card.class, card.term, card.session].filter(Boolean);

  return (
    <article className={styles.card} aria-labelledby="report-card-title">
      <header className={styles.head}>
        <div>
          <p className={styles.school}>Unity Secondary School</p>
          <h2 className={styles.student} id="report-card-title">
            {card.student.name}
          </h2>
          <p className={styles.meta}>{metaParts.join(' · ')}</p>
          {note ? <p className={styles.note}>{note}</p> : null}
        </div>
        <div className={styles.status}>
          {card.publishedAt === null ? (
            <Badge tone="pending">Not published</Badge>
          ) : card.publishedAt ? (
            <>
              <Badge tone="published">Published</Badge>
              <p className={styles.stamp}>{formatDateTime(card.publishedAt)}</p>
            </>
          ) : null}
        </div>
      </header>

      {empty ? (
        <p className={styles.empty}>
          No result has been published for this term yet. Scores appear here only after the school approves and publishes them.
        </p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>Results by subject, as published</caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Assessments</th>
                <th scope="col" className={styles.end}>
                  Total
                </th>
                <th scope="col" className={styles.end}>
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {card.subjects.map((subject: ReportCardSubject) => (
                <tr key={subject.subject}>
                  <th scope="row" className={styles.subjectCell}>
                    <span className={styles.subject}>{subject.subject}</span>
                    {subject.revised ? <RevisedMarker previous={subject.revision?.previousScore} next={subject.revision?.newScore} /> : null}
                  </th>
                  <td>
                    <ul className={styles.assessments}>
                      {subject.assessments.map((assessment, index) => (
                        <li key={`${subject.subject}-${assessment.name}-${index}`}>
                          <span>{assessment.name}</span>
                          <span className={styles.numeric}>
                            {assessment.score === null ? '—' : assessment.score} / {assessment.max}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={[styles.end, styles.numeric].join(' ')}>{subject.total}</td>
                  <td className={[styles.end, styles.grade].join(' ')}>{subject.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className={styles.foot}>
        <p>
          Grades and totals are calculated by the school's server from the published scores above. A revised subject keeps its
          earlier score in the correction history and is marked so it cannot be mistaken for the original.
        </p>
        {card.publishedAt ? <p className={styles.stamp}>Published {formatDate(card.publishedAt.slice(0, 10))}</p> : null}
      </footer>
    </article>
  );
}
