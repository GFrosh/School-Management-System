/**
 * Zod schemas derived from the API contract, shared by every form in the app.
 * The schemas are the frontend half of contract section 7.8 ("Zod schemas per
 * endpoint, shared with the frontend as generated types, so the contract cannot
 * drift silently").
 *
 * Provenance of each body:
 *  - login            -> printed in table 29
 *  - student create   -> DERIVED from the students entity dictionary (5.5):
 *                        admission_number (UK), name, dob, status
 *  - enrolment create -> DERIVED from the enrolments entity dictionary (5.5)
 *  - correction       -> printed in table 37
 *  - assignment       -> printed in table 31
 *  - guardian link    -> DERIVED from student_guardians (5.5): parent_id,
 *                        relationship, is_primary
 *  - session/term/class/subject -> DERIVED from 5.5
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD form');

export const studentCreateSchema = z.object({
  name: z.string().min(2, 'Enter the full name').max(120),
  admissionNumber: z
    .string()
    .min(1, 'Admission number is required')
    .regex(/^SMS\/\d{4}\/\d{3,4}$/, 'Expected the school format, e.g. SMS/2026/0142'),
  dateOfBirth: isoDate,
  status: z.enum(['active', 'inactive']),
});
export type StudentCreateValues = z.infer<typeof studentCreateSchema>;

export const studentUpdateSchema = studentCreateSchema
  .omit({ admissionNumber: true })
  .extend({ admissionNumber: z.string().optional() });
export type StudentUpdateValues = z.infer<typeof studentUpdateSchema>;

export const enrolmentCreateSchema = z.object({
  classId: z.string().min(1, 'Choose a class'),
  sessionId: z.string().min(1, 'Choose a session'),
  enrolledOn: isoDate,
});
export type EnrolmentCreateValues = z.infer<typeof enrolmentCreateSchema>;

export const enrolmentCloseSchema = z.object({
  status: z.enum(['promoted', 'repeated', 'graduated', 'transferred', 'withdrawn']),
  endedOn: isoDate,
  reason: z.string().max(240).optional(),
});
export type EnrolmentCloseValues = z.infer<typeof enrolmentCloseSchema>;

export const guardianLinkSchema = z.object({
  parentId: z.string().min(1, 'Select a guardian'),
  relationship: z.string().min(2, 'Relationship is required').max(40),
  isPrimary: z.boolean(),
});
export type GuardianLinkValues = z.infer<typeof guardianLinkSchema>;

export const sessionCreateSchema = z.object({
  name: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, 'Academic sessions are named like 2026/2027'),
  startDate: isoDate,
  endDate: isoDate,
});
export type SessionCreateValues = z.infer<typeof sessionCreateSchema>;

export const termCreateSchema = z.object({
  sequence: z.enum(['1', '2', '3']),
  name: z.string().min(3, 'Name the term, e.g. First Term'),
  startDate: isoDate,
  endDate: isoDate,
});
export type TermCreateValues = z.infer<typeof termCreateSchema>;

export const classCreateSchema = z.object({
  name: z.string().min(2, 'Class name is required').max(16),
  level: z.string().min(1, 'Level is required').max(40),
});
export type ClassCreateValues = z.infer<typeof classCreateSchema>;

export const subjectCreateSchema = z.object({
  code: z.string().min(2, 'Code is required').max(8),
  name: z.string().min(2, 'Subject name is required').max(60),
  isCore: z.boolean(),
});
export type SubjectCreateValues = z.infer<typeof subjectCreateSchema>;

export const assignmentCreateSchema = z.object({
  teacherId: z.string().min(1, 'Choose a teacher'),
  classId: z.string().min(1, 'Choose a class'),
  subjectId: z.string().min(1, 'Choose a subject'),
  termId: z.string().min(1, 'Choose a term'),
  isPrimary: z.boolean(),
});
export type AssignmentCreateValues = z.infer<typeof assignmentCreateSchema>;

/**
 * Scores are typed as strings in the form so the input and output types match;
 * the numeric range is still enforced before the request leaves the browser.
 */
export const correctionSchema = (max: number) =>
  z.object({
    newScore: z
      .string()
      .min(1, 'Enter the new score')
      .refine((v) => v.trim() !== '' && Number.isFinite(Number(v)), 'Enter a number')
      .refine((v) => Number(v) >= 0, 'A score cannot be negative')
      .refine((v) => Number(v) <= max, `Maximum for this assessment is ${max}`),
    reason: z
      .string()
      .min(10, 'Give a reason of at least 10 characters — the approver reads it'),
  });
export type CorrectionValues = z.infer<ReturnType<typeof correctionSchema>>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(12, 'Use at least 12 characters'),
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
