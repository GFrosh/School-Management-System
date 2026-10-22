import { useMemo, useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { useMyResults } from '../api/hooks';
import { ReportCardView } from '../components/ReportCardView';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import type { ReportCard } from '../api/types';
import styles from './MyResultsPage.module.css';

/**
 * Students and guardians only ever receive published rows: the endpoint filters
 * `published_at IS NOT NULL` in SQL, and nothing here recomputes a total or a
 * grade — the API sends them already calculated.
 */
export function MyResultsPage() {
  const results = useMyResults();
  const groups = results.data?.data ?? [];
  const [childId, setChildId] = useState<string | null>(null);
  const [termIndex, setTermIndex] = useState(0);

  const activeChild = useMemo(
    () => groups.find((group) => group.student.id === childId) ?? groups[0] ?? null,
    [groups, childId],
  );

  const terms = activeChild?.terms ?? [];
  const activeTerm = terms[Math.min(termIndex, Math.max(terms.length - 1, 0))] ?? null;

  const card: ReportCard | null =
    activeChild && activeTerm
      ? {
          student: activeChild.student,
          class: '',
          term: activeTerm.term,
          session: activeTerm.session,
          subjects: activeTerm.subjects,
        }
      : null;

  return (
    <>
      <PageHeader
        title="My results"
        description="Only published results appear here. A score stays invisible until the school has approved and published it, and a corrected score is marked so you can tell it apart from the original."
      />

      {results.isLoading ? (
        <Skeleton rows={6} />
      ) : results.isError ? (
        <ErrorState error={results.error} onRetry={() => void results.refetch()} forbiddenTitle="No results are linked to this account" />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          explanation="When the school publishes a term's results they will appear here. If you are a guardian, the school must first link your account to your child's record."
        />
      ) : (
        <>
          {groups.length > 1 ? (
            <div className={styles.childPicker} role="tablist" aria-label="Children">
              {groups.map((group) => (
                <button
                  key={group.student.id}
                  type="button"
                  role="tab"
                  aria-selected={(activeChild?.student.id ?? '') === group.student.id}
                  className={[styles.childTab, (activeChild?.student.id ?? '') === group.student.id ? styles.childTabActive : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setChildId(group.student.id);
                    setTermIndex(0);
                  }}
                >
                  {group.student.name}
                </button>
              ))}
            </div>
          ) : null}

          {terms.length > 1 ? (
            <div className={styles.termPicker}>
              <label className={styles.termLabel} htmlFor="term-select">
                Term
              </label>
              <select
                id="term-select"
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

          <InlineNotice>
            Totals and grades come from the school's server, computed from the published scores below. The browser never calculates
            them, so this page cannot disagree with the official report card.
          </InlineNotice>

          {card ? (
            <ReportCardView
              card={card}
              note={groups.length > 1 ? `Viewing as guardian of ${card.student.name}` : undefined}
            />
          ) : (
            <EmptyState title="No term published" explanation="This child has no published term yet." />
          )}
        </>
      )}
    </>
  );
}
