import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { useAssignments, useRegister, useRoster, useSaveRegister, useSubmitRegister } from '../api/hooks';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AttendanceGrid, type MarkMap } from '../components/AttendanceGrid';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import { useToast } from '../components/Toast';
import { formatDate, todayISO } from '../utils/format';
import styles from './TakeAttendancePage.module.css';

export function TakeAttendancePage() {
  const { assignmentId = '' } = useParams();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  const [date, setDate] = useState(todayISO());
  const [periodNo, setPeriodNo] = useState(1);
  const [marks, setMarks] = useState<MarkMap>({});
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const assignments = useAssignments();
  const assignment = assignments.data?.data.find((row) => row.id === assignmentId) ?? null;

  const roster = useRoster(assignmentId);
  const register = useRegister(assignmentId, date, periodNo, Boolean(assignmentId));
  const saveRegister = useSaveRegister();
  const submitRegister = useSubmitRegister();

  const registerData = register.data?.data ?? null;
  const alreadySubmitted = registerData?.status === 'submitted';
  const locked = alreadySubmitted || isAdmin;
  const isFuture = date > todayISO();

  useEffect(() => {
    if (registerData?.records) {
      const next: MarkMap = {};
      registerData.records.forEach((record) => {
        next[record.enrolmentId] = record.status;
      });
      setMarks(next);
      setRegisterId(registerData.id);
    }
  }, [registerData]);

  useEffect(() => {
    setRegisterId(null);
    setMarks({});
  }, [date, periodNo]);

  const rows = useMemo(() => roster.data?.data ?? [], [roster.data]);

  const handleChange = (enrolmentId: string, mark: MarkMap[string]) => {
    setMarks((current) => ({ ...current, [enrolmentId]: mark }));
  };

  const persistDraft = async (): Promise<string | null> => {
    const records = rows.map((row) => ({ enrolmentId: row.enrolmentId, status: marks[row.enrolmentId] ?? 'present' }));
    const response = await saveRegister.mutateAsync({
      teachingAssignmentId: assignmentId,
      date,
      periodNo,
      status: 'draft',
      records,
    });
    setRegisterId(response.data.id);
    return response.data.id;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      toast.push('The register was saved as a draft. It becomes official only when you submit it.', 'success');
    } catch (error) {
      toast.push(error instanceof TypedApiError ? error.message : 'The register was not saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const id = registerId ?? (await persistDraft());
      if (!id) throw new Error('The register could not be created.');
      await submitRegister.mutateAsync(id);
      setConfirming(false);
      toast.push('Register submitted. It is now locked.', 'success');
    } catch (error) {
      setConfirming(false);
      toast.push(error instanceof TypedApiError ? error.message : 'The register was not submitted.', 'error');
    }
  };

  if (!assignmentId) {
    return <EmptyState title="No lesson chosen" explanation="Open attendance from a teaching assignment." />;
  }

  return (
    <>
      <PageHeader
        title="Attendance register"
        description={
          assignment
            ? `${assignment.class.name} · ${assignment.subject.name} · ${assignment.teacher.name} · ${assignment.term.name}`
            : 'One register per lesson. Every pupil on the class roster must be marked.'
        }
        actions={
          <Link className={styles.back} to="/assignments">
            All assignments
          </Link>
        }
      />

      <div className={styles.controls}>
        <Input label="Lesson date" type="date" value={date} max={todayISO()} onChange={(event) => setDate(event.target.value)} />
        <Select label="Period" value={String(periodNo)} onChange={(event) => setPeriodNo(Number(event.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((period) => (
            <option key={period} value={period}>
              Period {period}
            </option>
          ))}
        </Select>
        <div className={styles.statusCell}>
          {registerData ? (
            <Badge tone={alreadySubmitted ? 'published' : 'pending'}>{alreadySubmitted ? 'Submitted' : 'Draft'}</Badge>
          ) : (
            <Badge tone="neutral">Not started</Badge>
          )}
          <p className={styles.statusNote}>
            {register.isLoading
              ? 'Checking for an existing register…'
              : registerData
                ? registerData.status === 'submitted'
                  ? `Locked — submitted with ${registerData.total} marks.`
                  : 'Saved as a draft. Submit when the lesson is over.'
                : 'No register for this lesson yet; saving creates one.'}
          </p>
        </div>
      </div>

      {isFuture ? (
        <InlineNotice tone="warning">A register cannot be taken for a future date. Choose today or an earlier lesson.</InlineNotice>
      ) : null}

      {isAdmin ? (
        <InlineNotice>
          Administrators can read every register, but only the assigned teacher may save or submit one — this is enforced by the
          server, not by hiding the button.
        </InlineNotice>
      ) : null}

      {roster.isLoading ? (
        <Skeleton rows={8} />
      ) : roster.isError ? (
        <ErrorState error={roster.error} onRetry={() => void roster.refetch()} forbiddenTitle="This class is outside your assignment" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No pupils enrolled"
          explanation="This class has no active enrolment for the current session, so there is nobody to mark. Enrol pupils from the student record first."
        />
      ) : (
        <>
          <AttendanceGrid
            roster={rows}
            marks={marks}
            onChange={handleChange}
            locked={locked || isFuture}
            onMarkAllPresent={() => {
              const next: MarkMap = {};
              rows.forEach((row) => {
                next[row.enrolmentId] = 'present';
              });
              setMarks(next);
            }}
          />

          {!isAdmin ? (
            <div className={styles.actions}>
              <Button variant="secondary" loading={saving} disabled={alreadySubmitted || isFuture} onClick={() => void handleSaveDraft()}>
                Save draft
              </Button>
              <Button variant="primary" disabled={alreadySubmitted || isFuture} onClick={() => setConfirming(true)}>
                Submit register
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={confirming}
        title="Submit this register?"
        description={
          assignment
            ? `You are submitting the register for ${assignment.class.name} ${assignment.subject.name}, ${formatDate(date)}, period ${periodNo}. After submission the register is locked; a later change has to go through the administrator, and the original marks stay in the history.`
            : `You are submitting the register for ${formatDate(date)}, period ${periodNo}. This cannot be undone from this screen.`
        }
        confirmLabel="Submit and lock"
        busy={submitRegister.isPending || saving}
        onConfirm={() => void handleSubmit()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
