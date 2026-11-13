const { z } = require("zod");

const uuid = z.string().uuid();
const optionalText = z.string().trim().min(1).optional();

const SubjectSchema = z.object({ body: z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(160),
  is_core: z.boolean().optional(),
}) });

const AssignmentSchema = z.object({ body: z.object({
  teacher_id: uuid.optional(), teacherId: uuid.optional(), class_id: uuid.optional(), classId: uuid.optional(),
  subject_id: uuid.optional(), subjectId: uuid.optional(), term_id: uuid.optional(), termId: uuid.optional(),
  is_primary: z.boolean().optional(), isPrimary: z.boolean().optional(),
}).refine(v => v.teacher_id || v.teacherId).refine(v => v.class_id || v.classId)
  .refine(v => v.subject_id || v.subjectId).refine(v => v.term_id || v.termId) });

const StudentSchema = z.object({ body: z.object({
  first_name: z.string().trim().min(1).optional(), firstName: z.string().trim().min(1).optional(), middle_name: optionalText, middleName: optionalText,
  last_name: z.string().trim().min(1).optional(), lastName: z.string().trim().min(1).optional(),
  date_of_birth: z.coerce.date().optional(), dateOfBirth: z.coerce.date().optional(), gender: z.enum(["male", "female", "other"]).optional(),
  admission_date: z.coerce.date().optional(), status: z.enum(["active", "inactive", "withdrawn", "graduated"]).optional(),
  user_id: uuid.optional(),
  name: z.string().trim().min(1).optional(),
}).refine(v => (v.first_name || v.firstName) && (v.last_name || v.lastName))
  .refine(v => v.date_of_birth || v.dateOfBirth) });
const UpdateStudentSchema = z.object({ body: z.object({
  first_name: z.string().trim().min(1).optional(), firstName: z.string().trim().min(1).optional(), middle_name: optionalText, middleName: optionalText,
  last_name: z.string().trim().min(1).optional(), admission_number: z.string().trim().min(1).optional(),
  date_of_birth: z.coerce.date().optional(), gender: z.enum(["male", "female", "other"]).optional(),
  admission_date: z.coerce.date().optional(), status: z.enum(["active", "withdrawn", "graduated"]).optional(),
  user_id: uuid.optional(),
  name: z.string().trim().min(1).optional(), dateOfBirth: z.coerce.date().optional(),
}) });

const EnrolmentSchema = z.object({ body: z.object({
  student_id: uuid.optional(), class_id: uuid.optional(), classId: uuid.optional(),
  session_id: uuid.optional(), sessionId: uuid.optional(),
  status: z.enum(["active", "promoted", "repeated", "transferred", "withdrawn"]).optional(),
  enrolled_on: z.coerce.date().optional(), enrolledOn: z.coerce.date().optional(),
}).refine(v => v.class_id || v.classId).refine(v => v.session_id || v.sessionId) });

const CloseEnrolmentSchema = z.object({ body: z.object({
  ended_on: z.coerce.date().optional(),
  status: z.enum(["promoted", "repeated", "transferred", "withdrawn"]).optional(),
}) });

const GuardianSchema = z.object({ body: z.object({
  parent_id: uuid.optional(), parentId: uuid.optional(), relationship: z.enum(["father", "mother", "guardian", "other"]).optional(),
  is_primary: z.boolean().optional(), isPrimary: z.boolean().optional(),
}).refine(v => v.parent_id || v.parentId) });

const TeacherSchema = z.object({ body: z.object({
  first_name: z.string().trim().min(1).optional(), last_name: z.string().trim().min(1).optional(), name: z.string().trim().min(1).optional(),
  middle_name: optionalText, staff_number: z.string().trim().min(1).optional(), staffNumber: z.string().trim().min(1).optional(),
  employment_date: z.coerce.date().optional(),
  status: z.enum(["active", "on_leave", "inactive"]).optional(), user_id: uuid.optional(),
}).refine(v => (v.first_name || v.name) && (v.last_name || v.name)).refine(v => v.staff_number || v.staffNumber) });
const UpdateTeacherSchema = z.object({ body: z.object({
  first_name: z.string().trim().min(1).optional(), middle_name: optionalText,
  last_name: z.string().trim().min(1).optional(), staff_number: z.string().trim().min(1).optional(),
  employment_date: z.coerce.date().optional(), status: z.enum(["active", "on_leave", "inactive"]).optional(),
  user_id: uuid.optional(),
}) });

const UserStatusSchema = z.object({ body: z.object({
  status: z.enum(["active", "suspended", "deactivated"]),
}) });

const PromotionSchema = z.object({ body: z.object({
  student_id: uuid.optional(), class_id: uuid.optional(), session_id: uuid.optional(),
  status: z.enum(["promoted", "repeated"]).optional(),
  fromSessionId: uuid.optional(), decisions: z.array(z.object({
    studentId: uuid, outcome: z.enum(["promoted", "repeated", "graduated"]), toClassId: uuid.optional(),
  })).optional(),
}).refine(v => v.decisions?.length || (v.student_id && v.class_id && v.session_id)) });

module.exports = {
  SubjectSchema, AssignmentSchema, StudentSchema, UpdateStudentSchema, EnrolmentSchema,
  CloseEnrolmentSchema, GuardianSchema, TeacherSchema, UpdateTeacherSchema, UserStatusSchema,
  PromotionSchema,
};
