import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import { Plus, BookOpen, Trash2, Edit } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface SubjectModel {
  id: string;
  name: string;
  code?: string;
}

const Subjects = () => {
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const [editingSubject, setEditingSubject] = useState<SubjectModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onSubmit = async (data: any) => {
    if (editingSubject) {
        setEditFormData(data);
        setIsEditConfirmModalOpen(true);
    } else {
        try {
            await api.post('/subjects', data);
            setIsModalOpen(false);
            reset();
            fetchSubjects();
        } catch (error) {
            console.error('Error creating subject', error);
        }
    }
  };

  const confirmEdit = async () => {
      if (!editingSubject || !editFormData) return;
      try {
          await api.put(`/subjects/${editingSubject.id}`, editFormData);
          setIsModalOpen(false);
          reset();
          fetchSubjects();
      } catch (error) {
          console.error('Error updating subject', error);
      } finally {
          setIsEditConfirmModalOpen(false);
          setEditFormData(null);
          setEditingSubject(null);
      }
  }

  const handleDeleteClick = (id: string) => {
      setSubjectToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
      if (!subjectToDelete) return;
      try {
          await api.delete(`/subjects/${subjectToDelete}`);
          fetchSubjects();
      } catch (error) {
          console.error('Error deleting subject', error);
      } finally {
          setIsDeleteModalOpen(false);
          setSubjectToDelete(null);
      }
  }

  const openCreateModal = () => {
      setEditingSubject(null);
      reset({ name: '', code: '' });
      setIsModalOpen(true);
  }

  const handleEditClick = (subject: SubjectModel) => {
      setEditingSubject(subject);
      reset({ name: subject.name, code: subject.code || '' });
      setIsModalOpen(true);
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Gestion des Matières
        </h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter une matière
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full">
                <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                <h3 className="text-xl font-bold text-gray-800">{subject.name}</h3>
                {subject.code && <p className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">{subject.code}</p>}
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => handleEditClick(subject)}
                    className="p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded transition"
                    title="Modifier"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => handleDeleteClick(subject.id)}
                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                    title="Supprimer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">{editingSubject ? 'Modifier la matière' : 'Ajouter une matière'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la matière</label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Mathématiques"
                />
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code (Optionnel)</label>
                <input
                  {...register('code')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: MATHS"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {editingSubject ? 'Sauvegarder' : 'Créer'}
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
        title="Supprimer la matière"
        message="Êtes-vous sûr de vouloir supprimer cette matière ? Cette action supprimera également tous les cours associés."
        confirmText="Supprimer"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Modifier la matière"
        message="Êtes-vous sûr de vouloir modifier cette matière ?"
        confirmText="Sauvegarder"
        isDanger={false}
      />
    </div>
  );
};

export default Subjects;
