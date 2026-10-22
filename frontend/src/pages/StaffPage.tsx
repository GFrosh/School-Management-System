import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../layout/PageHeader';
import { useCreateTeacher, useTeachers } from '../api/hooks';
import { TypedApiError } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { Teacher } from '../api/types';
import styles from './SimplePage.module.css';

/** DERIVED from the teachers entity (contract 5.5): staff_number (UK), name, status. */
const teacherSchema = z.object({
  name: z.string().min(2, 'Enter the staff member’s name'),
  staffNumber: z.string().min(3, 'Staff number is required'),
});
type TeacherValues = z.infer<typeof teacherSchema>;

export function StaffPage() {
  const teachers = useTeachers();
  const createTeacher = useCreateTeacher();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeacherValues>({ resolver: zodResolver(teacherSchema), defaultValues: { name: '', staffNumber: '' } });

  const columns: Column<Teacher>[] = [
    { key: 'name', header: 'Staff member', isRowHeader: true, render: (row) => row.name },
    { key: 'staff', header: 'Staff number', render: (row) => <span className={styles.mono}>{row.staffNumber}</span> },
    { key: 'email', header: 'Login', render: (row) => row.email ?? <span className={styles.muted}>No account</span> },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'published' : 'neutral'}>{row.status === 'active' ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ];

  const onSubmit = async (values: TeacherValues) => {
    try {
      await createTeacher.mutateAsync(values);
      toast.push(`${values.name} was added to the staff register.`, 'success');
      setCreating(false);
      reset();
    } catch (error) {
      if (error instanceof TypedApiError && error.details.some((d) => d.field === 'staffNumber')) {
        setError('staffNumber', { message: 'That staff number is already in use.' });
        return;
      }
      toast.push(error instanceof TypedApiError ? error.message : 'The staff record was not created.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        description="A staff record is separate from a login. A teacher can hold an assignment before an account exists, and a suspended login never deletes the teaching history."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Add a staff record
          </Button>
        }
      />
      {teachers.isLoading ? (
        <Skeleton rows={6} />
      ) : teachers.isError ? (
        <ErrorState error={teachers.error} onRetry={() => void teachers.refetch()} />
      ) : (
        <Table
          caption="Staff records"
          columns={columns}
          rows={teachers.data?.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No staff records yet."
        />
      )}

      <Modal
        open={creating}
        title="Add a staff record"
        description="Creates the school's record of a staff member. No login is created here — an account is attached separately so a teacher can exist on the timetable before they can sign in."
        confirmLabel="Create record"
        busy={isSubmitting || createTeacher.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => {
          setCreating(false);
          reset();
        }}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Full name" required error={errors.name?.message} {...register('name')} />
          <Input label="Staff number" required hint="e.g. STF/2026/031" error={errors.staffNumber?.message} {...register('staffNumber')} />
        </form>
      </Modal>
    </>
  );
}
