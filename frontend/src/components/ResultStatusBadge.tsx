import { Badge, type BadgeTone } from './Badge';
import type { ResultStatus } from '../api/types';

interface Presenter {
  tone: BadgeTone;
  label: string;
  /** What the reader is allowed to assume, in the brief's own words. */
  detail: string;
}

/**
 * The result-lifecycle renderer. One place decides how a state is worded and
 * coloured so no screen can present a draft as a published score.
 */
export function resultStatusPresenter(status: ResultStatus): Presenter {
  switch (status) {
    case 'draft':
      return { tone: 'neutral', label: 'Draft', detail: 'Visible to the entering teacher only' };
    case 'submitted':
      return { tone: 'pending', label: 'Submitted', detail: 'Awaiting approval' };
    case 'approved':
      return { tone: 'pending', label: 'Approved', detail: 'Ready to publish' };
    case 'published':
      return { tone: 'published', label: 'Published', detail: 'Visible to the student and guardians' };
    case 'correction_pending':
      return { tone: 'info', label: 'Revision awaiting approval', detail: 'The published score stands until approval' };
    default:
      return { tone: 'neutral', label: 'Unknown', detail: 'State not recognised' };
  }
}

export function ResultStatusBadge({ status }: { status: ResultStatus }) {
  const presenter = resultStatusPresenter(status);
  return (
    <Badge tone={presenter.tone} title={presenter.detail}>
      {presenter.label}
    </Badge>
  );
}

/** Explicit "revised" marker — never a silent replacement of a seen number. */
export function RevisedMarker({ previous, next }: { previous?: number; next?: number }) {
  const hasPair = typeof previous === 'number' && typeof next === 'number';
  return (
    <Badge tone="info" title={hasPair ? `Was ${previous}, now ${next}` : 'This score was corrected'}>
      {hasPair ? `Revised · was ${previous}` : 'Revised'}
    </Badge>
  );
}
