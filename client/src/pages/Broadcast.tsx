import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Send, AlertCircle, CheckCircle, Users, School, Globe, UserCheck, CheckSquare, Square } from 'lucide-react';

interface BroadcastForm {
  title: string;
  message: string;
}

interface SchoolData {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  school?: { name: string };
}

type TargetType = 'GLOBAL' | 'SPECIFIC_SCHOOLS' | 'SPECIFIC_ADMINS' | 'ROLE_BASED' | 'SPECIFIC_USERS';

const Broadcast = () => {
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BroadcastForm>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // State for targeting logic
  const [targetType, setTargetType] = useState<TargetType>('GLOBAL');
  const [targetRoles, setTargetRoles] = useState<string[]>(['ALL']); // For School Admins & Educators
  
  // Data lists
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [admins, setAdmins] = useState<UserData[]>([]);
  
  // Selections
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Loading states
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'EDUCATOR') {
        setTargetType('ROLE_BASED');
        setTargetRoles(['ALL']);
        // Fetch classes for school admin/educator
        const fetchClasses = async () => {
            try {
                await api.get('/classes');
            } catch (err) {
                console.error("Error fetching classes", err);
            }
        };
        fetchClasses();
    }
  }, [user]);

  // Fetch users when a class is selected
  useEffect(() => {
    const fetchClassUsers = async () => {
        if (!selectedClassId) {
            return;
        }
        setLoadingData(true);
        try {
            await api.get(`/classes/${selectedClassId}/students`);
        } catch (err) {
            console.error("Error fetching class users", err);
        } finally {
            setLoadingData(false);
        }
    };
    fetchClassUsers();
  }, [selectedClassId]);

  // Fetch data based on selection (Super Admin)
  useEffect(() => {
    const fetchData = async () => {
        if (user?.role !== 'SUPER_ADMIN') return;

        if (targetType === 'SPECIFIC_SCHOOLS' && schools.length === 0) {
            setLoadingData(true);
            try {
                const res = await api.get('/schools');
                setSchools(res.data);
            } catch (err) {
                console.error("Error fetching schools", err);
            } finally {
                setLoadingData(false);
            }
        }

        if (targetType === 'SPECIFIC_ADMINS' && admins.length === 0) {
            setLoadingData(true);
            try {
                const res = await api.get('/users?role=SCHOOL_ADMIN');
                setAdmins(res.data);
            } catch (err) {
                console.error("Error fetching admins", err);
            } finally {
                setLoadingData(false);
            }
        }
    };

    fetchData();
  }, [targetType, user, schools.length, admins.length]);

  const toggleSchoolSelection = (id: string) => {
    setSelectedSchoolIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAdminSelection = (id: string) => {
    setSelectedAdminIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllSchools = () => {
      if (selectedSchoolIds.length === schools.length) setSelectedSchoolIds([]);
      else setSelectedSchoolIds(schools.map(s => s.id));
  };

  const selectAllAdmins = () => {
      if (selectedAdminIds.length === admins.length) setSelectedAdminIds([]);
      else setSelectedAdminIds(admins.map(a => a.id));
  };

  const toggleRoleSelection = (role: string) => {
      if (role === 'ALL') {
          setTargetRoles(['ALL']);
          return;
      }

      setTargetRoles(prev => {
          const newRoles = prev.filter(r => r !== 'ALL');
          if (newRoles.includes(role)) {
              const filtered = newRoles.filter(r => r !== role);
              return filtered.length === 0 ? ['ALL'] : filtered;
          } else {
              return [...newRoles, role];
          }
      });
  };

  const onSubmit = async (data: BroadcastForm) => {
    setIsSubmitting(true);
    setStatus(null);

    // Validation
    if (user?.role === 'SUPER_ADMIN') {
        if (targetType === 'SPECIFIC_SCHOOLS' && selectedSchoolIds.length === 0) {
            setStatus({ type: 'error', message: "Veuillez sélectionner au moins une école." });
            setIsSubmitting(false);
            return;
        }
        if (targetType === 'SPECIFIC_ADMINS' && selectedAdminIds.length === 0) {
            setStatus({ type: 'error', message: "Veuillez sélectionner au moins un administrateur." });
            setIsSubmitting(false);
            return;
        }
    } else {
        if (targetType === 'SPECIFIC_USERS' && selectedUserIds.length === 0) {
            setStatus({ type: 'error', message: "Veuillez sélectionner au moins un utilisateur." });
            setIsSubmitting(false);
            return;
        }
    }

    try {
      const payload: any = {
        title: data.title,
        message: data.message,
      };

      if (user?.role === 'SUPER_ADMIN') {
          if (targetType === 'GLOBAL') {
              payload.targetRoles = ['ALL'];
          } else if (targetType === 'SPECIFIC_SCHOOLS') {
              payload.targetSchoolIds = selectedSchoolIds;
              payload.targetRoles = ['ALL'];
          } else if (targetType === 'SPECIFIC_ADMINS') {
              payload.targetUserIds = selectedAdminIds;
          }
      } else if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'EDUCATOR') {
          if (targetType === 'ROLE_BASED') {
              payload.targetRoles = targetRoles;
              if (selectedClassId) payload.classId = selectedClassId;
          } else if (targetType === 'SPECIFIC_USERS') {
              payload.targetUserIds = selectedUserIds;
          }
      }

      const response = await api.post('/notifications/broadcast', payload);
      
      setStatus({ type: 'success', message: response.data.message });
      reset();
      setSelectedSchoolIds([]);
      setSelectedAdminIds([]);
      setSelectedUserIds([]);
      setSelectedClassId('');
      if (user?.role === 'SUPER_ADMIN') setTargetType('GLOBAL');
      else setTargetType('ROLE_BASED');
      setTargetRoles(['ALL']);
    } catch (error: any) {
      console.error("Broadcast error", error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || error.message || "Une erreur est survenue lors de l'envoi." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Diffuser une annonce
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Envoyez des notifications ciblées aux utilisateurs, écoles ou administrateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Target Selection */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      Cible de l'annonce
                  </h2>

                  {user?.role === 'SUPER_ADMIN' ? (
                      <div className="space-y-3">
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'GLOBAL' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'GLOBAL'} 
                                  onChange={() => setTargetType('GLOBAL')}
                                  className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium dark:text-white">Tout le monde (Global)</span>
                              </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'SPECIFIC_SCHOOLS' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'SPECIFIC_SCHOOLS'} 
                                  onChange={() => setTargetType('SPECIFIC_SCHOOLS')}
                                  className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex items-center gap-2">
                                  <School className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium dark:text-white">Écoles spécifiques</span>
                              </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'SPECIFIC_ADMINS' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'SPECIFIC_ADMINS'} 
                                  onChange={() => setTargetType('SPECIFIC_ADMINS')}
                                  className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium dark:text-white">Administrateurs spécifiques</span>
                              </div>
                          </label>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('ALL') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('ALL')} 
                                  onChange={() => toggleRoleSelection('ALL')}
                                  className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium dark:text-white">Tout l'établissement</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('TEACHER') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('TEACHER')} 
                                  onChange={() => toggleRoleSelection('TEACHER')}
                                  className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium dark:text-white">Professeurs</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('STUDENT') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('STUDENT')} 
                                  onChange={() => toggleRoleSelection('STUDENT')}
                                  className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium dark:text-white">Élèves</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('EDUCATOR') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('EDUCATOR')} 
                                  onChange={() => toggleRoleSelection('EDUCATOR')}
                                  className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium dark:text-white">Éducateurs</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('IT_ADMIN') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('IT_ADMIN')} 
                                  onChange={() => toggleRoleSelection('IT_ADMIN')}
                                  className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium dark:text-white">Informaticiens</span>
                          </label>
                      </div>
                  )}
              </div>
              
              {/* Dynamic Selection List for Super Admin */}
              {user?.role === 'SUPER_ADMIN' && targetType === 'SPECIFIC_SCHOOLS' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-700 dark:text-gray-300">Sélectionner les écoles</h3>
                          <button onClick={selectAllSchools} className="text-xs text-blue-600 hover:underline">
                              {selectedSchoolIds.length === schools.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {loadingData ? (
                              <p className="text-sm text-gray-500">Chargement...</p>
                          ) : schools.map(school => (
                              <div 
                                  key={school.id}
                                  onClick={() => toggleSchoolSelection(school.id)}
                                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedSchoolIds.includes(school.id) ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                  {selectedSchoolIds.includes(school.id) ? 
                                      <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                                      <Square className="w-4 h-4 text-gray-400" />
                                  }
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{school.name}</span>
                              </div>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                          {selectedSchoolIds.length} école(s) sélectionnée(s)
                      </p>
                  </div>
              )}

              {user?.role === 'SUPER_ADMIN' && targetType === 'SPECIFIC_ADMINS' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-700 dark:text-gray-300">Sélectionner les admins</h3>
                          <button onClick={selectAllAdmins} className="text-xs text-blue-600 hover:underline">
                              {selectedAdminIds.length === admins.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {loadingData ? (
                              <p className="text-sm text-gray-500">Chargement...</p>
                          ) : admins.map(admin => (
                              <div 
                                  key={admin.id}
                                  onClick={() => toggleAdminSelection(admin.id)}
                                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedAdminIds.includes(admin.id) ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                  {selectedAdminIds.includes(admin.id) ? 
                                      <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                                      <Square className="w-4 h-4 text-gray-400" />
                                  }
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{admin.firstName} {admin.lastName}</span>
                                      <span className="text-xs text-gray-500">{admin.school?.name || 'Sans école'}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                          {selectedAdminIds.length} admin(s) sélectionné(s)
                      </p>
                  </div>
              )}
          </div>

          {/* Right Column: Message Form */}
          <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {status && (
                  <div className={`mb-6 p-4 rounded-md flex items-start gap-3 ${
                    status.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <p>{status.message}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre de l'annonce</label>
                      <input
                        {...register('title', { required: 'Le titre est requis' })}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-all"
                        placeholder="Ex: Maintenance prévue, Nouvelle fonctionnalité..."
                      />
                      {errors.title && <span className="text-red-500 text-sm mt-1">{errors.title.message}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                      <textarea
                        {...register('message', { required: 'Le message est requis' })}
                        rows={8}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-all"
                        placeholder="Écrivez votre message ici..."
                      />
                      {errors.message && <span className="text-red-500 text-sm mt-1">{errors.message.message}</span>}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm hover:shadow ${
                          isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Envoi en cours...' : 'Envoyer l\'annonce'}
                      </button>
                    </div>
                </form>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Broadcast;