import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, School, GraduationCap, Users, X, Upload, Edit } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface ClassModel {
  id: string;
  name: string;
  level?: string;
  _count?: {
    enrollments: number;
    courses: number;
  };
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

const Classes = () => {
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingMode, setIsImportingMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [editingClass, setEditingClass] = useState<ClassModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onSubmit = async (data: any) => {
    if (editingClass) {
        setEditFormData(data);
        setIsEditConfirmModalOpen(true);
    } else {
        try {
            await api.post('/classes', data);
            setIsModalOpen(false);
            reset();
            fetchClasses();
        } catch (error) {
            console.error('Error creating class', error);
        }
    }
  };

  const confirmEdit = async () => {
      if (!editingClass || !editFormData) return;
      try {
          await api.put(`/classes/${editingClass.id}`, editFormData);
          setIsModalOpen(false);
          reset();
          fetchClasses();
      } catch (error) {
          console.error('Error updating class', error);
      } finally {
          setIsEditConfirmModalOpen(false);
          setEditFormData(null);
          setEditingClass(null);
      }
  }

  const handleDeleteClick = (id: string) => {
      setClassToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
      if (!classToDelete) return;
      try {
          await api.delete(`/classes/${classToDelete}`);
          fetchClasses();
      } catch (error) {
          console.error('Error deleting class', error);
      } finally {
          setIsDeleteModalOpen(false);
          setClassToDelete(null);
      }
  }

  const openCreateModal = () => {
      setEditingClass(null);
      reset({ name: '', level: '' });
      setIsModalOpen(true);
  }

  const handleEditClick = (cls: ClassModel) => {
      setEditingClass(cls);
      reset({ name: cls.name, level: cls.level || '' });
      setIsModalOpen(true);
  }

  const handleViewStudents = async (classId: string, className: string) => {
      setSelectedClassName(className);
      setSelectedClassId(classId);
      setIsAddingStudent(false);
      setIsImportingMode(false);
      setSelectedFile(null);
      try {
          const response = await api.get(`/classes/${classId}/students`);
          setSelectedClassStudents(response.data);
          setIsStudentsModalOpen(true);
      } catch (error) {
          console.error('Error fetching students', error);
      }
  }

  const fetchAllStudents = async () => {
      try {
          const response = await api.get('/users?role=STUDENT');
          setAllStudents(response.data);
      } catch (error) {
          console.error('Error fetching all students', error);
      }
  };

  const handleAddStudent = async () => {
      if (!selectedStudentId || !selectedClassId) return;
      try {
          await api.post('/classes/enroll', {
              classId: selectedClassId,
              studentId: selectedStudentId
          });
          // Refresh list
          const response = await api.get(`/classes/${selectedClassId}/students`);
          setSelectedClassStudents(response.data);
          setIsAddingStudent(false);
          setSelectedStudentId('');
      } catch (error) {
          console.error('Error enrolling student', error);
          alert("Erreur lors de l'ajout de l'élève (il est peut-être déjà inscrit ailleurs)");
      }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setSelectedFile(event.target.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile || !selectedClassId) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        setIsImporting(true);
        const response = await api.post(`/classes/${selectedClassId}/students/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Refresh Students List
        const studentsResponse = await api.get(`/classes/${selectedClassId}/students`);
        setSelectedClassStudents(studentsResponse.data);

        // Refresh Classes (for counts)
        fetchClasses();
        
        // Reset UI
        setIsImportingMode(false);
        setSelectedFile(null);

        // Notify user
        setTimeout(() => {
             alert(`Import terminé avec succès !\n${response.data.created} nouveaux élèves créés.\n${response.data.enrolled} élèves inscrits dans la classe.`);
        }, 100);
        
    } catch (error) {
        console.error('Error importing students', error);
        alert("Erreur lors de l'import");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <School className="w-8 h-8 text-blue-600" />
          Gestion des Classes
        </h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter une classe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{cls.name}</h3>
                {cls.level && <p className="text-sm text-gray-500">Niveau: {cls.level}</p>}
              </div>
              <div className="bg-blue-50 p-2 rounded-full">
                 <GraduationCap className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            
            <div className="flex gap-4 text-sm text-gray-600 border-t pt-4">
                <div className="flex flex-col">
                    <span className="font-bold text-lg">{cls._count?.enrollments || 0}</span>
                    <span className="text-xs uppercase text-gray-400">Élèves</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg">{cls._count?.courses || 0}</span>
                    <span className="text-xs uppercase text-gray-400">Cours</span>
                </div>
            </div>
            
             <div className="flex gap-2 mt-4">
                <button 
                    onClick={() => handleViewStudents(cls.id, cls.name)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition"
                >
                    <Users className="w-4 h-4" />
                    Élèves
                </button>
                <button 
                    onClick={() => handleEditClick(cls)}
                    className="flex items-center justify-center p-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded transition"
                    title="Modifier la classe"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => handleDeleteClick(cls.id)}
                    className="flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                    title="Supprimer la classe"
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
            <h2 className="text-xl font-bold mb-6">{editingClass ? 'Modifier la classe' : 'Ajouter une classe'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe</label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 6ème A"
                />
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                 <select 
                    {...register('level')}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 >
                    <option value="">Sélectionner un niveau</option>
                    <option value="6eme">6ème</option>
                    <option value="5eme">5ème</option>
                    <option value="4eme">4ème</option>
                    <option value="3eme">3ème</option>
                    <option value="2nde">2nde</option>
                    <option value="1ere">1ère</option>
                    <option value="Terminale">Terminale</option>
                 </select>
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
                  {editingClass ? 'Sauvegarder' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {isStudentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Élèves - {selectedClassName}</h2>
                    <button onClick={() => setIsStudentsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="mb-4">
                    {!isAddingStudent && !isImportingMode ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsAddingStudent(true);
                                    fetchAllStudents();
                                }}
                                className="text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter un élève existant
                            </button>
                            <button
                                onClick={() => setIsImportingMode(true)}
                                className="text-sm bg-green-50 text-green-600 px-3 py-2 rounded hover:bg-green-100 transition flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Importer Excel
                            </button>
                        </div>
                    ) : isImportingMode ? (
                        <div className="bg-green-50 p-4 rounded-lg space-y-3">
                            <h3 className="font-medium text-green-800 flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Importer des élèves (Excel)
                            </h3>
                            <div className="space-y-2">
                                <label className="block text-sm text-green-700">
                                    Sélectionnez un fichier .xlsx ou .xls contenant les colonnes "Nom" et "Prénom"
                                </label>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={handleFileSelect}
                                    className="w-full p-2 bg-white border border-green-200 rounded text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsImportingMode(false);
                                        setSelectedFile(null);
                                    }}
                                    className="px-3 py-1 text-green-700 text-sm hover:underline"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleImportSubmit}
                                    disabled={!selectedFile || isImporting}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isImporting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                    Valider l'import
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Sélectionner un élève</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Choisir un élève...</option>
                                {allStudents
                                    .filter(s => !selectedClassStudents.some(active => active.id === s.id)) // Filter out already enrolled
                                    .map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.firstName} {student.lastName} ({student.email})
                                    </option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsAddingStudent(false)}
                                    className="px-3 py-1 text-gray-600 text-sm hover:underline"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleAddStudent}
                                    disabled={!selectedStudentId}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1">
                    {selectedClassStudents.length > 0 ? (
                        <div className="space-y-2">
                            {selectedClassStudents.map(student => (
                                <div key={student.id} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                                        <p className="text-xs text-gray-500">{student.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Aucun élève dans cette classe</p>
                    )}
                </div>
            </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la classe"
        message="Êtes-vous sûr de vouloir supprimer cette classe ? Cette action supprimera également toutes les données associées (élèves inscrits, cours, etc.)."
        confirmText="Supprimer"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Modifier la classe"
        message="Êtes-vous sûr de vouloir modifier cette classe ?"
        confirmText="Sauvegarder"
        isDanger={false}
      />
    </div>
  );
};

export default Classes;
