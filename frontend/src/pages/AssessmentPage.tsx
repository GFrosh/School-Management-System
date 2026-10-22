import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import {
  useAssessmentTransition,
  useAssessments,
  useAssignments,
  useRequestCorrection,
  useScores,
  useSaveScores,
} from '../api/hooks';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Textarea } from '../components/Field';
import { Modal } from '../components/Modal';
import { ScoreSheet, validateScore, type ScoreMap } from '../components/ScoreSheet';
import { ResultStatusBadge } from '../components/ResultStatusBadge';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState, InlineNotice } from '../components/States';
import { useToast } from '../components/Toast';
import { formatDateTime } from '../utils/format';
import styles from './AssessmentPage.module.css';

export function AssessmentPage() {
  const { assessmentId = '' } = useParams();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  const assessments = useAssessments({});
  const assignments = useAssignments();
  const scores = useScores(assessmentId);
  const saveScores = useSaveScores(assessmentId);
  const submit = useAssessmentTransition('submit');
  const approve = useAssessmentTransition('approve');
  const publish = useAssessmentTransition('publish');
  const requestCorrection = useRequestCorrection();

  const assessment = assessments.data?.data.find((row) => row.id === assessmentId) ?? null;
  const assignment = assignments.data?.data.find((row) => row.id === assessment?.teachingAssignmentId) ?? null;

  const rows = useMemo(() => scores.data?.data ?? [], [scores.data]);

  const [values, setValues] = useState<ScoreMap>({});
  const [confirming, setConfirming] = useState<'submit' | 'approve' | 'publish' | null>(null);
  const [correcting, setCorrecting] = useState<{ resultId: string; name: string; current: number | null } | null>(null);
  const [correctionScore, setCorrectionScore] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  useEffect(() => {
    const next: ScoreMap = {};
    rows.forEach((row) => {
      next[row.enrolmentId] = row.score === null ? '' : String(row.score);
    });
    setValues(next);
  }, [rows]);

  const statuses = new Set(rows.map((row) => row.status).filter(Boolean));
  const anySubmitted = statuses.has('submitted') || statuses.has('approved') || statuses.has('published');
  const allPublished = rows.length > 0 && rows.every((row) => row.status === 'published');
  const locked = anySubmitted || !assessment;

  const max = assessment?.maximumScore ?? 0;

  const save = async () => {
    const payload = rows
      .map((row) => {
        const raw = (values[row.enrolmentId] ?? '').trim();
        return { enrolmentId: row.enrolmentId, score: raw === '' ? null : Number(raw) };
      })
      .filter((row) => row.score === null || !Number.isNaN(row.score));
    try {
      await saveScores.mutateAsync(payload);
      toast.push('Scores saved as draft. Pupils cannot see them yet.', 'success');
    } catch (error) {
      if (error instanceof TypedApiError && error.isValidation) {
        toast.push(
          `${error.message} ${error.details.map((detail) => detail.message ?? detail.code).join(' ')}`.trim(),
          'error',
        );
        return;
      }
      toast.push(error instanceof TypedApiError ? error.message : 'The scores were not saved.', 'error');
    }
  };

  const transition = async (action: 'submit' | 'approve' | 'publish') => {
    const mutation = action === 'submit' ? submit : action === 'approve' ? approve : publish;
    try {
      await mutation.mutateAsync(assessmentId);
      setConfirming(null);
      toast.push(
        action === 'submit'
          ? 'Submitted for approval. You can no longer edit these scores.'
          : action === 'approve'
            ? 'Approved. Publishing is the next step.'
            : 'Published. Pupils and guardians can now see these scores.',
        'success',
      );
    } catch (error) {
      setConfirming(null);
      toast.push(error instanceof TypedApiError ? error.message : 'That step could not be completed.', 'error');
    }
  };

  const submitCorrection = async () => {
    if (!correcting) return;
    const issue = validateScore(correctionScore, max);
    if (issue) {
      setCorrectionError(issue.message);
      return;
    }
    if (correctionReason.trim().length < 10) {
      setCorrectionError('Give a reason of at least 10 characters — the approver reads it.');
      return;
    }
    try {
      await requestCorrection.mutateAsync({
        resultId: correcting.resultId,
        body: { newScore: Number(correctionScore), reason: correctionReason.trim() },
      });
      setCorrecting(null);
      setCorrectionScore('');
      setCorrectionReason('');
      setCorrectionError(null);
      toast.push('Correction requested. The published score stays visible until a second person approves it.', 'success');
    } catch (error) {
      setCorrectionError(error instanceof TypedApiError ? error.message : 'The correction was not requested.');
    }
  };

  if (!assessmentId) {
    return <EmptyState title="No assessment chosen" explanation="Open a score sheet from the results workspace." />;
  }

  return (
    <>
      <PageHeader
        title={assessment ? assessment.name : 'Score sheet'}
        description={
          assignment
            ? `${assignment.class.name} · ${assignment.subject.name} · ${assignment.term.name} · out of ${assessment?.maximumScore}`
            : 'One row per pupil on the class roster. A blank row means no score recorded yet.'
        }
        actions={
          <Link className={styles.back} to="/results">
            Results workspace
          </Link>
        }
      />

      <div className={styles.strip}>
        <div className={styles.stripItem}>
          <p className={styles.stripLabel}>Assessment state</p>
          <p className={styles.stripValue}>
            {allPublished ? <ResultStatusBadge status="published" /> : <Badge tone="neutral">{statuses.size === 0 ? 'Not started' : `${statuses.size} state${statuses.size === 1 ? '' : 's'} in sheet`}</Badge>}
          </p>
        </div>
        <div className={styles.stripItem}>
          <p className={styles.stripLabel}>Entered</p>
          <p className={styles.stripValue}>
            {rows.filter((row) => row.score !== null).length} of {rows.length}
          </p>
        </div>
        <div className={styles.stripItem}>
          <p className={styles.stripLabel}>Weight</p>
          <p className={styles.stripValue}>{assessment?.weight ?? '—'}</p>
        </div>
      </div>

      {anySubmitted ? (
        <InlineNotice tone="warning">
          These scores have been submitted, so the author can no longer edit them. A change goes through a correction request,
          which a second person approves and which leaves the previous score in the revision history.
        </InlineNotice>
      ) : (
        <InlineNotice>
          A score must fall between 0 and {max || 'the maximum'}. The form blocks anything else before it is sent, and the
          database enforces the same rule again.
        </InlineNotice>
      )}

      {scores.isLoading || assessments.isLoading ? (
        <Skeleton rows={8} />
      ) : scores.isError ? (
        <ErrorState error={scores.error} onRetry={() => void scores.refetch()} forbiddenTitle="This class is outside your assignment" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nobody on the roster"
          explanation="No pupil is actively enrolled in this class for the current session, so there is nothing to score."
        />
      ) : (
        <>
          <ScoreSheet
            rows={rows}
            values={values}
            max={max}
            locked={locked}
            onChange={(enrolmentId, value) => setValues((current) => ({ ...current, [enrolmentId]: value }))}
          />

          <div className={styles.actions}>
            {!isAdmin ? (
              <Button variant="secondary" loading={saveScores.isPending} disabled={anySubmitted} onClick={() => void save()}>
                Save draft
              </Button>
            ) : null}
            {!isAdmin ? (
              <Button variant="primary" disabled={anySubmitted || rows.length === 0} onClick={() => setConfirming('submit')}>
                Submit for approval
              </Button>
            ) : null}
            {isAdmin && anySubmitted && !allPublished ? (
              <>
                <Button variant="secondary" loading={approve.isPending} onClick={() => setConfirming('approve')}>
                  Approve
                </Button>
                <Button variant="primary" loading={publish.isPending} onClick={() => setConfirming('publish')}>
                  Publish to pupils
                </Button>
              </>
            ) : null}
          </div>

          {anySubmitted ? (
            <section className={styles.corrections} aria-labelledby="corrections-heading">
              <h2 id="corrections-heading" className={styles.correctionsTitle}>
                Corrections
              </h2>
              <p className={styles.correctionsNote}>
                A correction never edits history. It records the previous score, the new score, who asked and why, then a second
                person approves it.
              </p>
              <ul className={styles.correctionList}>
                {rows
                  .filter((row) => row.resultId && row.score !== null)
                  .slice(0, 8)
                  .map((row) => (
                    <li key={row.enrolmentId} className={styles.correctionRow}>
                      <span className={styles.correctionName}>{row.student.name}</span>
                      <span className={styles.numeric}>{row.score}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setCorrecting({ resultId: row.resultId!, name: row.student.name, current: row.score })
                        }
                      >
                        Request correction
                      </Button>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <Modal
        open={confirming !== null}
        title={
          confirming === 'submit'
            ? 'Submit these scores?'
            : confirming === 'approve'
              ? 'Approve these scores?'
              : 'Publish to pupils and guardians?'
        }
        description={
          confirming === 'submit'
            ? `You are submitting ${assessment?.name ?? 'this assessment'} for approval. After this you cannot edit the scores; a mistake has to go through a correction request.`
            : confirming === 'approve'
              ? `You are approving ${assessment?.name ?? 'this assessment'}. The scores are now fixed, and publishing makes them visible to each pupil and their guardians.`
              : `Publishing ${assessment?.name ?? 'this assessment'} makes every score on this sheet visible on pupils' report cards and to their guardians. A later change needs a correction request approved by a second person.`
        }
        confirmLabel={confirming === 'submit' ? 'Submit' : confirming === 'approve' ? 'Approve' : 'Publish now'}
        destructive={confirming === 'publish'}
        busy={submit.isPending || approve.isPending || publish.isPending}
        onConfirm={() => confirming && void transition(confirming)}
        onClose={() => setConfirming(null)}
      />

      <Modal
        open={Boolean(correcting)}
        title="Request a correction"
        description={
          correcting
            ? `Correcting ${correcting.name}'s score of ${correcting.current} in ${assessment?.name ?? 'this assessment'}. The current score stays visible until a second person approves the correction, and both scores are kept in the revision history.`
            : ''
        }
        confirmLabel="Submit correction request"
        busy={requestCorrection.isPending}
        onConfirm={() => void submitCorrection()}
        onClose={() => {
          setCorrecting(null);
          setCorrectionError(null);
        }}
      >
        <div className={styles.form}>
          <label className={styles.inputLabel} htmlFor="correction-score">
            New score (maximum {max})
          </label>
          <input
            id="correction-score"
            className={styles.input}
            inputMode="decimal"
            value={correctionScore}
            aria-invalid={correctionError ? true : undefined}
            aria-describedby={correctionError ? 'correction-error' : undefined}
            onChange={(event) => {
              setCorrectionScore(event.target.value);
              setCorrectionError(null);
            }}
          />
          <Textarea
            label="Reason"
            required
            hint="The approver reads this. Say what was wrong and what was checked."
            value={correctionReason}
            onChange={(event) => {
              setCorrectionReason(event.target.value);
              setCorrectionError(null);
            }}
          />
          {correctionError ? (
            <p className={styles.error} id="correction-error" role="alert">
              {correctionError}
            </p>
          ) : null}
        </div>
      </Modal>

      {rows.length > 0 && rows[0]?.status === 'published' ? (
        <p className={styles.stamp}>Last checked {formatDateTime(new Date().toISOString())}</p>
      ) : null}
    </>
  );
}
