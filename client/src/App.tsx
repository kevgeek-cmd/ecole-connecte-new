import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Users from './pages/Users';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import AcademicYears from './pages/AcademicYears';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import AssignmentDetails from './pages/AssignmentDetails';
import StudentReportCards from './pages/StudentReportCards';
import Library from './pages/Library';
import Agenda from './pages/Agenda';
import Chat from './pages/Chat';
import QuizTake from './pages/QuizTake';
import QuizAttemptsList from './pages/QuizAttemptsList';
import QuizAttemptDetail from './pages/QuizAttemptDetail';
import Broadcast from './pages/Broadcast';
import Forum from './pages/Forum';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Super Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/schools" element={<Schools />} />
              </Route>

              {/* Broadcast - Super Admin & School Admin */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN']} />}>
                <Route path="/broadcast" element={<Broadcast />} />
              </Route>

              {/* Admin Routes (Super & School) */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'IT_ADMIN']} />}>
                <Route path="/users" element={<Users />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/academic-years" element={<AcademicYears />} />
              </Route>

              {/* Academic Routes (Accessible by all authorized roles, but logic handled inside components or backend) */}
              {/* Teachers & Students mainly, but Admins can view courses too */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'IT_ADMIN', 'EDUCATOR']} />}>
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetails />} />
                <Route path="/assignments/:id" element={<AssignmentDetails />} />
                <Route path="/library" element={<Library />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/report-cards" element={<StudentReportCards />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/quizzes/:id" element={<QuizTake />} />
                <Route path="/quizzes/:id/attempts" element={<QuizAttemptsList />} />
                <Route path="/quizzes/attempts/:id" element={<QuizAttemptDetail />} />
              </Route>

              {/* Student Only */}
              {/* <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                 <Route path="/report-cards" element={<StudentReportCards />} />
              </Route> */}

            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
