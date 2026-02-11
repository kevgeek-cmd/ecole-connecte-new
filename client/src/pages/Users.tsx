import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, ArrowLeft, Users as UsersIcon, GraduationCap, School, UserCog, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      if (u.role === 'SUPER_ADMIN' || u.role === 'SCHOOL_ADMIN' || u.role === 'IT_ADMIN' || u.role === 'EDUCATOR') {
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

  const formatRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Administrateur';
      case 'SCHOOL_ADMIN': return 'Administrateur école';
      case 'IT_ADMIN': return 'Informaticien';
      case 'EDUCATOR': return 'Éducateur';
      case 'TEACHER': return 'Enseignant';
      case 'STUDENT': return 'Élève';
      default: return role;
    }
  };

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
    setSubmitError(null);
    setShowPassword(false);
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
    setSubmitError(null);
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
    } catch (error: any) {
      console.error('Error saving user', error);
      setSubmitError(error.response?.data?.message || 'Une erreur est survenue lors de la création de l\'utilisateur.');
    }
  };

  const getUserGroupImage = (type: string) => {
    if (type === 'admin') return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600';
    if (type === 'teacher') return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600';
    if (type === 'class') return 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600';
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedGroupId && (
            <button 
              onClick={() => setSelectedGroupId(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 group overflow-hidden flex flex-col h-full"
            >
              <div className="h-32 w-full relative overflow-hidden">
                <img 
                    src={getUserGroupImage(group.type)} 
                    alt={group.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70"></div>
                <div className="absolute top-3 right-3">
                    <span className="bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm">
                        {group.count}
                    </span>
                </div>
                <div className="absolute bottom-3 left-4 text-white">
                    <div className={`p-2 rounded-lg inline-flex mb-1 backdrop-blur-sm ${
                        group.type === 'admin' ? 'bg-purple-500/20 text-purple-100' :
                        group.type === 'teacher' ? 'bg-yellow-500/20 text-yellow-100' :
                        group.type === 'class' ? 'bg-blue-500/20 text-blue-100' :
                        'bg-gray-500/20 text-gray-100'
                    }`}>
                        {group.type === 'admin' && <UserCog className="w-5 h-5" />}
                        {group.type === 'teacher' && <GraduationCap className="w-5 h-5" />}
                        {group.type === 'class' && <School className="w-5 h-5" />}
                        {group.type === 'other' && <UsersIcon className="w-5 h-5" />}
                    </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{group.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {group.count} {group.count === 1 ? 'utilisateur' : 'utilisateurs'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Classe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">École</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedGroup?.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${u.role === 'SUPER_ADMIN' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
                        u.role === 'SCHOOL_ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                        u.role === 'IT_ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400' :
                        u.role === 'TEACHER' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'}`}>
                      {formatRole(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{u.enrollments?.[0]?.class?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{u.school?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                          {(currentUser?.role === 'SUPER_ADMIN' || 
                            (currentUser?.role === 'SCHOOL_ADMIN' && u.role !== 'SUPER_ADMIN') ||
                            (currentUser?.role === 'IT_ADMIN' && (u.role === 'TEACHER' || u.role === 'STUDENT' || u.id === currentUser?.id))) && (
                            <button 
                                onClick={() => handleEditClick(u)}
                                className="p-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded transition"
                                title="Modifier"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                          )}
                          
                          {(currentUser?.role === 'SUPER_ADMIN' || 
                            (currentUser?.role === 'SCHOOL_ADMIN' && u.role !== 'SUPER_ADMIN') ||
                            (currentUser?.role === 'IT_ADMIN' && (u.role === 'TEACHER' || u.role === 'STUDENT'))) && (
                            <button 
                                onClick={() => handleDeleteClick(u.id)}
                                className="p-1 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h2>
            
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-200 dark:border-transparent">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
                  <input {...register('firstName', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
                  <input {...register('lastName', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input {...register('email', { required: true })} type="email" className="w-full p-2 border border-gray-300 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</label>
                <div className="relative">
                    <input 
                        {...register('password', { required: !editingUser, minLength: 6 })} 
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-2 border border-gray-300 rounded mt-1 pr-10 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""} 
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none mt-0.5"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rôle</label>
                <select {...register('role', { required: true })} className="w-full p-2 border border-gray-300 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="STUDENT">Élève</option>
                    <option value="TEACHER">Enseignant</option>
                    {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SCHOOL_ADMIN') && (
                        <>
                            <option value="IT_ADMIN">Informaticien</option>
                            <option value="EDUCATOR">Éducateur</option>
                        </>
                    )}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">École</label>
                    <select {...register('schoolId')} className="w-full p-2 border border-gray-300 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
