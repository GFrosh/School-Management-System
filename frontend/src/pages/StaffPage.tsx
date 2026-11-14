import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../layout/PageHeader';
import { useCreateStaff, useCreateTeacher, useStaff } from '../api/hooks';
import { TypedApiError } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { Staff, StaffType } from '../api/types';
import styles from './SimplePage.module.css';

const staffSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1, 'Last name is required'),
  staffType: z.enum(['teacher', 'bursar', 'librarian', 'cleaner', 'admin']),
});
type StaffValues = z.infer<typeof staffSchema>;
const labels: Record<StaffType, string> = { teacher: 'Teacher', bursar: 'Bursar', librarian: 'Librarian', cleaner: 'Cleaner', admin: 'Administrator' };

export function StaffPage() {
  const staff = useStaff();
  const createTeacher = useCreateTeacher();
  const createStaff = useCreateStaff();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [adminWarning, setAdminWarning] = useState<StaffValues | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { firstName: '', middleName: '', lastName: '', staffType: 'teacher' },
  });
  const columns: Column<Staff>[] = [
    { key: 'name', header: 'Staff member', isRowHeader: true, render: (row) => row.name },
    { key: 'type', header: 'Staff type', render: (row) => labels[row.staffType] },
    { key: 'staff', header: 'Staff number', render: (row) => <span className={styles.mono}>{row.staffNumber}</span> },
    { key: 'email', header: 'Login', render: (row) => row.email ?? <span className={styles.muted}>No account</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'published' : 'neutral'}>{row.status === 'active' ? 'Active' : 'Inactive'}</Badge> },
  ];
  const submit = async (values: StaffValues) => {
    if (values.staffType === 'admin') {
      setAdminWarning(values);
      return;
    }
    await create(values);
  };
  const create = async (values: StaffValues) => {
    try {
      if (values.staffType === 'teacher') {
        const { staffType: _staffType, ...teacherValues } = values;
        await createTeacher.mutateAsync(teacherValues);
      } else {
        await createStaff.mutateAsync(values);
      }
      toast.push(`${values.firstName} ${values.lastName} was added to the staff register.`, 'success');
      setCreating(false);
      setAdminWarning(null);
      reset();
    } catch (error) {
      toast.push(error instanceof TypedApiError ? error.message : 'The staff record was not created.', 'error');
    }
  };
  const busy = isSubmitting || createTeacher.isPending || createStaff.isPending;
  return <>
    <PageHeader title="Staff" description="Manage employees and their employment roles. Login accounts are attached separately from staff records." actions={<Button variant="primary" onClick={() => setCreating(true)}>Add a staff record</Button>} />
    {staff.isLoading ? <Skeleton rows={6} /> : staff.isError ? <ErrorState error={staff.error} onRetry={() => void staff.refetch()} /> : <Table caption="Staff records" columns={columns} rows={staff.data?.data ?? []} rowKey={(row) => row.id} emptyMessage="No staff records yet." />}
    <Modal open={creating} title="Add a staff record" description="Add an employee record and select their employment type. No login is created here." confirmLabel="Create record" busy={busy} onConfirm={handleSubmit(submit)} onClose={() => { setCreating(false); reset(); }}>
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Middle name" hint="Optional" error={errors.middleName?.message} {...register('middleName')} />
        <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
        <Select label="Staff type" required error={errors.staffType?.message} {...register('staffType')}><option value="teacher">Teacher</option><option value="bursar">Bursar</option><option value="librarian">Librarian</option><option value="cleaner">Cleaner</option><option value="admin">Administrator</option></Select>
        <p className={styles.muted}>The staff number is generated automatically. Creating a staff record does not create login credentials.</p>
      </form>
    </Modal>
    <Modal open={Boolean(adminWarning)} title="Confirm administrator staff record" description="Administrator employment records are sensitive. Confirm that this person should be recorded as an administrator. This does not grant application login permissions." confirmLabel="Confirm and create" destructive busy={busy} onConfirm={() => adminWarning && void create(adminWarning)} onClose={() => setAdminWarning(null)} />
  </>;
}
