import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { useAssessments, useAssignments, useSessions, useTerms } from '../api/hooks';
import { Select } from '../components/Field';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import type { Assessment } from '../api/types';
import styles from './ResultsWorkspacePage.module.css';

interface Row extends Assessment {
  lesson: string;
  teacher: string;
}

/**
 * The admin's landing screen for results. Everything shown here is what the API
 * returned: no total, no grade, no position is computed in the browser.
 */
export function ResultsWorkspacePage() {
  const sessions = useSessions();
  const currentSessionId = sessions.data?.data.find((s) => s.isCurrent)?.id ?? '';
  const terms = useTerms(currentSessionId || undefined);
  const [termId, setTermId] = useState('');

  const assignments = useAssignments();
  const assessments = useAssessments({ termId: termId || undefined });

  const lessonById = useMemo(() => {
    const map = new Map<string, string>();
    (assignments.data?.data ?? []).forEach((row) => {
      map.set(row.id, `${row.class.name} · ${row.subject.name}`);
    });
    return map;
  }, [assignments.data]);

  const teacherById = useMemo(() => {
    const map = new Map<string, string>();
    (assignments.data?.data ?? []).forEach((row) => {
      map.set(row.id, row.teacher.name);
    });
    return map;
  }, [assignments.data]);

  const rows: Row[] = (assessments.data?.data ?? []).map((assessment) => ({
    ...assessment,
    lesson: lessonById.get(assessment.teachingAssignmentId) ?? 'Unknown lesson',
    teacher: teacherById.get(assessment.teachingAssignmentId) ?? '—',
  }));

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Assessment',
      isRowHeader: true,
      render: (row) => (
        <div>
          <p className={styles.title}>{row.name}</p>
          <p className={styles.meta}>
            {row.lesson} · {row.teacher}
          </p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => row.type.toUpperCase() },
    {
      key: 'max',
      header: 'Out of',
      align: 'end',
      render: (row) => <span className={styles.numeric}>{row.maximumScore}</span>,
    },
    {
      key: 'weight',
      header: 'Weight',
      align: 'end',
      render: (row) => <span className={styles.numeric}>{row.weight}</span>,
    },
    {
      key: 'open',
      header: 'Score sheet',
      render: (row) => (
        <Link className={styles.link} to={`/results/${row.id}`}>
          Open
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Results workspace"
        description="Scores move through four states — draft, submitted, approved, published. A pupil sees a score only once it is published, and the interface filters on that flag as a second line of defence."
      />

      <div className={styles.filters}>
        <Select label="Term" value={termId} onChange={(event) => setTermId(event.target.value)}>
          <option value="">All terms in the current session</option>
          {(terms.data?.data ?? []).map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </Select>
      </div>

      <InlineNotice>
        Approving and publishing are separate steps, and the teacher who entered a score can never approve it. A correction after
        publication keeps the old score in the revision history rather than overwriting it.
      </InlineNotice>

      {assessments.isLoading ? (
        <Skeleton rows={6} />
      ) : assessments.isError ? (
        <ErrorState error={assessments.error} onRetry={() => void assessments.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          explanation="An assessment belongs to a teaching assignment and a term. Create the assignment first, then define CA tests and examinations against it."
        />
      ) : (
        <Table
          caption="Assessments"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No assessments for this term."
        />
      )}
    </>
  );
}
