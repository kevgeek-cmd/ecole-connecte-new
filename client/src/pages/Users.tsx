import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, ArrowLeft, Users as UsersIcon, GraduationCap, School, UserCog } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId?: string | null;
  school?: {
    name: string;
  };
  enrollments?: {
    class: {
        name: string;
    }
  }[];
}

interface UserGroup {
  id: string;
  title: string;
  count: number;
  type: 'admin' | 'teacher' | 'class' | 'other';
  users: User[];
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();
  
  // To populate school dropdown for Super Admin
  const [schools, setSchools] = useState<any[]>([]);

  // Group users logic
  const groups = useMemo(() => {
    const admins: User[] = [];
    const teachers: User[] = [];
    const studentsByClass: Record<string, User[]> = {};
    const studentsNoClass: User[] = [];

    users.forEach(u => {
      if (u.role === 'SUPER_ADMIN' || u.role === 'SCHOOL_ADMIN') {
        admins.push(u);
      } else if (u.role === 'TEACHER') {
        teachers.push(u);
      } else if (u.role === 'STUDENT') {
        const className = u.enrollments?.[0]?.class?.name;
        if (className) {
          if (!studentsByClass[className]) {
            studentsByClass[className] = [];
          }
          studentsByClass[className].push(u);
        } else {
          studentsNoClass.push(u);
        }
      }
    });

    const result: UserGroup[] = [
      { id: 'admins', title: 'Administrateurs', count: admins.length, type: 'admin', users: admins },
      { id: 'teachers', title: 'Enseignants', count: teachers.length, type: 'teacher', users: teachers },
    ];

    // Sort classes alphabetically
    Object.keys(studentsByClass).sort().forEach(className => {
      result.push({
        id: `class-${className}`,
        title: `Classe ${className}`,
        count: studentsByClass[className].length,
        type: 'class',
        users: studentsByClass[className]
      });
    });

    if (studentsNoClass.length > 0) {
      result.push({ id: 'no-class', title: 'Élèves sans classe', count: studentsNoClass.length, type: 'other', users: studentsNoClass });
    }

    return result;
  }, [users]);

  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && !selectedGroup) {
      setSelectedGroupId(null);
    }
  }, [selectedGroupId, selectedGroup]);

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

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
        await api.delete(`/users/${userToDelete}`);
        fetchUsers();
    } catch (error) {
        console.error('Error deleting user', error);
    } finally {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    }
  };

  const confirmEdit = async () => {
    if (!editingUser || !formData) return;
    try {
        await api.put(`/users/${editingUser.id}`, formData);
        fetchUsers();
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
    } catch (error) {
        console.error('Error updating user', error);
    } finally {
        setIsEditConfirmModalOpen(false);
        setFormData(null);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    reset({
        firstName: '',
        lastName: '',
        email: '',
        role: 'STUDENT',
        password: '',
        schoolId: ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
        // If School Admin, automatically assign to their school
        if (currentUser?.role === 'SCHOOL_ADMIN' && currentUser.schoolId) { 
             data.schoolId = currentUser.schoolId;
        }

        if (editingUser) {
            // Remove password if empty
            if (!data.password) {
                delete data.password;
            }
            setFormData(data);
            setIsEditConfirmModalOpen(true);
        } else {
            await api.post('/users', data);
            setIsModalOpen(false);
            reset();
            fetchUsers();
        }
    } catch (error) {
      console.error('Error saving user', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedGroupId && (
            <button 
              onClick={() => setSelectedGroupId(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedGroup ? selectedGroup.title : 'Gestion des Utilisateurs'}
          </h1>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ajouter un utilisateur
        </button>
      </div>

      {!selectedGroupId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div 
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  group.type === 'admin' ? 'bg-purple-100 text-purple-600' :
                  group.type === 'teacher' ? 'bg-yellow-100 text-yellow-600' :
                  group.type === 'class' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {group.type === 'admin' && <UserCog className="w-6 h-6" />}
                  {group.type === 'teacher' && <GraduationCap className="w-6 h-6" />}
                  {group.type === 'class' && <School className="w-6 h-6" />}
                  {group.type === 'other' && <UsersIcon className="w-6 h-6" />}
                </div>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                  {group.count}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{group.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {group.count} {group.count === 1 ? 'utilisateur' : 'utilisateurs'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">École</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedGroup?.users.map((u) => (
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
                    <div className="text-sm text-gray-500">{u.enrollments?.[0]?.class?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{u.school?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={() => handleEditClick(u)}
                              className="p-1 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded transition"
                              title="Modifier"
                          >
                              <Edit className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={() => handleDeleteClick(u.id)}
                              className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                              title="Supprimer"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h2>
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
                <input {...register('password', { required: !editingUser, minLength: 6 })} type="password" className="w-full p-2 border border-gray-300 rounded mt-1 text-black" placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                <select {...register('role', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 text-black">
                    <option value="STUDENT">Élève</option>
                    <option value="TEACHER">Enseignant</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                        <>
                            <option value="SCHOOL_ADMIN">Administrateur École</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </>
                    )}
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
                  {editingUser ? 'Sauvegarder' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        confirmText="Supprimer"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Modifier l'utilisateur"
        message="Êtes-vous sûr de vouloir modifier cet utilisateur ?"
        confirmText="Sauvegarder"
        isDanger={false}
      />
    </div>
  );
};

export default Users;
