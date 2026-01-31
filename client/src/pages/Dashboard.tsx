/**
 * Page du Tableau de Bord (Dashboard).
 * Affiche des statistiques personnalisées en fonction du rôle de l'utilisateur.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Structure des statistiques reçues du serveur
interface DashboardStats {
  schools?: number;
  users?: number;
  classes?: number;
  teachers?: number;
  students?: number;
  courses?: number;
  ungradedSubmissions?: number;
  enrolledCourses?: number;
  pendingAssignments?: number;
}

const Dashboard = () => {
  const { user } = useAuth(); // Récupère les infos de l'utilisateur connecté
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
    if (!user) {
      navigate('/login');
      return;
    }

    /**
     * Récupère les statistiques depuis l'API.
     */
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques", error);
      }
    };

    fetchStats();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* En-tête de bienvenue personnalisé */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Bienvenue, {user.firstName} !</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Vous êtes connecté en tant que <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide text-xs md:text-sm">{user.role.replace('_', ' ')}</span>.
        </p>
      </div>

      {/* Grille de cartes de statistiques adaptées selon le rôle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Vue pour le Super Admin (Gestion globale) */}
        {user.role === 'SUPER_ADMIN' && (
          <>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Écoles</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.schools ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Établissements actifs</p>
            </div>
             <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-green-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Utilisateurs</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.users ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Total inscrits</p>
            </div>
          </>
        )}

        {/* Vue pour l'Admin d'école et l'Admin IT */}
        {(user.role === 'SCHOOL_ADMIN' || user.role === 'IT_ADMIN') && (
          <>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Classes</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.classes ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Classes actives</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Enseignants</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.teachers ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Personnel enseignant</p>
            </div>
             <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-green-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Élèves</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.students ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Inscrits</p>
            </div>
          </>
        )}

        {/* Vue pour l'Enseignant */}
        {user.role === 'TEACHER' && (
           <>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Mes Cours</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.courses ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Cours assignés</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-pink-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Devoirs à corriger</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.ungradedSubmissions ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">En attente</p>
            </div>
          </>
        )}

        {/* Vue pour l'Élève */}
        {user.role === 'STUDENT' && (
           <>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-teal-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Mes Matières</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.enrolledCourses ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Inscriptions</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
              <h3 className="text-sm md:text-lg font-semibold text-gray-700 dark:text-gray-300">Devoirs à rendre</h3>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats?.pendingAssignments ?? '...'}</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">En attente</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
