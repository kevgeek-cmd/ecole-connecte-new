import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, School, BookOpen, GraduationCap, LayoutDashboard, FileText, Megaphone, Moon, Sun, Library, MessageCircle, X, Calendar, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Fermer la sidebar sur mobile quand on change de page
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
      {/* Overlay pour mobile - ferme la sidebar quand on clique à côté */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar principale */}
      <div className={`
        w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              Ecole Connectée
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
          </div>
          {/* Bouton fermer sur mobile */}
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-gray-800 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/dashboard' ? 'bg-blue-600/20 text-blue-400 border-r-4 border-blue-500' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
            Tableau de bord
          </Link>

          <Link to="/forum" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/forum' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
            <MessageSquare className="w-5 h-5" />
            Forum École
          </Link>

          {user.role === 'SUPER_ADMIN' && (
            <>
              <Link to="/schools" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/schools' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <School className="w-5 h-5" />
                Écoles
              </Link>
              <Link to="/users" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/users' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <User className="w-5 h-5" />
                Utilisateurs
              </Link>
              <Link to="/broadcast" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/broadcast' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <Megaphone className="w-5 h-5" />
                Annonces
              </Link>
            </>
          )}

          {(user.role === 'SCHOOL_ADMIN' || user.role === 'IT_ADMIN') && (
            <>
              <Link to="/classes" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/classes' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <School className="w-5 h-5" />
                Classes
              </Link>
              <Link to="/academic-years" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/academic-years' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <BookOpen className="w-5 h-5" />
                Années Scolaires
              </Link>
               <Link to="/subjects" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/subjects' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <BookOpen className="w-5 h-5" />
                Matières
              </Link>
               <Link to="/users" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/users' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <User className="w-5 h-5" />
                Utilisateurs
              </Link>
              {user.role === 'SCHOOL_ADMIN' && (
                 <Link to="/broadcast" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/broadcast' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                   <Megaphone className="w-5 h-5" />
                   Annonces
                 </Link>
              )}
              <Link to="/report-cards" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/report-cards' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <FileText className="w-5 h-5" />
                Bulletins
              </Link>
            </>
          )}

          {(user.role === 'TEACHER' || user.role === 'STUDENT') && (
            <>
              <Link to="/courses" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/courses' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <BookOpen className="w-5 h-5" />
                Mes Cours
              </Link>
              <Link to="/agenda" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/agenda' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <Calendar className="w-5 h-5" />
                Agenda
              </Link>
              <Link to="/library" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/library' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <Library className="w-5 h-5" />
                Bibliothèque
              </Link>
              <Link to="/chat" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/chat' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <MessageCircle className="w-5 h-5" />
                Messages
              </Link>
              <Link to="/report-cards" className={`flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition ${location.pathname === '/report-cards' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                <FileText className="w-5 h-5" />
                {user.role === 'STUDENT' ? 'Mes Bulletins' : 'Bulletins'}
              </Link>
            </>
          )}

          {/* Removed separate student section since merged above */}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-4">
          <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition text-sm"
          >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Mode Nuit' : 'Mode Jour'}
          </button>

          <div className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <span className="font-bold text-lg">{user.firstName[0]}{user.lastName[0]}</span>
              </div>
              <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
          </div>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-2 bg-red-600 hover:bg-red-700 rounded transition text-sm font-semibold"
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
    </>
  );
};

export default Sidebar;
