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

  const getSubjectImage = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('math')) return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('français') || lowerName.includes('francais')) return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('anglais') || lowerName.includes('english')) return 'https://images.unsplash.com/photo-1526304640152-d4619684e484?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('hist') || lowerName.includes('geo')) return 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('phys') || lowerName.includes('chimie') || lowerName.includes('science') || lowerName.includes('svt')) return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('sport') || lowerName.includes('eps')) return 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('art') || lowerName.includes('musique')) return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600';
    if (lowerName.includes('informatique') || lowerName.includes('tech')) return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600';
    return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600';
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter une matière
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group overflow-hidden flex flex-col">
            <div className="h-32 w-full relative overflow-hidden">
                <img 
                    src={getSubjectImage(subject.name)} 
                    alt={subject.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                <div className="absolute bottom-3 left-4">
                    <div className="bg-white/90 p-2 rounded-lg shadow-sm backdrop-blur-sm inline-flex">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{subject.name}</h3>
                </div>
                
                {subject.code && (
                    <div className="mb-4">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                            {subject.code}
                        </span>
                    </div>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end gap-2">
                    <button 
                        onClick={() => handleEditClick(subject)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteClick(subject.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">{editingSubject ? 'Modifier la matière' : 'Ajouter une matière'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de la matière</label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Ex: Mathématiques"
                />
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code (Optionnel)</label>
                <input
                  {...register('code')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Ex: MATHS"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
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
