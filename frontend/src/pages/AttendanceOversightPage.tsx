import { PageHeader } from '../layout/PageHeader';
import { useAssignments, useClasses, useStudents } from '../api/hooks';
import { Badge } from '../components/Badge';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState, InlineNotice } from '../components/States';
import { EmptyState } from '../components/EmptyState';
import { Link } from 'react-router-dom';
import type { Assignment } from '../api/types';
import styles from './AttendanceOversightPage.module.css';

/**
 * Oversight is read-only by design: the contract allows only the assigned
 * teacher to write a register (AC-06), so this screen routes the admin into the
 * register they can read rather than offering an edit control that would 403.
 */
export function AttendanceOversightPage() {
  const assignments = useAssignments();
  const classes = useClasses();
  const students = useStudents({ pageSize: 1 });

  const columns: Column<Assignment>[] = [
    {
      key: 'lesson',
      header: 'Lesson',
      isRowHeader: true,
      render: (row) => (
        <div>
          <p className={styles.title}>
            {row.class.name} · {row.subject.name}
          </p>
          <p className={styles.meta}>{row.term.name}</p>
        </div>
      ),
    },
    { key: 'teacher', header: 'Assigned teacher', render: (row) => row.teacher.name },
    {
      key: 'primary',
      header: 'Role',
      render: (row) => (row.isPrimary ? <Badge tone="info">Primary</Badge> : <Badge tone="neutral">Support</Badge>),
    },
    {
      key: 'open',
      header: 'Register',
      render: (row) => (
        <Link className={styles.link} to={`/attendance/${row.id}`}>
          Open register
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Attendance oversight"
        description="Every lesson keeps its own register, one row per enrolled pupil. A submitted register is locked; the count below is what the school reports on, not a figure entered by hand."
      />

      <div className={styles.summary}>
        <p>
          <strong>{assignments.data?.data.length ?? '—'}</strong> teaching assignments this term ·{' '}
          <strong>{classes.data?.data.length ?? '—'}</strong> classes ·{' '}
          <strong>{students.data?.meta?.total ?? '—'}</strong> pupils on the register
        </p>
      </div>

      <InlineNotice>
        Only the teacher assigned to a lesson may save or submit its register. Opening a register as an administrator shows the
        locked marks and the submission state.
      </InlineNotice>

      {assignments.isLoading ? (
        <Skeleton rows={6} />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : (assignments.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No lessons to oversee" explanation="Create teaching assignments before registers can exist." />
      ) : (
        <Table
          caption="Teaching assignments and their registers"
          columns={columns}
          rows={assignments.data?.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No assignments."
        />
      )}
    </>
  );
}
