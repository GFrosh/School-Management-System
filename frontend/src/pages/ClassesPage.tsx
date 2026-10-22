import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '../layout/PageHeader';
import { useClasses, useCreateClass } from '../api/hooks';
import { classCreateSchema, type ClassCreateValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { Button } from '../components/Button';
import { Input } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { SchoolClass } from '../api/types';
import styles from './SimplePage.module.css';

export function ClassesPage() {
  const classes = useClasses();
  const createClass = useCreateClass();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClassCreateValues>({
    resolver: zodResolver(classCreateSchema),
    defaultValues: { name: '', level: '' },
  });

  const columns: Column<SchoolClass>[] = [
    { key: 'name', header: 'Class', isRowHeader: true, render: (row) => row.name },
    { key: 'level', header: 'Level', render: (row) => row.level },
    { key: 'head', header: 'Class teacher', render: (row) => row.classTeacher?.name ?? <span className={styles.muted}>Unassigned</span> },
    {
      key: 'count',
      header: 'Headcount',
      align: 'end',
      render: (row) => (row.headcount === undefined ? '—' : String(row.headcount)),
    },
  ];

  const onSubmit = async (values: ClassCreateValues) => {
    try {
      await createClass.mutateAsync(values);
      toast.push(`${values.name} was created.`, 'success');
      setCreating(false);
      reset();
    } catch (error) {
      if (error instanceof TypedApiError && error.details.some((d) => d.field === 'name')) {
        setError('name', { message: 'A class with that name already exists.' });
        return;
      }
      toast.push(error instanceof TypedApiError ? error.message : 'The class was not created.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Classes"
        description="A class is a stable definition — JSS1A exists for a decade. Its population is per session and lives in enrolments, which is why a class is never created twice for a new year."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Add a class
          </Button>
        }
      />
      {classes.isLoading ? (
        <Skeleton rows={5} />
      ) : classes.isError ? (
        <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
      ) : (
        <Table
          caption="Class catalogue"
          columns={columns}
          rows={classes.data?.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No classes defined yet."
        />
      )}

      <Modal
        open={creating}
        title="Add a class"
        description="The class becomes available for enrolment immediately. A class name is unique across the school, so JSS1A cannot exist twice."
        confirmLabel="Create class"
        busy={isSubmitting || createClass.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => {
          setCreating(false);
          reset();
        }}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Class name" required hint="e.g. JSS1A" error={errors.name?.message} {...register('name')} />
          <Input label="Level" required hint="e.g. Junior Secondary 1" error={errors.level?.message} {...register('level')} />
        </form>
      </Modal>
    </>
  );
}
