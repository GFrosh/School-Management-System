import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import {
  useAssignments,
  useClasses,
  useCreateAssignment,
  useDeleteAssignment,
  useSessions,
  useSubjects,
  useTeachers,
  useTerms,
} from '../api/hooks';
import { assignmentCreateSchema, type AssignmentCreateValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Checkbox, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { Assignment } from '../api/types';
import styles from './AssignmentsPage.module.css';

export function AssignmentsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  const [termId, setTermId] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Assignment | null>(null);

  const sessions = useSessions();
  const currentSessionId = sessions.data?.data.find((s) => s.isCurrent)?.id ?? '';
  const terms = useTerms(currentSessionId || undefined);
  const classes = useClasses();
  const subjects = useSubjects();
  const teachers = useTeachers();
  const assignments = useAssignments({ termId: termId || undefined });
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const termOptions = terms.data?.data ?? [];
  const effectiveTermId = termId || termOptions[0]?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentCreateValues>({
    resolver: zodResolver(assignmentCreateSchema),
    defaultValues: { teacherId: '', classId: '', subjectId: '', termId: '', isPrimary: false },
  });

  const columns = useMemo<Column<Assignment>[]>(() => {
    const base: Column<Assignment>[] = [
      {
        key: 'subject',
        header: 'Subject',
        isRowHeader: true,
        render: (row) => (
          <div>
            <p className={styles.cellTitle}>{row.subject.name}</p>
            <p className={styles.cellMeta}>{row.class.name}</p>
          </div>
        ),
      },
      { key: 'teacher', header: 'Teacher', render: (row) => row.teacher.name },
      { key: 'term', header: 'Term', render: (row) => row.term.name },
      {
        key: 'role',
        header: 'Role',
        render: (row) => (row.isPrimary ? <Badge tone="info">Primary</Badge> : <Badge tone="neutral">Support</Badge>),
      },
      {
        key: 'actions',
        header: 'Register',
        render: (row) => (
          <div className={styles.rowActions}>
            <Link className={styles.link} to={`/attendance/${row.id}`}>
              Attendance
            </Link>
            {isAdmin ? (
              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(row)}>
                Remove
              </Button>
            ) : null}
          </div>
        ),
      },
    ];
    return base;
  }, [isAdmin]);

  const onSubmit = async (values: AssignmentCreateValues) => {
    try {
      await createAssignment.mutateAsync(values);
      toast.push('The assignment is active for this term.', 'success');
      setCreating(false);
      reset({ teacherId: '', classId: '', subjectId: '', termId: effectiveTermId, isPrimary: false });
    } catch (error) {
      if (error instanceof TypedApiError && error.code === 'CONFLICT') {
        setError('classId', { message: 'A primary teacher already holds this class, subject and term.' });
        return;
      }
      toast.push(error instanceof TypedApiError ? error.message : 'The assignment was not created.', 'error');
    }
  };

  const onConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAssignment.mutateAsync(pendingDelete.id);
      toast.push('The assignment was removed.', 'success');
      setPendingDelete(null);
    } catch (error) {
      toast.push(error instanceof TypedApiError ? error.message : 'The assignment was not removed.', 'error');
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Teaching assignments"
        description="A teacher reaches a class only through an assignment for the current term. Removing an assignment after results exist is refused by the server, because the academic record outlives the timetable."
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              onClick={() => {
                reset({ teacherId: '', classId: '', subjectId: '', termId: effectiveTermId, isPrimary: false });
                setCreating(true);
              }}
            >
              Assign a teacher
            </Button>
          ) : undefined
        }
      />

      <div className={styles.filters}>
        <Select label="Term" value={termId || effectiveTermId} onChange={(event) => setTermId(event.target.value)}>
          <option value="">All terms in the current session</option>
          {termOptions.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </Select>
      </div>

      {assignments.isLoading ? (
        <Skeleton rows={6} />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : (assignments.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No assignments"
          explanation={
            isAdmin
              ? 'Assign a teacher to a class and subject for the current term. Until then nobody can take a register or enter a score for it.'
              : 'You have no teaching assignments for this term. Ask the administrator to assign you to a class and subject.'
          }
        />
      ) : (
        <Table
          caption="Teaching assignments"
          columns={columns}
          rows={assignments.data?.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No assignments for this filter."
        />
      )}

      <Modal
        open={creating}
        title="Assign a teacher"
        description="This gives the teacher the class roster for the term. Marking it primary reserves the class and subject — a second primary teacher for the same combination is refused."
        confirmLabel="Create assignment"
        busy={isSubmitting || createAssignment.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => setCreating(false)}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Select label="Teacher" required error={errors.teacherId?.message} {...register('teacherId')}>
            <option value="">Choose a teacher</option>
            {(teachers.data?.data ?? [])
              .filter((teacher) => teacher.status === 'active')
              .map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} — {teacher.staffNumber}
                </option>
              ))}
          </Select>
          <Select label="Class" required error={errors.classId?.message} {...register('classId')}>
            <option value="">Choose a class</option>
            {(classes.data?.data ?? []).map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
          </Select>
          <Select label="Subject" required error={errors.subjectId?.message} {...register('subjectId')}>
            <option value="">Choose a subject</option>
            {(subjects.data?.data ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </Select>
          <Select label="Term" required error={errors.termId?.message} {...register('termId')}>
            <option value="">Choose a term</option>
            {termOptions.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </Select>
          <Checkbox label="Primary teacher" hint="One primary teacher per class, subject and term." {...register('isPrimary')} />
        </form>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title="Remove this assignment?"
        description={
          pendingDelete
            ? `${pendingDelete.teacher.name} would no longer reach ${pendingDelete.class.name} for ${pendingDelete.subject.name} (${pendingDelete.term.name}). Registers and scores already recorded are kept; the server refuses the removal if results or registers reference it.`
            : ''
        }
        confirmLabel="Remove assignment"
        destructive
        busy={deleteAssignment.isPending}
        onConfirm={() => void onConfirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
