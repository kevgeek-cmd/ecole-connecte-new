import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  school?: {
    name: string;
  };
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  // To populate school dropdown for Super Admin
  const [schools, setSchools] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const fetchSchools = async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
        try {
            const response = await api.get('/schools');
            setSchools(response.data);
        } catch (error) {
            console.error('Error fetching schools', error);
        }
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, [currentUser]);

  const onSubmit = async (data: any) => {
    try {
        // If School Admin, automatically assign to their school
        if (currentUser?.role === 'SCHOOL_ADMIN' && currentUser.schoolId) { 
             data.schoolId = currentUser.schoolId;
        }
        
      await api.post('/users', data);
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter un utilisateur
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">École</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' : 
                      u.role === 'SCHOOL_ADMIN' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'TEACHER' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{u.school?.name || '-'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ajouter un utilisateur</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prénom</label>
                  <input {...register('firstName', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input {...register('lastName', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 text-black" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input {...register('email', { required: true })} type="email" className="w-full p-2 border border-gray-300 rounded mt-1 text-black" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input {...register('password', { required: true, minLength: 6 })} type="password" className="w-full p-2 border border-gray-300 rounded mt-1 text-black" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                <select {...register('role', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 text-black">
                    <option value="STUDENT">Élève</option>
                    <option value="TEACHER">Enseignant</option>
                    <option value="SCHOOL_ADMIN">Administrateur École</option>
                    {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                </select>
              </div>

              {currentUser?.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">École</label>
                    <select {...register('schoolId')} className="w-full p-2 border border-gray-300 rounded mt-1 text-black">
                        <option value="">Aucune</option>
                        {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
