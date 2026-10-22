import { useMemo } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { useMyResults, useStudentAttendance } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import { formatDate, humaniseStatus } from '../utils/format';
import type { AttendanceMark } from '../api/types';
import styles from './MyAttendancePage.module.css';

const TONE: Record<AttendanceMark, 'published' | 'danger' | 'pending'> = {
  present: 'published',
  absent: 'danger',
  late: 'pending',
};

/**
 * Attendance is presented per lesson date with counts, never as a percentage
 * computed here. A guardian sees the dates and marks for the children the API
 * returned for this account.
 */
export function MyAttendancePage() {
  const { me } = useAuth();
  const results = useMyResults();
  const groups = results.data?.data ?? [];

  const selfStudentId = me?.profiles.studentId ?? groups[0]?.student.id ?? null;
  const attendance = useStudentAttendance(selfStudentId ?? undefined);

  const child = useMemo(() => groups.find((group) => group.student.id === selfStudentId) ?? null, [groups, selfStudentId]);

  return (
    <>
      <PageHeader
        title="My attendance"
        description="Each lesson keeps its own register. Only submitted registers appear here — a draft is the teacher's working copy and is not an official record."
      />

      {!selfStudentId ? (
        results.isLoading ? (
          <Skeleton rows={5} />
        ) : (
          <EmptyState
            title="No attendance record linked"
            explanation="Your account is not linked to a student record yet. The school office links a guardian account to each child."
          />
        )
      ) : attendance.isLoading ? (
        <Skeleton rows={5} />
      ) : attendance.isError ? (
        <ErrorState error={attendance.error} onRetry={() => void attendance.refetch()} forbiddenTitle="This record is outside your access" />
      ) : (
        <>
          {child ? (
            <p className={styles.childLine}>
              {child.student.name} · {child.student.admissionNumber}
            </p>
          ) : null}

          <div className={styles.counts}>
            <div className={styles.countCard}>
              <p className={styles.countLabel}>Present</p>
              <p className={styles.countValue}>{attendance.data?.data.summary.present ?? 0}</p>
            </div>
            <div className={styles.countCard}>
              <p className={styles.countLabel}>Absent</p>
              <p className={styles.countValue}>{attendance.data?.data.summary.absent ?? 0}</p>
            </div>
            <div className={styles.countCard}>
              <p className={styles.countLabel}>Late</p>
              <p className={styles.countValue}>{attendance.data?.data.summary.late ?? 0}</p>
            </div>
            <div className={styles.countCard}>
              <p className={styles.countLabel}>Lessons marked</p>
              <p className={styles.countValue}>{attendance.data?.data.summary.total ?? 0}</p>
            </div>
          </div>

          <InlineNotice>
            These counts are the school's own figures. The page does not recalculate a percentage or an attendance score, so what
            you read here is what appears on the official record.
          </InlineNotice>

          {(attendance.data?.data.records.length ?? 0) === 0 ? (
            <EmptyState title="No submitted registers yet" explanation="Attendance appears once a teacher submits a register for a lesson." />
          ) : (
            <ul className={styles.list}>
              {(attendance.data?.data.records ?? []).map((record) => (
                <li key={`${record.date}-${record.status}`} className={styles.row}>
                  <span className={styles.date}>{formatDate(record.date)}</span>
                  <Badge tone={TONE[record.status]}>{humaniseStatus(record.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
