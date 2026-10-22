import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { useMyResults } from '../api/hooks';
import { ReportCardView } from '../components/ReportCardView';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/States';
import type { ReportCard } from '../api/types';
import styles from './ChildrenResultsPage.module.css';

/**
 * A guardian's view of one child. The child is resolved from /me/results, so the
 * screen only ever renders students the server already agreed this account may
 * see — a hand-typed id in the URL cannot widen access.
 */
export function ChildrenResultsPage() {
  const { studentId = '' } = useParams();
  const results = useMyResults();
  const [termIndex, setTermIndex] = useState(0);

  const group = useMemo(
    () => results.data?.data.find((row) => row.student.id === studentId) ?? null,
    [results.data, studentId],
  );

  const terms = group?.terms ?? [];
  const activeTerm = terms[Math.min(termIndex, Math.max(terms.length - 1, 0))] ?? null;

  const card: ReportCard | null =
    group && activeTerm
      ? {
          student: group.student,
          class: '',
          term: activeTerm.term,
          session: activeTerm.session,
          subjects: activeTerm.subjects,
        }
      : null;

  return (
    <>
      <PageHeader
        title={group ? group.student.name : 'Child results'}
        description="Results published for this child. Nothing unpublished is shown, and a revised subject keeps its earlier score in the correction history."
        actions={
          <Link className={styles.back} to="/my/results">
            My results
          </Link>
        }
      />

      {results.isLoading ? (
        <Skeleton rows={6} />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => void results.refetch()} forbiddenTitle="This student is outside your access" />
      ) : !group ? (
        <EmptyState
          title="This child is not linked to your account"
          explanation="A guardian sees a child's results only while the school's guardian link exists. Ask the school office to check the link on the student's record."
          action={
            <Link className={styles.back} to="/my/results">
              Back to my results
            </Link>
          }
        />
      ) : terms.length === 0 ? (
        <EmptyState title="Nothing published yet" explanation="No term has been published for this child." />
      ) : (
        <>
          {terms.length > 1 ? (
            <div className={styles.termPicker}>
              <label className={styles.termLabel} htmlFor="child-term">
                Term
              </label>
              <select
                id="child-term"
                className={styles.termSelect}
                value={termIndex}
                onChange={(event) => setTermIndex(Number(event.target.value))}
              >
                {terms.map((term, index) => (
                  <option key={term.termId} value={index}>
                    {term.term} — {term.session}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {card ? <ReportCardView card={card} note="Guardian copy" /> : null}
        </>
      )}
    </>
  );
}
