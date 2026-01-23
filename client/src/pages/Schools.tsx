import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, MapPin, User } from 'lucide-react';

interface School {
  id: string;
  name: string;
  address: string;
  manager?: {
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
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools', error);
    }
  };

  const fetchUsers = async () => {
      try {
          const response = await api.get('/users');
          setUsers(response.data);
      } catch (error) {
          console.error('Error fetching users', error);
      }
  }

  useEffect(() => {
    fetchSchools();
  }, []);

  const openModal = () => {
      fetchUsers();
      setIsModalOpen(true);
  }

  const onSubmit = async (data: any) => {
    try {
      // Clean up empty managerId
      if (!data.managerId) delete data.managerId;
      
      await api.post('/schools', data);
      setIsModalOpen(false);
      reset();
      fetchSchools();
    } catch (error) {
      console.error('Error creating school', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette école ?')) {
      try {
        await api.delete(`/schools/${id}`);
        fetchSchools();
      } catch (error) {
        console.error('Error deleting school', error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Écoles</h1>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter une école
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Directeur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schools.map((school) => (
              <tr key={school.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{school.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {school.address || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">
                        {school.manager ? `${school.manager.firstName} ${school.manager.lastName}` : 'Non assigné'}
                      </div>
                      <div className="text-xs text-gray-400">{school.manager?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {school._count?.users || 0} utilisateurs, {school._count?.classes || 0} classes
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDelete(school.id)} className="text-red-600 hover:text-red-900 ml-4">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ajouter une école</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom de l'école</label>
                <input
                  {...register('name', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded mt-1 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  {...register('address')}
                  className="w-full p-2 border border-gray-300 rounded mt-1 text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Directeur (Optionnel)</label>
                <select
                  {...register('managerId')}
                  className="w-full p-2 border border-gray-300 rounded mt-1 text-black"
                >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">L'utilisateur sélectionné deviendra Administrateur de cette école.</p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;
