import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { useClasses, useCreateStudent, useStudents } from '../api/hooks';
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
import type { Student } from '../api/types';
import styles from './StudentsPage.module.css';

const PAGE_SIZE = 25;

export function StudentsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const q = params.get('q') ?? '';
  const classId = params.get('classId') ?? '';
  const status = (params.get('status') as 'active' | 'inactive' | null) ?? '';
  const page = Number(params.get('page') ?? 1);

  const [searchDraft, setSearchDraft] = useState(q);
  const [creating, setCreating] = useState(false);

  const classes = useClasses();
  const students = useStudents({ q, classId: classId || undefined, status: status || undefined, page, pageSize: PAGE_SIZE });
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

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Pupil',
      isRowHeader: true,
      render: (row) => <Link to={`/students/${row.id}`}>{row.name}</Link>,
    },
    { key: 'admission', header: 'Admission no.', render: (row) => <span className={styles.mono}>{row.admissionNumber}</span> },
    {
      key: 'class',
      header: 'Current class',
      render: (row) => row.currentPlacement?.class.name ?? <span className={styles.muted}>Not placed</span>,
    },
    {
      key: 'session',
      header: 'Session',
      render: (row) => row.currentPlacement?.session.name ?? '—',
    },
    { key: 'dob', header: 'Date of birth', render: (row) => formatDate(row.dateOfBirth) },
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
        row.userId ? <Badge tone="info">Linked</Badge> : <span className={styles.muted}>No login</span>,
    },
  ];

  const total = students.data?.meta?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Students"
        description="Search by name or admission number. Placements are history rows, so a pupil who has moved class still shows every session they were enrolled in."
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
          <nav className={styles.pagination} aria-label="Student list pages">
            <p className={styles.pageInfo}>
              Page {page} of {lastPage} · {total} {total === 1 ? 'pupil' : 'pupils'}
            </p>
            <div className={styles.pageButtons}>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => updateParam('page', String(page + 1))}>
                Next
              </Button>
            </div>
          </nav>
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
