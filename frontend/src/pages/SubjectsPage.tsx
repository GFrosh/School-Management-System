import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '../layout/PageHeader';
import { useCreateSubject, useSubjects } from '../api/hooks';
import { subjectCreateSchema, type SubjectCreateValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Checkbox, Input } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { Subject } from '../api/types';
import styles from './SimplePage.module.css';

export function SubjectsPage() {
  const subjects = useSubjects();
  const createSubject = useCreateSubject();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubjectCreateValues>({
    resolver: zodResolver(subjectCreateSchema),
    defaultValues: { code: '', name: '', isCore: false },
  });

  const columns: Column<Subject>[] = [
    { key: 'code', header: 'Code', isRowHeader: true, render: (row) => <span className={styles.mono}>{row.code}</span> },
    { key: 'name', header: 'Subject', render: (row) => row.name },
    {
      key: 'core',
      header: 'Type',
      render: (row) => (row.isCore ? <Badge tone="info">Core</Badge> : <Badge tone="neutral">Elective</Badge>),
    },
  ];

  const onSubmit = async (values: SubjectCreateValues) => {
    try {
      await createSubject.mutateAsync(values);
      toast.push(`${values.name} was added to the catalogue.`, 'success');
      setCreating(false);
      reset();
    } catch (error) {
      if (error instanceof TypedApiError && error.details.some((d) => d.field === 'code')) {
        setError('code', { message: 'That subject code is already in use.' });
        return;
      }
      toast.push(error instanceof TypedApiError ? error.message : 'The subject was not created.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Subjects"
        description="The subject catalogue is shared across classes. A subject is taught to a class by a teacher for one term through a teaching assignment."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Add a subject
          </Button>
        }
      />
      {subjects.isLoading ? (
        <Skeleton rows={5} />
      ) : subjects.isError ? (
        <ErrorState error={subjects.error} onRetry={() => void subjects.refetch()} />
      ) : (
        <Table
          caption="Subject catalogue"
          columns={columns}
          rows={subjects.data?.data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No subjects defined yet."
        />
      )}

      <Modal
        open={creating}
        title="Add a subject"
        description="Codes are unique and printed on report cards, so use the school's own abbreviation."
        confirmLabel="Create subject"
        busy={isSubmitting || createSubject.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => {
          setCreating(false);
          reset();
        }}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Code" required hint="e.g. MTH" error={errors.code?.message} {...register('code')} />
          <Input label="Subject name" required error={errors.name?.message} {...register('name')} />
          <Checkbox label="Core subject" hint="Core subjects appear on every pupil's report card." {...register('isCore')} />
        </form>
      </Modal>
    </>
  );
}
