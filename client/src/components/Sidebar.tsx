import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, School, BookOpen, GraduationCap, LayoutDashboard, FileText, Megaphone, Moon, Sun, Library, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-500" />
          Ecole Connectée
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link to="/dashboard" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
          <LayoutDashboard className="w-5 h-5" />
          Tableau de bord
        </Link>

        {user.role === 'SUPER_ADMIN' && (
          <>
            <Link to="/schools" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <School className="w-5 h-5" />
              Écoles
            </Link>
            <Link to="/users" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <User className="w-5 h-5" />
              Utilisateurs
            </Link>
            <Link to="/broadcast" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <Megaphone className="w-5 h-5" />
              Annonces
            </Link>
          </>
        )}

        {(user.role === 'SCHOOL_ADMIN' || user.role === 'IT_ADMIN') && (
          <>
            <Link to="/classes" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <School className="w-5 h-5" />
              Classes
            </Link>
            <Link to="/academic-years" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <BookOpen className="w-5 h-5" />
              Années Scolaires
            </Link>
             <Link to="/subjects" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <BookOpen className="w-5 h-5" />
              Matières
            </Link>
             <Link to="/users" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <User className="w-5 h-5" />
              Utilisateurs
            </Link>
          </>
        )}

        {(user.role === 'TEACHER' || user.role === 'STUDENT') && (
          <>
            <Link to="/courses" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <BookOpen className="w-5 h-5" />
              Mes Cours
            </Link>
            <Link to="/library" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <Library className="w-5 h-5" />
              Bibliothèque
            </Link>
            <Link to="/chat" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <MessageCircle className="w-5 h-5" />
              Messages
            </Link>
          </>
        )}

        {user.role === 'STUDENT' && (
            <Link to="/report-cards" className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition">
              <FileText className="w-5 h-5" />
              Mes Bulletins
            </Link>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 p-2 mb-4 bg-gray-800 hover:bg-gray-700 rounded transition text-sm"
        >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'light' ? 'Mode Nuit' : 'Mode Jour'}
        </button>

        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="font-bold text-lg">{user.firstName[0]}{user.lastName[0]}</span>
            </div>
            <div>
                <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-400 truncate w-32">{user.email}</p>
            </div>
        </div>
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 p-2 bg-red-600 hover:bg-red-700 rounded transition text-sm"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirmer la déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
};

export default Sidebar;
