import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { useClasses, useCreateStudent, useSessions, useStudents } from '../api/hooks';
import { studentCreateSchema, type StudentCreateValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import { Badge } from '../components/Badge';
import { formatDate, humaniseStatus } from '../utils/format';
import type { StudentListItem } from '../api/types';
import styles from './StudentsPage.module.css';

export function StudentsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const q = params.get('q') ?? '';
  const classId = params.get('classId') ?? '';
  const requestedSessionId = params.get('sessionId') ?? '';
  const status = (params.get('status') as 'active' | 'inactive' | null) ?? '';
  const [searchDraft, setSearchDraft] = useState(q);
  const [creating, setCreating] = useState(false);

  const classes = useClasses();
  const sessions = useSessions();
  const currentSessionId = sessions.data?.data.find((session) => session.is_current)?.id ?? '';
  const sessionId = requestedSessionId || currentSessionId;
  const students = useStudents({
    q,
    classId: classId || undefined,
    sessionId: sessionId || undefined,
    status: status || undefined,
  });
  const createStudent = useCreateStudent();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentCreateValues>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: { name: '', admissionNumber: '', dateOfBirth: '', status: 'active' },
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const onSubmit = async (values: StudentCreateValues) => {
    try {
      await createStudent.mutateAsync(values);
      toast.push(`${values.name} was added to the register.`, 'success');
      setCreating(false);
      reset();
    } catch (error) {
      if (error instanceof TypedApiError) {
        const field = error.details[0]?.field;
        if (field === 'admissionNumber') {
          setError('admissionNumber', { message: error.details[0]?.message ?? 'That number is already in use.' });
          return;
        }
        setError('name', { message: error.message });
        return;
      }
      toast.push('The record could not be created. Nothing was saved.', 'error');
    }
  };

  const columns: Column<StudentListItem>[] = [
    {
      key: 'name',
      header: 'Pupil',
      isRowHeader: true,
      render: (row) => (
        <Link to={`/students/${row.id}`}>
          {[row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ')}
        </Link>
      ),
    },
    {
      key: 'admission',
      header: 'Admission no.',
      render: (row) => <span className={styles.mono}>{row.admission_number}</span>,
    },
    { key: 'dob', header: 'Date of birth', render: (row) => formatDate(row.date_of_birth) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'published' : 'neutral'}>{humaniseStatus(row.status)}</Badge>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (row) =>
        row.user_id ? <Badge tone="info">Linked</Badge> : <span className={styles.muted}>No login</span>,
    },
  ];

  const total = students.data?.data.length ?? 0;

  return (
    <>
      <PageHeader
        title="Students"
        description="Search by name or admission number."
        actions={
          isAdmin ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              Add a student
            </Button>
          ) : undefined
        }
      />

      <form
        className={styles.filters}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateParam('q', searchDraft.trim());
        }}
      >
        <Input
          label="Search"
          placeholder="Name or admission number"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <Select
          label="Class"
          value={classId}
          onChange={(event) => updateParam('classId', event.target.value)}
        >
          <option value="">All classes</option>
          {(classes.data?.data ?? []).map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </Select>
        <Select
          label="Session"
          value={sessionId}
          onChange={(event) => updateParam('sessionId', event.target.value)}
          disabled={sessions.isLoading || sessions.isError}
        >
          {sessions.isError ? (
            <option value="">Sessions unavailable</option>
          ) : (
            (sessions.data?.data ?? []).map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
                {session.is_current ? ' (current)' : ''}
              </option>
            ))
          )}
        </Select>
        <Select label="Status" value={status} onChange={(event) => updateParam('status', event.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <div className={styles.filterActions}>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      {students.isLoading ? (
        <Skeleton rows={10} />
      ) : students.isError ? (
        <ErrorState
          error={students.error}
          onRetry={() => void students.refetch()}
          forbiddenTitle="The students register is not available to this account"
        />
      ) : (students.data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title={q || classId || status ? 'No pupil matches those filters' : 'No pupils on record yet'}
          explanation={
            q || classId || status
              ? 'Clear the search or choose another class. Names are matched on any part of the name and on the admission number.'
              : 'Pupils are registered here first, without a login, and enrolled into a class afterwards. Add the first record to begin.'
          }
          action={
            isAdmin ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Add a student
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table caption="Students matching the current filters" columns={columns} rows={students.data?.data ?? []} rowKey={(row) => row.id} emptyMessage="No pupils match those filters." />
          <p className={styles.pageInfo}>
            {total} {total === 1 ? 'pupil' : 'pupils'}
          </p>
        </>
      )}

      <Modal
        open={creating}
        title="Add a student record"
        description="This creates the school's record of the pupil. It does not create a login — an account is attached separately, once the office decides the pupil needs one."
        confirmLabel="Create record"
        busy={isSubmitting || createStudent.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => {
          setCreating(false);
          reset();
        }}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Full name" required error={errors.name?.message} {...register('name')} />
          <Input
            label="Admission number"
            required
            hint="Immutable once saved, e.g. SMS/2026/0142"
            error={errors.admissionNumber?.message}
            {...register('admissionNumber')}
          />
          <Input label="Date of birth" type="date" required error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
          <Select label="Status" error={errors.status?.message} {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </form>
      </Modal>
    </>
  );
}
