const ApiResponse = require('../utils/Response');
const repo = require('../repositories/academic.repository');
const ok = (fn, status = 200) => async (req, res) => {
  const data = await fn(req);
  if (data === null || data === undefined) {
    throw ApiResponse.error(404, "NOT_FOUND", "Resource not found");
  }
  return ApiResponse.success(res, data, null, status);
};
const assignmentId = (req) => req.params.assignmentId || req.body.teachingAssignmentId || req.query.teachingAssignmentId;
module.exports = {
  roster: ok((req) => repo.roster(req.params.assignmentId, req.user)),
  getRegister: ok((req) => repo.getRegister(req.query, req.user)),
  saveRegister: ok((req) => repo.saveRegister(req.body, req.user)),
  submitRegister: ok((req) => repo.submitRegister(req.params.id, req.user)),
  studentAttendance: ok((req) => repo.studentAttendance(req.params.id, req.query, req.user)),
  assessments: ok((req) => repo.listAssessments(req.query, req.user)),
  createAssessment: ok((req) => repo.createAssessment(req.body, req.user), 201),
  scores: ok((req) => repo.scores(req.params.id, req.user)),
  saveScores: ok((req) => repo.saveScores(req.params.id, req.body, req.user)),
  submitAssessment: ok((req) => repo.transition(req.params.id, 'submit', req.user)),
  approveAssessment: ok((req) => repo.transition(req.params.id, 'approve', req.user)),
  publishAssessment: ok((req) => repo.transition(req.params.id, 'publish', req.user)),
  correction: ok((req) => repo.correction(req.params.id, req.body, req.user), 201),
  approveCorrection: ok((req) => repo.approveCorrection(req.params.id, req.params.correctionId, req.user)),
  reportCard: ok((req) => repo.reportCard(req.params.id, req.query.termId, req.user)),
  meResults: ok((req) => repo.myResults(req.user)),
};
