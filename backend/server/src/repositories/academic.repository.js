const db = require('../db/db');
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const today = () => new Date().toISOString().slice(0, 10);

async function assignment(id, user, trx = db) {
  let q = trx('teaching_assignments as ta').join('terms as t', 't.id', 'ta.term_id').where('ta.id', id).select('ta.*', 't.session_id').first();
  if (user.roles.includes('teacher') && !user.roles.includes('admin')) q = q.join('teachers as th', 'th.id', 'ta.teacher_id').where('th.user_id', user.sub);
  return q;
}
async function roster(id, user, trx = db) {
  if (!(await assignment(id, user, trx))) return null;
  return trx('enrolments as e').join('students as s', 's.id', 'e.student_id').join('teaching_assignments as ta', 'ta.class_id', 'e.class_id').join('terms as t', 't.id', 'ta.term_id')
    .where({ 'ta.id': id, 'e.status': 'active' }).andWhereRaw('e.session_id = t.session_id').distinct()
    .select('e.id as enrolment_id', 's.id as student_id', db.raw("concat_ws(' ', s.first_name, s.middle_name, s.last_name) as name"), 's.admission_number');
}
async function canStudent(studentId, user, trx = db) {
  if (user.roles.includes('admin')) return true;
  if (user.roles.includes('student')) return !!(await trx('students').where({ id: studentId, user_id: user.sub }).first());
  if (user.roles.includes('parent')) return !!(await trx('student_guardians as sg').join('parents as p', 'p.id', 'sg.parent_id').where({ 'sg.student_id': studentId, 'p.user_id': user.sub }).first());
  if (user.roles.includes('teacher')) return !!(await trx('enrolments as e').join('teaching_assignments as ta', 'ta.class_id', 'e.class_id').join('terms as t', 't.id', 'ta.term_id').join('teachers as th', 'th.id', 'ta.teacher_id').where({ 'e.student_id': studentId, 'th.user_id': user.sub, 'e.status': 'active' }).andWhereRaw('e.session_id = t.session_id').first());
  return false;
}
const registerShape = (r, rows) => {
  const counts = rows.reduce((a, x) => { if (x.status) a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
  return { id: r?.id || null, teachingAssignmentId: r?.teaching_assignment_id, date: r?.attendance_date, periodNo: r?.period_no, status: r?.status || 'draft', records: rows, present: counts.present || 0, absent: counts.absent || 0, late: counts.late || 0, total: rows.length };
};
async function getRegister(q, user) {
  if (!(await assignment(q.teachingAssignmentId, user))) return null;
  const r = await db('attendance_registers').where({ teaching_assignment_id: q.teachingAssignmentId, attendance_date: q.date, period_no: q.periodNo }).first();
  const rosterRows = await roster(q.teachingAssignmentId, user); if (!rosterRows) return null;
  const marks = r ? await db('attendance_records').where({ register_id: r.id }) : [];
  const map = new Map(marks.map((x) => [x.enrolment_id, x.status]));
  return registerShape(r || { teaching_assignment_id: q.teachingAssignmentId, attendance_date: q.date, period_no: q.periodNo }, rosterRows.map((x) => ({ enrolmentId: x.enrolment_id, status: map.get(x.enrolment_id) || null })));
}
async function saveRegister(body, user) {
  if (!(await assignment(body.teachingAssignmentId, user))) return null;
  if (body.date > today()) throw fail(422, 'VALIDATION_FAILED', 'Attendance date cannot be in the future');
  return db.transaction(async (trx) => {
    const rows = await roster(body.teachingAssignmentId, user, trx); if (!rows) return null;
    const allowed = new Set(rows.map((x) => x.enrolment_id));
    if (new Set(body.records.map((x) => x.enrolmentId)).size !== body.records.length || body.records.some((x) => !allowed.has(x.enrolmentId))) throw fail(422, 'VALIDATION_FAILED', 'Invalid attendance roster');
    let r = await trx('attendance_registers').where({ teaching_assignment_id: body.teachingAssignmentId, attendance_date: body.date, period_no: body.periodNo }).first();
    if (r?.status === 'submitted') throw fail(409, 'CONFLICT', 'Submitted registers cannot be edited');
    if (!r) [r] = await trx('attendance_registers').insert({ teaching_assignment_id: body.teachingAssignmentId, attendance_date: body.date, period_no: body.periodNo, status: 'draft' }).returning('*');
    await trx('attendance_records').where({ register_id: r.id }).del();
    if (body.records.length) await trx('attendance_records').insert(body.records.map((x) => ({ register_id: r.id, enrolment_id: x.enrolmentId, status: x.status })));
    return registerShape(r, body.records);
  });
}
async function submitRegister(id, user) {
  const r = await db('attendance_registers').where({ id }).first(); if (!r || !(await assignment(r.teaching_assignment_id, user))) return null;
  if (r.attendance_date > today()) throw fail(422, 'VALIDATION_FAILED', 'Attendance date cannot be in the future');
  return db.transaction(async (trx) => {
    const rosterRows = await roster(r.teaching_assignment_id, user, trx); if (!rosterRows) return null;
    const total = rosterRows.length; const marked = Number((await trx('attendance_records').where({ register_id: id }).count('id as n').first()).n);
    if (total !== marked) throw fail(422, 'VALIDATION_FAILED', 'Every roster member must be marked');
    const [row] = await trx('attendance_registers').where({ id }).update({ status: 'submitted', submitted_by: user.sub, submitted_at: trx.fn.now(), updated_at: trx.fn.now() }).returning('*'); return row;
  });
}
async function studentAttendance(studentId, q, user) {
  if (!(await canStudent(studentId, user))) return null;
  let query = db('attendance_records as ar').join('attendance_registers as r', 'r.id', 'ar.register_id').join('enrolments as e', 'e.id', 'ar.enrolment_id').where({ 'e.student_id': studentId, 'r.status': 'submitted' }).select('r.attendance_date as date', 'ar.status');
  if (q.from) query = query.where('r.attendance_date', '>=', q.from); if (q.to) query = query.where('r.attendance_date', '<=', q.to);
  const records = await query.orderBy('r.attendance_date'); const summary = records.reduce((a, x) => { a.total++; a[x.status] = (a[x.status] || 0) + 1; return a; }, { present: 0, absent: 0, late: 0, total: 0 }); return { summary, records };
}
async function listAssessments(q, user) {
  let query = db('assessments as a').join('teaching_assignments as ta', 'ta.id', 'a.teaching_assignment_id').whereNotNull('a.id');
  if (q.teachingAssignmentId) query = query.where('ta.id', q.teachingAssignmentId); if (q.termId) query = query.where('a.term_id', q.termId);
  if (user.roles.includes('teacher') && !user.roles.includes('admin')) query = query.join('teachers as th', 'th.id', 'ta.teacher_id').where('th.user_id', user.sub);
  return (await query.select('a.*')).map((x) => ({ ...x, teachingAssignmentId: x.teaching_assignment_id, termId: x.term_id, maximumScore: Number(x.maximum_score), weight: Number(x.weight) }));
}
async function createAssessment(body, user) {
  const a = await assignment(body.teachingAssignmentId, user); if (!a) return null; if (body.termId && body.termId !== a.term_id) throw fail(422, 'VALIDATION_FAILED', 'Assessment term must match assignment term');
  const [x] = await db('assessments').insert({ teaching_assignment_id: a.id, term_id: a.term_id, name: body.name, type: body.type, maximum_score: body.maximumScore, weight: body.weight, sequence: body.sequence || 1 }).returning('*'); return { ...x, teachingAssignmentId: x.teaching_assignment_id, termId: x.term_id, maximumScore: Number(x.maximum_score), weight: Number(x.weight) };
}
async function scores(id, user) {
  const a = await db('assessments').where({ id }).first(); if (!a || !(await assignment(a.teaching_assignment_id, user))) return null;
  const rows = await roster(a.teaching_assignment_id, user); if (!rows) return null;
  const result = await db('results').where({ assessment_id: id }); const map = new Map(result.map((x) => [x.enrolment_id, x]));
  return rows.map((x) => { const r = map.get(x.enrolment_id); return { enrolmentId: x.enrolment_id, resultId: r?.id || null, student: { id: x.student_id, name: x.name, admissionNumber: x.admission_number }, score: r?.score == null ? null : Number(r.score), status: r?.status || null }; });
}
async function saveScores(id, body, user) {
  const a = await db('assessments').where({ id }).first(); if (!a || !(await assignment(a.teaching_assignment_id, user))) return null;
  return db.transaction(async (trx) => { const rows = await roster(a.teaching_assignment_id, user, trx); if (!rows) return null; const allowed = new Set(rows.map((x) => x.enrolment_id));
    if (body.scores.some((x) => !allowed.has(x.enrolmentId) || (x.score != null && x.score > Number(a.maximum_score)))) throw fail(422, 'VALIDATION_FAILED', 'Score is outside the permitted range');
    for (const x of body.scores) { const old = await trx('results').where({ assessment_id: id, enrolment_id: x.enrolmentId }).first(); if (old?.status === 'published') throw fail(409, 'CONFLICT', 'Published scores require a correction'); if (old) await trx('results').where({ id: old.id }).update({ score: x.score, entered_by: user.sub, updated_at: trx.fn.now() }); else await trx('results').insert({ assessment_id: id, enrolment_id: x.enrolmentId, score: x.score, entered_by: user.sub }); }
    return { assessmentId: id, entered: body.scores.filter((x) => x.score != null).length, total: rows.length, status: 'draft' };
  });
}
async function transition(id, action, user) {
  const a = await db('assessments').where({ id }).first(); if (!a || !(await assignment(a.teaching_assignment_id, user))) return null; if (['approve', 'publish'].includes(action) && !user.roles.includes('admin')) throw fail(403, 'FORBIDDEN', 'Administrator role required');
  const target = { submit: 'submitted', approve: 'approved', publish: 'published' }[action]; const prior = { submit: 'draft', approve: 'submitted', publish: 'approved' }[action];
  return db.transaction(async (trx) => {
    const rows = await trx('results').where({ assessment_id: id });
    if (!rows.length || rows.some((x) => x.status !== prior)) throw fail(409, 'CONFLICT', 'Assessment has an invalid state');
    if (action === 'approve' && rows.some((x) => x.entered_by === user.sub)) {
      throw fail(403, 'FORBIDDEN', 'The entering teacher cannot approve their own results');
    }
    const patch = { status: target, updated_at: trx.fn.now() };
    if (action === 'publish') patch.published_at = trx.fn.now();
    await trx('results').where({ assessment_id: id }).update(patch);
    return { assessmentId: id, status: target, count: rows.length };
  });
}
async function correction(id, body, user) {
  return db.transaction(async (trx) => { const r = await trx('results as r').join('assessments as a', 'a.id', 'r.assessment_id').where('r.id', id).select('r.*', 'a.maximum_score', 'a.teaching_assignment_id').first(); if (!r || !(await assignment(r.teaching_assignment_id, user, trx))) return null; if (r.status !== 'published' || body.newScore > Number(r.maximum_score)) throw fail(422, 'VALIDATION_FAILED', 'Only published results within the maximum can be corrected'); const [rev] = await trx('result_revisions').insert({ result_id: id, previous_score: r.score, new_score: body.newScore, reason: body.reason, requested_by: user.sub }).returning('*'); await trx('results').where({ id }).update({ status: 'correction_pending', updated_at: trx.fn.now() }); return { resultId: id, correctionId: rev.id, status: 'correction_pending', previousScore: Number(r.score), newScore: body.newScore, requestedBy: user.sub, requiresApproval: true }; });
}
async function approveCorrection(id, correctionId, user) {
  if (!user.roles.includes('admin')) throw fail(403, 'FORBIDDEN', 'Administrator role required');
  return db.transaction(async (trx) => { const rev = await trx('result_revisions').where({ id: correctionId, result_id: id, status: 'pending' }).first(); if (!rev || rev.requested_by === user.sub) throw fail(409, 'CONFLICT', 'Correction cannot be approved'); await trx('result_revisions').where({ id: correctionId }).update({ status: 'approved', approved_by: user.sub, decided_at: trx.fn.now(), updated_at: trx.fn.now() }); await trx('results').where({ id }).update({ score: rev.new_score, status: 'published', published_at: trx.fn.now(), updated_at: trx.fn.now() }); return { resultId: id, status: 'published', previousScore: Number(rev.previous_score), newScore: Number(rev.new_score), requestedBy: rev.requested_by, requiresApproval: false }; });
}
async function reportCard(enrolmentId, termId, user) {
  const e = await db('enrolments as e').join('students as s', 's.id', 'e.student_id').join('classes as c', 'c.id', 'e.class_id').join('academic_sessions as se', 'se.id', 'e.session_id').where('e.id', enrolmentId).select('e.*', 's.id as student_id', 's.first_name', 's.middle_name', 's.last_name', 's.admission_number', 'c.name as class_name', 'se.name as session_name').first();
  if (!e || !(await canStudent(e.student_id, user))) return null;
  const rows = await db('results as r').join('assessments as a', 'a.id', 'r.assessment_id').join('teaching_assignments as ta', 'ta.id', 'a.teaching_assignment_id').join('subjects as sub', 'sub.id', 'ta.subject_id').where({ 'r.enrolment_id': enrolmentId, 'a.term_id': termId, 'r.status': 'published' }).select('r.*', 'a.name as assessment_name', 'a.maximum_score', 'sub.name as subject_name');
  const groups = {};
  for (const r of rows) {
    const g = groups[r.subject_name] ||= { subject: r.subject_name, assessments: [], total: 0, grade: '', revised: false };
    g.assessments.push({ name: r.assessment_name, score: r.score == null ? null : Number(r.score), max: Number(r.maximum_score) });
    g.total += r.score == null ? 0 : Number(r.score);
    g.revised = g.revised || !!(await db('result_revisions').where({ result_id: r.id, status: 'approved' }).first());
  }
  Object.values(groups).forEach((g) => { g.grade = g.total >= 70 ? 'A' : g.total >= 60 ? 'B' : g.total >= 50 ? 'C' : g.total >= 40 ? 'D' : 'F'; });
  const term = await db('terms').where({ id: termId }).first();
  return { student: { name: [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' '), admissionNumber: e.admission_number }, class: e.class_name, term: term?.name, session: e.session_name, subjects: Object.values(groups), publishedAt: rows[0]?.published_at || null };
}
async function myResults(user) {
  let ids = [];
  if (user.roles.includes('student')) { const s = await db('students').where({ user_id: user.sub }).first('id'); if (s) ids = [s.id]; }
  if (user.roles.includes('parent')) ids = await db('student_guardians as sg').join('parents as p', 'p.id', 'sg.parent_id').where('p.user_id', user.sub).pluck('sg.student_id');
  const enrolments = await db('enrolments').whereIn('student_id', ids).where('status', 'active'); const output = [];
  for (const e of enrolments) {
    const terms = await db('terms').where({ session_id: e.session_id }).orderBy('sequence');
    const groups = [];
    for (const t of terms) { const card = await reportCard(e.id, t.id, user); if (card?.subjects.length) groups.push({ termId: t.id, term: card.term, session: card.session, subjects: card.subjects }); }
    if (groups.length) { const s = await db('students').where({ id: e.student_id }).first(); output.push({ student: { id: s.id, name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '), admissionNumber: s.admission_number }, terms: groups }); }
  }
  return output;
}
module.exports = { roster, getRegister, saveRegister, submitRegister, studentAttendance, listAssessments, createAssessment, scores, saveScores, transition, correction, approveCorrection, reportCard, myResults };
