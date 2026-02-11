import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Calendar, XCircle, Trash2, Edit, Filter, Award } from 'lucide-react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface Class {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

interface Conduct {
  id: string;
  appreciation: string | null;
  comment: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  term: {
    id: string;
    name: string;
  };
  createdAt: string;
}

const Conduct = () => {
  const [conducts, setConducts] = useState<Conduct[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedConduct, setSelectedConduct] = useState<Conduct | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<{
    studentId: string;
    termId: string;
    appreciation: string;
    comment: string;
  }>();

  useEffect(() => {
    fetchClasses();
    fetchTerms();
    fetchConducts();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchConducts();
  }, [selectedClassId, selectedTermId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes", err);
    }
  };

  const fetchTerms = async () => {
    try {
      // Fetch academic years and flatten terms
      const res = await api.get('/academic/years');
      const allTerms = res.data.flatMap((year: any) => year.terms);
      setTerms(allTerms);
      if (allTerms.length > 0 && !selectedTermId) {
        // Optionnel: sélectionner le terme ouvert par défaut
        const openTerm = allTerms.find((t: any) => t.status === 'OPEN');
        if (openTerm) setSelectedTermId(openTerm.id);
      }
    } catch (err) {
      console.error("Error fetching terms", err);
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const res = await api.get(`/classes/${classId}/students`);
      setStudents(res.data);
    } catch (err) {
      console.error("Error fetching students", err);
    }
  };

  const fetchConducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedTermId) params.termId = selectedTermId;
      
      const res = await api.get('/conducts', { params });
      setConducts(res.data);
    } catch (err) {
      console.error("Error fetching conducts", err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAdd = async (data: any) => {
    try {
      await api.post('/conducts', data);
      setIsAddModalOpen(false);
      reset();
      fetchConducts();
    } catch (err) {
      console.error("Error creating conduct", err);
      alert("Erreur lors de l'enregistrement de la conduite");
    }
  };

  const onSubmitEdit = async (data: any) => {
    if (!selectedConduct) return;
    try {
      await api.put(`/conducts/${selectedConduct.id}`, data);
      setIsEditModalOpen(false);
      setSelectedConduct(null);
      fetchConducts();
    } catch (err) {
      console.error("Error updating conduct", err);
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteClick = (conduct: Conduct) => {
    setSelectedConduct(conduct);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConduct) return;
    try {
      await api.delete(`/conducts/${selectedConduct.id}`);
      setIsDeleteModalOpen(false);
      setSelectedConduct(null);
      fetchConducts();
    } catch (err) {
      console.error("Error deleting conduct", err);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditModal = (conduct: Conduct) => {
    setSelectedConduct(conduct);
    setValue('appreciation', conduct.appreciation || '');
    setValue('comment', conduct.comment || '');
    setIsEditModalOpen(true);
  };

  const getAppreciationStyle = (appreciation: string | null) => {
    if (!appreciation) return 'bg-gray-100 text-gray-700';
    const lower = appreciation.toLowerCase();
    if (lower.includes('bien') || lower.includes('excellent') || lower.includes('félicitation')) 
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (lower.includes('avertissement') || lower.includes('blâme') || lower.includes('mauvais'))
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Gestion de la Conduite
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Appréciations et suivi disciplinaire par période</p>
        </div>
        
        <button
          onClick={() => {
            reset({ termId: selectedTermId });
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Saisir une appréciation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-semibold text-gray-700 dark:text-gray-200">Filtrer par :</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
          >
            <option value="">Toutes les classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
          >
            <option value="">Toutes les périodes</option>
            {terms.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {conducts.length} appréciation{conducts.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : conducts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Aucune appréciation</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Sélectionnez une classe et une période pour voir les appréciations ou commencez par en créer une nouvelle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conducts.map((conduct) => (
            <div key={conduct.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
                    {conduct.student.firstName[0]}{conduct.student.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white leading-tight">
                      {conduct.student.firstName} {conduct.student.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {conduct.term.name}
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getAppreciationStyle(conduct.appreciation)}`}>
                  {conduct.appreciation || 'N/A'}
                </div>
              </div>

              {conduct.comment && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                    "{conduct.comment}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(conduct)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(conduct)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  Saisi le {new Date(conduct.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Saisir une appréciation</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Suivi du comportement de l'élève</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Classe</label>
                    <select
                      onChange={(e) => fetchStudents(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                    >
                      <option value="">Sélectionner une classe</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Période</label>
                    <select
                      {...register('termId', { required: true })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                    >
                      <option value="">Sélectionner une période</option>
                      {terms.map(term => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Élève</label>
                  <select
                    {...register('studentId', { required: true })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                  >
                    <option value="">Sélectionner un élève</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Appréciation globale</label>
                  <select
                    {...register('appreciation')}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                  >
                    <option value="">Choisir une appréciation</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Très Bien">Très Bien</option>
                    <option value="Bien">Bien</option>
                    <option value="Assez Bien">Assez Bien</option>
                    <option value="Passable">Passable</option>
                    <option value="Insuffisant">Insuffisant</option>
                    <option value="Avertissement de conduite">Avertissement de conduite</option>
                    <option value="Blâme de conduite">Blâme de conduite</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Commentaire détaillé</label>
                  <textarea
                    {...register('comment')}
                    rows={4}
                    placeholder="Détails sur le comportement, les progrès ou les points à améliorer..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200 resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier l'appréciation</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConduct?.student.firstName} {selectedConduct?.student.lastName} - {selectedConduct?.term.name}
                  </p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Appréciation globale</label>
                  <select
                    {...register('appreciation')}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                  >
                    <option value="">Choisir une appréciation</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Très Bien">Très Bien</option>
                    <option value="Bien">Bien</option>
                    <option value="Assez Bien">Assez Bien</option>
                    <option value="Passable">Passable</option>
                    <option value="Insuffisant">Insuffisant</option>
                    <option value="Avertissement de conduite">Avertissement de conduite</option>
                    <option value="Blâme de conduite">Blâme de conduite</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Commentaire détaillé</label>
                  <textarea
                    {...register('comment')}
                    rows={4}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200 resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                  >
                    Mettre à jour
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'appréciation"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement de conduite ? Cette action est irréversible."
        confirmText="Supprimer"
        isDanger={true}
      />
    </div>
  );
};

export default Conduct;
