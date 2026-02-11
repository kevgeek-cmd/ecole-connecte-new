import { useState, useEffect } from 'react';
import { UserX, Plus, Search, Calendar, CheckCircle, XCircle, Trash2, Edit, Filter, Users, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
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

interface Absence {
  id: string;
  date: string;
  reason: string | null;
  justified: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const Absences = () => {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<{
    studentId: string;
    date: string;
    reason: string;
    justified: boolean;
  }>();

  useEffect(() => {
    fetchClasses();
    fetchAbsences();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes", err);
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

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/absences', {
        params: { classId: selectedClassId }
      });
      setAbsences(res.data);
    } catch (err) {
      console.error("Error fetching absences", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
  };

  // Re-fetch absences when class filter changes
  useEffect(() => {
    fetchAbsences();
  }, [selectedClassId]);

  const onSubmitAdd = async (data: any) => {
    try {
      await api.post('/absences', data);
      setIsAddModalOpen(false);
      reset();
      fetchAbsences();
    } catch (err) {
      console.error("Error creating absence", err);
      alert("Erreur lors de la création de l'absence");
    }
  };

  const onSubmitEdit = async (data: any) => {
    if (!selectedAbsence) return;
    try {
      await api.put(`/absences/${selectedAbsence.id}`, data);
      setIsEditModalOpen(false);
      setSelectedAbsence(null);
      fetchAbsences();
    } catch (err) {
      console.error("Error updating absence", err);
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteClick = (absence: Absence) => {
    setSelectedAbsence(absence);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAbsence) return;
    try {
      await api.delete(`/absences/${selectedAbsence.id}`);
      setIsDeleteModalOpen(false);
      setSelectedAbsence(null);
      fetchAbsences();
    } catch (err) {
      console.error("Error deleting absence", err);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditModal = (absence: Absence) => {
    setSelectedAbsence(absence);
    setValue('studentId', absence.student.id);
    setValue('date', new Date(absence.date).toISOString().split('T')[0]);
    setValue('reason', absence.reason || '');
    setValue('justified', absence.justified);
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <UserX className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Gestion des Absences
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Suivi et justification des absences des élèves</p>
        </div>
        
        <button
          onClick={() => {
            reset({ date: new Date().toISOString().split('T')[0], justified: false });
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          Enregistrer une absence
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
        
        <div className="flex-1 min-w-[200px] max-w-md">
          <select
            value={selectedClassId}
            onChange={handleClassChange}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
          >
            <option value="">Toutes les classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400 font-medium">
          {absences.length} absence{absences.length > 1 ? 's' : ''} trouvée{absences.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : absences.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Aucune absence trouvée</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {selectedClassId ? "Il n'y a pas d'absences enregistrées pour cette classe." : "Commencez par enregistrer une nouvelle absence pour un élève."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {absences.map((absence) => (
            <div key={absence.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                    {absence.student.firstName[0]}{absence.student.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white leading-tight">
                      {absence.student.firstName} {absence.student.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(absence.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  absence.justified 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {absence.justified ? 'Justifiée' : 'Non justifiée'}
                </div>
              </div>

              {absence.reason && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                    "{absence.reason}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(absence)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(absence)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer">
                  Détails <ChevronRight className="w-4 h-4" />
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enregistrer une absence</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remplissez les informations ci-dessous</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Classe
                    </label>
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
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Élève
                    </label>
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
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date de l'absence
                  </label>
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Motif / Commentaire
                  </label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    placeholder="Ex: Maladie, rendez-vous médical, etc."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <input
                    type="checkbox"
                    id="justified"
                    {...register('justified')}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="justified" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    Absence justifiée (avec justificatif)
                  </label>
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
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier l'absence</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Élève : {selectedAbsence?.student.firstName} {selectedAbsence?.student.lastName}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date de l'absence
                  </label>
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                    <Search className="w-4 h-4" /> Motif / Commentaire
                  </label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 dark:text-gray-200 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <input
                    type="checkbox"
                    id="justified-edit"
                    {...register('justified')}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="justified-edit" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    Absence justifiée (avec justificatif)
                  </label>
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
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
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
        title="Supprimer l'absence"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement d'absence ? Cette action est irréversible."
        confirmText="Supprimer"
        isDanger={true}
      />
    </div>
  );
};

export default Absences;
