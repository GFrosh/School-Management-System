import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { AttendanceMark, RosterRow } from '../api/types';
import { Badge } from './Badge';
import styles from './AttendanceGrid.module.css';

export type MarkMap = Record<string, AttendanceMark>;

const ORDER: AttendanceMark[] = ['present', 'absent', 'late'];

const LABEL: Record<AttendanceMark, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
};

interface AttendanceGridProps {
  roster: RosterRow[];
  marks: MarkMap;
  onChange: (enrolmentId: string, mark: AttendanceMark) => void;
  /** A submitted register is read-only — no inputs, no keyboards. */
  locked: boolean;
  /** Optional: a per-row note such as "already submitted". */
  onMarkAllPresent?: () => void;
}

/**
 * The make-or-break screen. Defaults every pupil to present; a teacher tabs or
 * arrows through rows and presses a / l / p for exceptions.
 */
export function AttendanceGrid({ roster, marks, onChange, locked, onMarkAllPresent }: AttendanceGridProps) {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const pupil of roster) {
      const mark = marks[pupil.enrolmentId] ?? 'present';
      if (mark === 'present') present += 1;
      else if (mark === 'absent') absent += 1;
      else late += 1;
    }
    return { present, absent, late, total: roster.length };
  }, [roster, marks]);

  const focusRow = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, rowRefs.current.length - 1));
    rowRefs.current[clamped]?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number, enrolmentId: string) => {
    if (locked) return;
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'l' || key === 'p') {
      event.preventDefault();
      const mark: AttendanceMark = key === 'a' ? 'absent' : key === 'l' ? 'late' : 'present';
      onChange(enrolmentId, mark);
      focusRow(index + 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusRow(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusRow(index - 1);
    }
  };

  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, roster.length);
  }, [roster.length]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className={styles.counts} role="status" aria-live="polite">
          <strong>{counts.present}</strong> present · <strong>{counts.absent}</strong> absent ·{' '}
          <strong>{counts.late}</strong> late · <strong>{counts.total}</strong> on roll
        </p>
        {!locked && onMarkAllPresent ? (
          <button type="button" className={styles.linkButton} onClick={onMarkAllPresent}>
            Mark all present
          </button>
        ) : (
          <Badge tone="published">Submitted</Badge>
        )}
      </div>

      <p className={styles.hint}>
        {locked
          ? 'This register has been submitted and can no longer be edited.'
          : 'Every pupil starts present. Press A for absent, L for late, P for present; ↑ ↓ moves between rows.'}
      </p>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>Attendance register, one row per enrolled pupil</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.num}>
                #
              </th>
              <th scope="col">Pupil</th>
              <th scope="col">Admission no.</th>
              <th scope="col">Mark</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((pupil, index) => {
              const mark = marks[pupil.enrolmentId] ?? 'present';
              return (
                <tr
                  key={pupil.enrolmentId}
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  tabIndex={locked ? -1 : 0}
                  onKeyDown={(event) => handleKeyDown(event, index, pupil.enrolmentId)}
                  className={[styles.row, mark === 'absent' ? styles.isAbsent : '', mark === 'late' ? styles.isLate : '']
                    .filter(Boolean)
                    .join(' ')}
                  data-testid={`attendance-row-${index}`}
                >
                  <td className={styles.num}>{index + 1}</td>
                  <th scope="row" className={styles.name}>
                    {pupil.name}
                  </th>
                  <td className={styles.admission}>{pupil.admissionNumber}</td>
                  <td>
                    <div className={styles.segmented} role="group" aria-label={`Attendance for ${pupil.name}`}>
                      {ORDER.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={[styles.segment, mark === option ? styles.selected : ''].filter(Boolean).join(' ')}
                          aria-pressed={mark === option}
                          disabled={locked}
                          onClick={() => onChange(pupil.enrolmentId, option)}
                        >
                          {LABEL[option]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
