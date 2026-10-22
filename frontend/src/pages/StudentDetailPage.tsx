import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import {
  useClasses,
  useCloseEnrolment,
  useCreateEnrolment,
  useEnrolments,
  useGuardians,
  useLinkGuardian,
  usePatchStudent,
  useSessions,
  useStudent,
  useUnlinkGuardian,
} from '../api/hooks';
import {
  enrolmentCreateSchema,
  studentUpdateSchema,
  type EnrolmentCreateValues,
  type StudentUpdateValues,
} from '../api/contract';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import { useToast } from '../components/Toast';
import { formatDate, humaniseStatus, todayISO } from '../utils/format';
import type { Enrolment } from '../api/types';
import styles from './StudentDetailPage.module.css';

export function StudentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const student = useStudent(id);
  const enrolments = useEnrolments(id);
  const guardians = useGuardians(id);
  const classes = useClasses();
  const sessions = useSessions();
  const createEnrolment = useCreateEnrolment(id);
  const closeEnrolment = useCloseEnrolment(id);
  const patchStudent = usePatchStudent(id);
  const linkGuardian = useLinkGuardian(id);
  const unlinkGuardian = useUnlinkGuardian(id);

  const [enrolling, setEnrolling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState<Enrolment | null>(null);
  const [unlinking, setUnlinking] = useState<{ parentId: string; name: string } | null>(null);

  const editForm = useForm<StudentUpdateValues>({
    resolver: zodResolver(studentUpdateSchema),
    values: student.data
      ? {
          name: student.data.data.name,
          dateOfBirth: student.data.data.dateOfBirth,
          status: student.data.data.status,
        }
      : undefined,
    defaultValues: { name: '', dateOfBirth: '', status: 'active' },
  });

  const enrolForm = useForm<EnrolmentCreateValues>({
    resolver: zodResolver(enrolmentCreateSchema),
    defaultValues: { classId: '', sessionId: '', enrolledOn: todayISO() },
  });

  if (student.isLoading) return <Skeleton rows={8} />;
  if (student.isError) {
    return (
      <ErrorState
        error={student.error}
        onRetry={() => void student.refetch()}
        forbiddenTitle="This pupil is outside your access"
      />
    );
  }

  const record = student.data?.data;
  if (!record) return <ErrorState error={new Error('The student record was empty.')} onRetry={() => void student.refetch()} />;

  const enrolmentColumns: Column<Enrolment>[] = [
    { key: 'session', header: 'Session', isRowHeader: true, render: (row) => row.session.name },
    { key: 'class', header: 'Class', render: (row) => row.class.name },
    { key: 'enrolled', header: 'Enrolled', render: (row) => formatDate(row.enrolledOn) },
    { key: 'ended', header: 'Closed', render: (row) => (row.endedOn ? formatDate(row.endedOn) : '—') },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'published' : 'neutral'}>{humaniseStatus(row.status)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (row) =>
        isAdmin && row.status === 'active' ? (
          <Button size="sm" variant="ghost" onClick={() => setClosing(row)}>
            Close placement
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={record.name}
        description={`Admission number ${record.admissionNumber} — this number is the school's identity for the pupil and cannot be changed.`}
        actions={isAdmin ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit demographics</Button> : undefined}
      />

      <section className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Record</h2>
          <dl className={styles.definition}>
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDate(record.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={record.status === 'active' ? 'published' : 'neutral'}>{humaniseStatus(record.status)}</Badge>
              </dd>
            </div>
            <div>
              <dt>Login</dt>
              <dd>{record.userId ? 'Account linked' : 'No account yet — the record exists without one'}</dd>
            </div>
            <div>
              <dt>Current placement</dt>
              <dd>
                {record.currentPlacement
                  ? `${record.currentPlacement.class.name} · ${record.currentPlacement.session.name}`
                  : 'Not currently placed'}
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Guardians</h2>
          </div>
          {guardians.isLoading ? (
            <Skeleton variant="text" rows={3} />
          ) : (guardians.data?.data.length ?? 0) === 0 ? (
            <p className={styles.muted}>
              No guardian is linked, so no parent can see this pupil&apos;s results. Access is computed from the link
              on every request — unlinking removes it immediately.
            </p>
          ) : (
            <ul className={styles.guardianList}>
              {(guardians.data?.data ?? []).map((guardian) => (
                <li key={guardian.id} className={styles.guardian}>
                  <div>
                    <p className={styles.guardianName}>
                      {guardian.name} {guardian.isPrimary ? <Badge tone="info">Primary contact</Badge> : null}
                    </p>
                    <p className={styles.muted}>
                      {guardian.relationship} · {guardian.phone ?? 'No phone'} · {guardian.email ?? 'No email'}
                    </p>
                  </div>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUnlinking({ parentId: guardian.parentId, name: guardian.name })}
                    >
                      Unlink
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {isAdmin ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                linkGuardian.mutate(
                  { parentId: '9d020000-0000-4000-8000-000000000003', relationship: 'Guardian', isPrimary: false },
                  {
                    onSuccess: () => toast.push('Guardian linked. They can now see published results.', 'success'),
                    onError: (error) =>
                      toast.push(
                        error instanceof TypedApiError ? error.message : 'The guardian could not be linked.',
                        'error',
                      ),
                  },
                );
              }}
              loading={linkGuardian.isPending}
            >
              Link the registered guardian
            </Button>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Placement history</h2>
          {isAdmin ? (
            <Button variant="primary" size="sm" onClick={() => setEnrolling(true)}>
              Enrol in a class
            </Button>
          ) : null}
        </div>
        {enrolments.isLoading ? (
          <Skeleton rows={4} />
        ) : enrolments.isError ? (
          <ErrorState error={enrolments.error} onRetry={() => void enrolments.refetch()} />
        ) : (enrolments.data?.data.length ?? 0) === 0 ? (
          <EmptyState
            title="No placement yet"
            explanation="A pupil is enrolled into a class for one academic session. Until that happens they appear on the register but in no class roster or attendance list."
          />
        ) : (
          <Table
            caption="Every placement this pupil has held, newest first"
            columns={enrolmentColumns}
            rows={enrolments.data?.data ?? []}
            rowKey={(row) => row.id}
            emptyMessage="No placements recorded."
          />
        )}
      </section>

      <Modal
        open={editing}
        title={`Edit ${record.name}`}
        description="Demographics and status only. The admission number is immutable, and academic history is never edited here — a wrong placement is closed and a new one created."
        confirmLabel="Save changes"
        busy={patchStudent.isPending}
        onConfirm={editForm.handleSubmit(async (values) => {
          try {
            await patchStudent.mutateAsync(values);
            toast.push('The record was updated.', 'success');
            setEditing(false);
          } catch (error) {
            toast.push(error instanceof TypedApiError ? error.message : 'The change was not saved.', 'error');
          }
        })}
        onClose={() => setEditing(false)}
      >
        <form className={styles.form}>
          <Input label="Full name" error={editForm.formState.errors.name?.message} {...editForm.register('name')} />
          <Input
            label="Date of birth"
            type="date"
            error={editForm.formState.errors.dateOfBirth?.message}
            {...editForm.register('dateOfBirth')}
          />
          <Select label="Status" {...editForm.register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </form>
      </Modal>

      <Modal
        open={enrolling}
        title={`Enrol ${record.name}`}
        description="One active placement per session. If the pupil already has a live placement for the chosen session the server refuses the request rather than replacing history."
        confirmLabel="Enrol"
        busy={createEnrolment.isPending}
        onConfirm={enrolForm.handleSubmit(async (values) => {
          try {
            await createEnrolment.mutateAsync(values);
            toast.push('Placement created.', 'success');
            setEnrolling(false);
            enrolForm.reset({ classId: '', sessionId: '', enrolledOn: todayISO() });
          } catch (error) {
            if (error instanceof TypedApiError && error.isConflict) {
              toast.push('This pupil is already enrolled for that session.', 'error');
              return;
            }
            toast.push(error instanceof TypedApiError ? error.message : 'The placement was not created.', 'error');
          }
        })}
        onClose={() => setEnrolling(false)}
      >
        <form className={styles.form}>
          <Select label="Class" required error={enrolForm.formState.errors.classId?.message} {...enrolForm.register('classId')}>
            <option value="">Choose a class</option>
            {(classes.data?.data ?? []).map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name} — {klass.level}
              </option>
            ))}
          </Select>
          <Select label="Session" required error={enrolForm.formState.errors.sessionId?.message} {...enrolForm.register('sessionId')}>
            <option value="">Choose a session</option>
            {(sessions.data?.data ?? []).map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
                {session.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Enrolled on"
            type="date"
            required
            error={enrolForm.formState.errors.enrolledOn?.message}
            {...enrolForm.register('enrolledOn')}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(closing)}
        title="Close this placement"
        description={
          closing
            ? `${record.name} will leave ${closing.class.name} in ${closing.session.name}. The row is kept as history and results already recorded under it stay attached to that class — nothing is deleted.`
            : ''
        }
        confirmLabel="Close placement"
        destructive
        busy={closeEnrolment.isPending}
        onConfirm={() => {
          if (!closing) return;
          closeEnrolment.mutate(
            { enrolmentId: closing.id, body: { status: 'transferred', endedOn: todayISO(), reason: 'Closed from the student record' } },
            {
              onSuccess: () => {
                toast.push('Placement closed. The history row remains.', 'success');
                setClosing(null);
              },
              onError: (error) =>
                toast.push(error instanceof TypedApiError ? error.message : 'The placement was not closed.', 'error'),
            },
          );
        }}
        onClose={() => setClosing(null)}
      />

      <Modal
        open={Boolean(unlinking)}
        title="Unlink this guardian"
        description={
          unlinking
            ? `${unlinking.name} will immediately lose access to ${record.name}'s attendance and published results. Their own account is untouched, and the link can be restored later.`
            : ''
        }
        confirmLabel="Unlink guardian"
        destructive
        busy={unlinkGuardian.isPending}
        onConfirm={() => {
          if (!unlinking) return;
          unlinkGuardian.mutate(unlinking.parentId, {
            onSuccess: () => {
              toast.push('Guardian unlinked. Access is already revoked.', 'success');
              setUnlinking(null);
            },
            onError: (error) =>
              toast.push(error instanceof TypedApiError ? error.message : 'The guardian could not be unlinked.', 'error'),
          });
        }}
        onClose={() => setUnlinking(null)}
      />

      <InlineNotice tone="info">
        Looking for results? A pupil&apos;s report card is opened from the class assignment, not from this screen —
        totals and grades are computed by the server for one term.
        <Button size="sm" variant="ghost" onClick={() => navigate(`/results`)}>
          Open the results workspace
        </Button>
      </InlineNotice>
    </>
  );
}
