import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../layout/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { useAssignments, useClasses, useSessions, useStudents, useTeachers } from '../api/hooks';
import * as api from '../api/endpoints';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { formatDate } from '../utils/format';
import styles from './DashboardPage.module.css';

interface StatProps {
  label: string;
  value: string;
  hint: string;
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statHint}>{hint}</p>
    </div>
  );
}

export function DashboardPage() {
  const { me } = useAuth();
  const currentSessionId = me?.scope.currentSession?.id;

  const students = useStudents({ pageSize: 1 });
  const teachers = useTeachers();
  const classes = useClasses();
  const sessions = useSessions();
  const assignments = useAssignments();

  // Unpublished results: every assessment that is not yet published, counted
  // from the assessments endpoint the contract provides.
  const allAssessments = useQuery({
    queryKey: ['assessments', 'dashboard'],
    queryFn: () => api.fetchAssessments({ termId: undefined }),
    retry: false,
  });

  if (students.isError) return <ErrorState error={students.error} onRetry={() => void students.refetch()} />;

  const loading = students.isLoading || teachers.isLoading || classes.isLoading || allAssessments.isLoading;
  const current = sessions.data?.data.find((s) => s.isCurrent);
  const readyToPublish = allAssessments.data?.data.length ?? 0;

  return (
    <>
      <PageHeader
        title={`Good day, ${me?.displayName.split(' ').slice(-1)[0] ?? 'administrator'}`}
        description="A single view of the school's records for the current session. Counts come from the server; nothing on this page is calculated in the browser."
      />

      {loading ? (
        <Skeleton variant="cards" rows={4} />
      ) : (
        <div className={styles.grid}>
          <Stat
            label="Students on record"
            value={String(students.data?.meta?.total ?? 0)}
            hint="Includes closed placements, which are kept as history"
          />
          <Stat label="Staff" value={String(teachers.data?.data.length ?? 0)} hint="Active and inactive staff records" />
          <Stat label="Classes" value={String(classes.data?.data.length ?? 0)} hint="Stable definitions, not per session" />
          <Stat
            label="Teaching assignments"
            value={String(assignments.data?.data.length ?? 0)}
            hint={currentSessionId ? 'For the current term' : 'No current session set'}
          />
        </div>
      )}

      <section className={styles.section} aria-labelledby="session-heading">
        <h2 id="session-heading" className={styles.sectionTitle}>
          Active session
        </h2>
        {sessions.isLoading ? (
          <Skeleton rows={2} />
        ) : current ? (
          <div className={styles.sessionCard}>
            <div>
              <p className={styles.sessionName}>{current.name}</p>
              <p className={styles.sessionDates}>
                {formatDate(current.startDate)} — {formatDate(current.endDate)}
              </p>
            </div>
            <Badge tone="published">Current</Badge>
          </div>
        ) : (
          <p className={styles.muted}>
            No session is marked current. Term boundaries and assignment scope both depend on it, so set one on the
            sessions screen before entering attendance or scores.
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="results-heading">
        <h2 id="results-heading" className={styles.sectionTitle}>
          Results workspace
        </h2>
        <p className={styles.muted}>
          {readyToPublish > 0
            ? `${readyToPublish} ${readyToPublish === 1 ? 'assessment definition is' : 'assessment definitions are'} on record. Open the results workspace to enter, approve or publish scores — publishing is the only action that makes a score visible to a family.`
            : 'No assessments have been defined yet. An administrator must define CA1, CA2 and the examination for each assignment before teachers can enter scores.'}
        </p>
      </section>
    </>
  );
}
