import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './layout/AppShell';
import { RequireAuth } from './layout/Guards';
import { LoginPage } from './pages/LoginPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { StaffPage } from './pages/StaffPage';
import { ClassesPage } from './pages/ClassesPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { SessionsPage } from './pages/SessionsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { AttendanceOversightPage } from './pages/AttendanceOversightPage';
import { TakeAttendancePage } from './pages/TakeAttendancePage';
import { ResultsWorkspacePage } from './pages/ResultsWorkspacePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { MyAttendancePage } from './pages/MyAttendancePage';
import { MyResultsPage } from './pages/MyResultsPage';
import { ChildrenResultsPage } from './pages/ChildrenResultsPage';

/** Role-routed home: each role lands on the screen it can actually use. */
function Home() {
  const { me } = useAuth();
  if (!me) return <Navigate to="/login" replace />;
  if (me.roles.includes('admin')) return <DashboardPage />;
  if (me.roles.includes('teacher')) return <Navigate to="/assignments" replace />;
  if (me.roles.includes('parent')) return <Navigate to="/my/results" replace />;
  return <Navigate to="/my/results" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />

          <Route element={<RequireAuth roles={['admin', 'teacher']} />}>
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="attendance/:assignmentId" element={<TakeAttendancePage />} />
          </Route>

          <Route element={<RequireAuth roles={['admin']} />}>
            <Route path="staff" element={<StaffPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="attendance" element={<AttendanceOversightPage />} />
            <Route path="results" element={<ResultsWorkspacePage />} />
            <Route path="results/:assessmentId" element={<AssessmentPage />} />
          </Route>

          <Route element={<RequireAuth roles={['student', 'parent']} />}>
            <Route path="my/attendance" element={<MyAttendancePage />} />
            <Route path="my/results" element={<MyResultsPage />} />
            <Route path="children/:studentId/results" element={<ChildrenResultsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
