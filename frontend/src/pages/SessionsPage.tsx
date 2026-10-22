import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '../layout/PageHeader';
import { useCreateSession, useCreateTerm, useSetCurrentSession, useSessions, useTerms } from '../api/hooks';
import { sessionCreateSchema, termCreateSchema, type SessionCreateValues, type TermCreateValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/format';
import styles from './SimplePage.module.css';

export function SessionsPage() {
  const sessions = useSessions();
  const [selected, setSelected] = useState<string | null>(null);
  const activeSessionId = selected ?? sessions.data?.data.find((s) => s.isCurrent)?.id ?? sessions.data?.data[0]?.id ?? '';
  const terms = useTerms(activeSessionId || undefined);
  const createSession = useCreateSession();
  const createTerm = useCreateTerm(activeSessionId);
  const setCurrent = useSetCurrentSession();
  const toast = useToast();

  const [creatingSession, setCreatingSession] = useState(false);
  const [creatingTerm, setCreatingTerm] = useState(false);

  const sessionForm = useForm<SessionCreateValues>({
    resolver: zodResolver(sessionCreateSchema),
    defaultValues: { name: '', startDate: '', endDate: '' },
  });

  const termForm = useForm<TermCreateValues>({
    resolver: zodResolver(termCreateSchema),
    defaultValues: { sequence: '1', name: '', startDate: '', endDate: '' },
  });

  const sessionName = sessions.data?.data.find((s) => s.id === activeSessionId)?.name ?? 'this session';

  return (
    <>
      <PageHeader
        title="Sessions & terms"
        description="One session is current at a time. Terms sit inside a session and results are reported per term, so a term is the unit every score belongs to."
        actions={
          <Button variant="primary" onClick={() => setCreatingSession(true)}>
            Add a session
          </Button>
        }
      />

      <section className={styles.panel} aria-labelledby="session-list">
        <h2 className={styles.panelTitle} id="session-list">
          Sessions
        </h2>
        {sessions.isLoading ? (
          <Skeleton rows={3} />
        ) : sessions.isError ? (
          <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
        ) : (
          <ul className={styles.list}>
            {(sessions.data?.data ?? []).map((session) => (
              <li key={session.id} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>
                    {session.name} {session.isCurrent ? <Badge tone="published">Current</Badge> : null}
                  </p>
                  <p className={styles.muted}>
                    {formatDate(session.startDate)} — {formatDate(session.endDate)}
                  </p>
                </div>
                <div className={styles.rowActions}>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(session.id)}>
                    {session.id === activeSessionId ? 'Showing terms' : 'Show terms'}
                  </Button>
                  {!session.isCurrent ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={setCurrent.isPending}
                      onClick={() =>
                        setCurrent.mutate(session.id, {
                          onSuccess: () => toast.push(`${session.name} is now the current session.`, 'success'),
                          onError: () => toast.push('The current session could not be changed.', 'error'),
                        })
                      }
                    >
                      Set as current
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="term-list">
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle} id="term-list">
            Terms in {sessionName}
          </h2>
          <Button variant="secondary" size="sm" disabled={!activeSessionId} onClick={() => setCreatingTerm(true)}>
            Add a term
          </Button>
        </div>
        {!activeSessionId ? (
          <EmptyState title="No session selected" explanation="Create a session first — terms always belong to one." />
        ) : terms.isLoading ? (
          <Skeleton rows={3} />
        ) : terms.isError ? (
          <ErrorState error={terms.error} onRetry={() => void terms.refetch()} />
        ) : (terms.data?.data.length ?? 0) === 0 ? (
          <EmptyState
            title="No terms yet"
            explanation="A session needs its terms before teachers can be assigned or scores entered. Sequence numbers are unique, so First Term cannot be created twice."
          />
        ) : (
          <ul className={styles.list}>
            {(terms.data?.data ?? []).map((term) => (
              <li key={term.id} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>
                    {term.sequence}. {term.name}
                  </p>
                  <p className={styles.muted}>
                    {formatDate(term.startDate)} — {formatDate(term.endDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={creatingSession}
        title="Add an academic session"
        description="Sessions are named like 2026/2027. Overlapping dates are rejected by the server, so a new session is created after the previous one closes."
        confirmLabel="Create session"
        busy={sessionForm.formState.isSubmitting || createSession.isPending}
        onConfirm={sessionForm.handleSubmit(async (values) => {
          try {
            await createSession.mutateAsync(values);
            toast.push(`Session ${values.name} created.`, 'success');
            setCreatingSession(false);
            sessionForm.reset();
          } catch (error) {
            toast.push(error instanceof TypedApiError ? error.message : 'The session was not created.', 'error');
          }
        })}
        onClose={() => setCreatingSession(false)}
      >
        <form className={styles.form}>
          <Input label="Session name" required hint="e.g. 2027/2028" error={sessionForm.formState.errors.name?.message} {...sessionForm.register('name')} />
          <Input label="Starts" type="date" required error={sessionForm.formState.errors.startDate?.message} {...sessionForm.register('startDate')} />
          <Input label="Ends" type="date" required error={sessionForm.formState.errors.endDate?.message} {...sessionForm.register('endDate')} />
        </form>
      </Modal>

      <Modal
        open={creatingTerm}
        title={`Add a term to ${sessionName}`}
        description="Terms are numbered 1 to 3 within a session. Results are reported per term, and an assessment can never belong to a term other than its assignment's."
        confirmLabel="Create term"
        busy={termForm.formState.isSubmitting || createTerm.isPending}
        onConfirm={termForm.handleSubmit(async (values) => {
          try {
            await createTerm.mutateAsync(values);
            toast.push(`${values.name} created.`, 'success');
            setCreatingTerm(false);
            termForm.reset({ sequence: '1', name: '', startDate: '', endDate: '' });
          } catch (error) {
            toast.push(error instanceof TypedApiError ? error.message : 'The term was not created.', 'error');
          }
        })}
        onClose={() => setCreatingTerm(false)}
      >
        <form className={styles.form}>
          <Select label="Sequence" required {...termForm.register('sequence')}>
            <option value="1">1 — First Term</option>
            <option value="2">2 — Second Term</option>
            <option value="3">3 — Third Term</option>
          </Select>
          <Input label="Term name" required error={termForm.formState.errors.name?.message} {...termForm.register('name')} />
          <Input label="Starts" type="date" required error={termForm.formState.errors.startDate?.message} {...termForm.register('startDate')} />
          <Input label="Ends" type="date" required error={termForm.formState.errors.endDate?.message} {...termForm.register('endDate')} />
        </form>
      </Modal>
    </>
  );
}
