const { z } = require('zod');
const id = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const scope = z.object({ id });
module.exports = {
  registerQuery: z.object({ query: z.object({ teachingAssignmentId: id, date: day, periodNo: z.coerce.number().int().min(0).default(1) }) }),
  registerBody: z.object({ body: z.object({ teachingAssignmentId: id, date: day, periodNo: z.coerce.number().int().min(0).default(1), records: z.array(z.object({ enrolmentId: id, status: z.enum(['present', 'absent', 'late', 'excused']) })) }) }),
  assessmentQuery: z.object({ query: z.object({ teachingAssignmentId: id.optional(), termId: id.optional() }) }),
  assessmentBody: z.object({ body: z.object({ teachingAssignmentId: id, termId: id.optional(), name: z.string().trim().min(1), type: z.enum(['ca', 'exam', 'project']), maximumScore: z.coerce.number().positive(), weight: z.coerce.number().positive(), sequence: z.coerce.number().int().positive().optional() }) }),
  scoresBody: z.object({ body: z.object({ scores: z.array(z.object({ enrolmentId: id, score: z.number().min(0).nullable() })) }) }),
  correctionBody: z.object({ body: z.object({ newScore: z.coerce.number().min(0), reason: z.string().trim().min(10) }) }),
  reportQuery: z.object({ query: z.object({ termId: id }) }),
  rangeQuery: z.object({ query: z.object({ from: day.optional(), to: day.optional() }) }),
  idParams: z.object({ params: scope }),
  correctionParams: z.object({ params: z.object({ id, correctionId: id }) }),
};
