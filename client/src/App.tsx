import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import Chat from './pages/Chat';
import QuizTake from './pages/QuizTake';
import QuizAttemptsList from './pages/QuizAttemptsList';
import QuizAttemptDetail from './pages/QuizAttemptDetail';
import Broadcast from './pages/Broadcast';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

import NotificationCenter from './components/NotificationCenter';

const Layout = () => (
  <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    <Sidebar />
    <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
      {/* Top Header for Notifications */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-end px-8 shrink-0 transition-colors duration-200">
          <NotificationCenter />
      </header>
      
      {/* Main Content Scrollable Area */}
      <main className="flex-1 overflow-auto p-8 text-gray-900 dark:text-gray-100">
        <Outlet />
      </main>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Super Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/schools" element={<Schools />} />
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
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'IT_ADMIN']} />}>
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetails />} />
                <Route path="/assignments/:id" element={<AssignmentDetails />} />
                <Route path="/library" element={<Library />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/quizzes/:id" element={<QuizTake />} />
                <Route path="/quizzes/:id/attempts" element={<QuizAttemptsList />} />
                <Route path="/quizzes/attempts/:id" element={<QuizAttemptDetail />} />
              </Route>

              {/* Student Only */}
              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                 <Route path="/report-cards" element={<StudentReportCards />} />
              </Route>

            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
