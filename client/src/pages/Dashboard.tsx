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

// Composant Carte Dashboard (Style Africain / Moderne)
interface DashboardCardProps {
  title: string;
  count: string | number;
  label: string;
  image: string;
  badgeColor: string;
  onClick: () => void;
}

const DashboardCard = ({ title, count, label, image, badgeColor, onClick }: DashboardCardProps) => (
  <div 
    onClick={onClick} 
    className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 group"
  >
    <div className="relative h-48 overflow-hidden">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
      />
      <div className={`absolute top-3 right-3 ${badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm`}>
        {title}
      </div>
    </div>
    <div className="p-4 text-center">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">{count}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{label}</p>
    </div>
  </div>
);

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

  // Images "Africaines" Libres de droits (Unsplash)
  const IMAGES = {
    STUDENTS: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=800&q=80", // Jeune homme africain / étudiant
    TEACHERS: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80", // Enseignante africaine professionnelle
    EDUCATORS: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=80", // Femme pro lunettes (Admin/Educateur)
    CLASSES: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80", // Salle de classe
    SCHOOLS: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80", // École / Campus
    COURSES: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=800&q=80", // Livres / Études
    HOMEWORK: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80", // Écriture / Devoirs
    USERS: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=800&q=80", // Groupe pro
    FORUM: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80" // Discussion de groupe
  };

  return (
    <div className="space-y-8">
      {/* En-tête de bienvenue personnalisé */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Bienvenue, {user.firstName} !</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Vous êtes connecté en tant que <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide text-xs md:text-sm">{user.role.replace('_', ' ')}</span>.
        </p>
      </div>

      {/* Grille de cartes de statistiques adaptées selon le rôle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Vue pour le Super Admin (Gestion globale) */}
        {user.role === 'SUPER_ADMIN' && (
          <>
            <DashboardCard 
              title="Écoles"
              count={stats?.schools ?? '...'}
              label="Établissements actifs"
              image={IMAGES.SCHOOLS}
              badgeColor="bg-blue-600"
              onClick={() => navigate('/schools')}
            />
             <DashboardCard 
              title="Utilisateurs"
              count={stats?.users ?? '...'}
              label="Total inscrits"
              image={IMAGES.USERS}
              badgeColor="bg-green-600"
              onClick={() => navigate('/users')}
            />
          </>
        )}

        {/* Vue pour l'Admin d'école et l'Admin IT */}
        {(user.role === 'SCHOOL_ADMIN' || user.role === 'IT_ADMIN') && (
          <>
            <DashboardCard 
              title="Classes"
              count={stats?.classes ?? '...'}
              label="Classes actives"
              image={IMAGES.CLASSES}
              badgeColor="bg-purple-600"
              onClick={() => navigate('/classes')}
            />
            <DashboardCard 
              title="Enseignants"
              count={stats?.teachers ?? '...'}
              label="Personnel enseignant"
              image={IMAGES.TEACHERS}
              badgeColor="bg-yellow-600"
              onClick={() => navigate('/users')} // Ou filtre enseignants
            />
             <DashboardCard 
              title="Élèves"
              count={stats?.students ?? '...'}
              label="Inscrits"
              image={IMAGES.STUDENTS}
              badgeColor="bg-green-600"
              onClick={() => navigate('/users')} // Ou filtre élèves
            />
            <DashboardCard 
              title="Educateurs"
              count={stats?.users ? stats.users - (stats.students || 0) : '...'} // Approximation ou stats dédiées
              label="Personnel Admin"
              image={IMAGES.EDUCATORS}
              badgeColor="bg-indigo-600"
              onClick={() => navigate('/users')}
            />
          </>
        )}

        {/* Vue pour l'Enseignant */}
        {user.role === 'TEACHER' && (
          <>
            <DashboardCard 
              title="Mes Cours"
              count={stats?.courses ?? '...'}
              label="Cours assignés"
              image={IMAGES.COURSES}
              badgeColor="bg-indigo-600"
              onClick={() => navigate('/courses')}
            />
            <DashboardCard 
              title="Devoirs"
              count={stats?.ungradedSubmissions ?? '...'}
              label="À corriger"
              image={IMAGES.HOMEWORK}
              badgeColor="bg-pink-600"
              onClick={() => navigate('/agenda')} // Ou assignments list
            />
             <DashboardCard 
              title="Classes"
              count={stats?.classes ?? '...'} // Si dispo pour prof
              label="Mes Classes"
              image={IMAGES.CLASSES}
              badgeColor="bg-purple-600"
              onClick={() => navigate('/courses')}
            />
          </>
        )}

        {/* Vue pour l'Élève */}
        {user.role === 'STUDENT' && (
          <>
            <DashboardCard 
              title="Mes Matières"
              count={stats?.enrolledCourses ?? '...'}
              label="Inscriptions"
              image={IMAGES.COURSES}
              badgeColor="bg-teal-600"
              onClick={() => navigate('/courses')}
            />
            <DashboardCard 
              title="Devoirs"
              count={stats?.pendingAssignments ?? '...'}
              label="À rendre"
              image={IMAGES.HOMEWORK}
              badgeColor="bg-orange-600"
              onClick={() => navigate('/agenda')}
            />
            <DashboardCard 
              title="Bibliothèque"
              count="Accès"
              label="Ressources"
              image={IMAGES.CLASSES} // Ou image bibliothèque
              badgeColor="bg-blue-600"
              onClick={() => navigate('/library')}
            />
          </>
        )}

        {/* Carte Forum École (Pour tous) */}
        <DashboardCard 
          title="Forum École"
          count="Discussion"
          label="Espace d'échange"
          image={IMAGES.FORUM}
          badgeColor="bg-blue-600"
          onClick={() => navigate('/forum')}
        />
      </div>
    </div>
  );
};

export default Dashboard;
