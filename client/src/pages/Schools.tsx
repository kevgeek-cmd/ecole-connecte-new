import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, User, Edit2, Lock, Unlock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface School {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    users: number;
    classes: number;
  };
}

const Schools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools', error);
    }
  };

  const fetchAvailableManagers = async () => {
      try {
          const response = await api.get('/users?role=SCHOOL_ADMIN');
          const allAdmins = response.data;
          // Filter: Admin must not have a school (school: null)
          const freeAdmins = allAdmins.filter((u: any) => !u.school);
          setAvailableManagers(freeAdmins);
      } catch (error) {
          console.error('Error fetching users', error);
      }
  }

  useEffect(() => {
    fetchSchools();
    fetchAvailableManagers();
  }, []);

  const openCreateModal = async () => {
      await fetchAvailableManagers();
      setEditingSchool(null);
      reset({ name: '', address: '', managerId: '' });
      setIsModalOpen(true);
  }

  const openEditModal = async (school: School) => {
      try {
        const response = await api.get('/users?role=SCHOOL_ADMIN');
        const allAdmins = response.data;
        
        // Available = No school OR matches current school manager
        const validManagers = allAdmins.filter((u: any) => 
            !u.school || (school.managerId && u.id === school.managerId)
        );
        
        setAvailableManagers(validManagers);
        
        setEditingSchool(school);
        setValue('name', school.name);
        setValue('address', school.address);
        setValue('managerId', school.managerId || '');
        setIsModalOpen(true);
      } catch (error) {
        console.error('Error preparing edit modal', error);
      }
  }

  const onSubmit = async (data: any) => {
    try {
      if (editingSchool) {
          await api.put(`/schools/${editingSchool.id}`, data);
      } else {
          await api.post('/schools', data);
      }
      setIsModalOpen(false);
      reset();
      fetchSchools();
      fetchAvailableManagers();
    } catch (error: any) {
      console.error('Error saving school', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement');
    }
  };

  const confirmDelete = (id: string) => {
      setSchoolToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const handleDelete = async () => {
    if (schoolToDelete) {
      try {
        await api.delete(`/schools/${schoolToDelete}`);
        fetchSchools();
        fetchAvailableManagers();
        setIsDeleteModalOpen(false);
        setSchoolToDelete(null);
      } catch (error) {
        console.error('Error deleting school', error);
        alert('Impossible de supprimer cette école');
      }
    }
  };

  const toggleStatus = async (school: School) => {
      try {
          await api.put(`/schools/${school.id}`, {
              isActive: !school.isActive
          });
          fetchSchools();
      } catch (error) {
          console.error('Error updating status', error);
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Écoles</h1>
        <div className="relative group">
            <button
            onClick={openCreateModal}
            disabled={availableManagers.length === 0}
            className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                availableManagers.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            >
            <Plus className="w-4 h-4" />
            Ajouter une école
            </button>
            {availableManagers.length === 0 && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-gray-800 text-white text-xs rounded p-2 text-center z-10 hidden group-hover:block">
                    Créez d'abord un Administrateur École libre avant de créer une école.
                </div>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Adresse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Directeur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stats</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {schools.map((school) => (
              <tr key={school.id} className={!school.isActive ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                        onClick={() => toggleStatus(school)}
                        className={`p-1 rounded-full transition-colors ${school.isActive ? 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'}`}
                        title={school.isActive ? "Bloquer l'école" : "Débloquer l'école"}
                    >
                        {school.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{school.name}</div>
                  {!school.isActive && <span className="text-xs text-red-500 font-semibold">Suspendue</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{school.address}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {school.manager ? `${school.manager.firstName} ${school.manager.lastName}` : 'Non assigné'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{school.manager?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div>{school._count?.users || 0} utilisateurs</div>
                  <div>{school._count?.classes || 0} classes</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button onClick={() => openEditModal(school)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2" title="Modifier">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => confirmDelete(school.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {schools.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        Aucune école trouvée. Commencez par créer une école.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingSchool ? 'Modifier l\'école' : 'Ajouter une école'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l'école</label>
                <input
                  {...register('name', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse</label>
                <input
                  {...register('address')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Directeur (Admin École)</label>
                <select
                  {...register('managerId', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {availableManagers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
                {availableManagers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Aucun administrateur disponible. Veuillez en créer un d'abord dans l'onglet Utilisateurs.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingSchool ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'école"
        message="Êtes-vous sûr de vouloir supprimer cette école ? Cette action est irréversible et supprimera toutes les données associées."
        confirmText="Supprimer"
        isDanger={true}
      />
    </div>
  );
};

export default Schools;