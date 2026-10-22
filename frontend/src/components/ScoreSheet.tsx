import type { ScoreRow } from '../api/types';
import { ResultStatusBadge } from './ResultStatusBadge';
import styles from './ScoreSheet.module.css';

export interface ScoreIssue {
  message: string;
  code: 'NOT_A_NUMBER' | 'MIN' | 'MAX' | 'BLANK';
}

/**
 * Pure validator, exported so it can be unit-tested on its own and so the exact
 * same rule blocks the request before it is sent (score integrity criterion).
 */
export function validateScore(raw: string, max: number): ScoreIssue | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null; // blank is allowed: the score may not exist yet
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { message: 'Enter a number', code: 'NOT_A_NUMBER' };
  const value = Number(trimmed);
  if (Number.isNaN(value)) return { message: 'Enter a number', code: 'NOT_A_NUMBER' };
  if (value < 0) return { message: 'A score cannot be negative', code: 'MIN' };
  if (value > max) return { message: `Maximum is ${max}`, code: 'MAX' };
  return null;
}

export type ScoreMap = Record<string, string>;

interface ScoreSheetProps {
  rows: ScoreRow[];
  values: ScoreMap;
  max: number;
  locked: boolean;
  onChange: (enrolmentId: string, value: string) => void;
}

export function ScoreSheet({ rows, values, max, locked, onChange }: ScoreSheetProps) {
  const entered = rows.filter((row) => (values[row.enrolmentId] ?? '').trim() !== '').length;
  const invalid = rows.filter((row) => validateScore(values[row.enrolmentId] ?? '', max) !== null).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className={styles.count} role="status" aria-live="polite">
          <strong>{entered}</strong> of {rows.length} entered
        </p>
        {invalid > 0 ? (
          <p className={styles.invalidCount} role="alert">
            {invalid} {invalid === 1 ? 'score is' : 'scores are'} out of range
          </p>
        ) : (
          <p className={styles.maxNote}>Each score is out of {max}</p>
        )}
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>Score entry, one row per pupil</caption>
          <thead>
            <tr>
              <th scope="col">Pupil</th>
              <th scope="col">Admission no.</th>
              <th scope="col" className={styles.scoreHead}>
                Score
              </th>
              <th scope="col" className={styles.maxHead}>
                Max
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const value = values[row.enrolmentId] ?? '';
              const issue = validateScore(value, max);
              const inputId = `score-${row.enrolmentId}`;
              const errorId = `${inputId}-error`;
              return (
                <tr key={row.enrolmentId} className={issue ? styles.rowInvalid : undefined}>
                  <th scope="row" className={styles.name}>
                    {row.student.name}
                  </th>
                  <td className={styles.admission}>{row.student.admissionNumber}</td>
                  <td>
                    <input
                      id={inputId}
                      className={[styles.input, issue ? styles.inputInvalid : ''].filter(Boolean).join(' ')}
                      inputMode="decimal"
                      value={value}
                      disabled={locked}
                      aria-invalid={issue ? true : undefined}
                      aria-describedby={issue ? errorId : undefined}
                      aria-label={`Score for ${row.student.name}, maximum ${max}`}
                      onChange={(event) => onChange(row.enrolmentId, event.target.value)}
                    />
                    {issue ? (
                      <p className={styles.error} id={errorId} role="alert">
                        {issue.message}
                      </p>
                    ) : null}
                  </td>
                  <td className={styles.maxCell}>{max}</td>
                  <td>{row.status ? <ResultStatusBadge status={row.status} /> : <span className={styles.blank}>Not entered</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
