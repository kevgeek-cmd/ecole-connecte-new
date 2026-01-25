import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Book, FileText, Upload, Video, File, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import Gradebook from '../components/Gradebook';

interface CourseModel {
  id: string;
  class: { name: string };
  subject: { name: string };
  teacher: { firstName: string; lastName: string };
}

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  _count?: {
    submissions: number;
  };
}

interface MaterialModel {
    id: string;
    title: string;
    type: 'PDF' | 'VIDEO' | 'LINK';
    url: string;
    createdAt: string;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseModel | null>(null);
  const [assignments, setAssignments] = useState<AssignmentModel[]>([]);
  const [materials, setMaterials] = useState<MaterialModel[]>([]);
  
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [isSubmittingMat, setIsSubmittingMat] = useState(false);
  
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [isDeleteAssignModalOpen, setIsDeleteAssignModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'CONTENT' | 'GRADES'>('CONTENT');

  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign, formState: { errors: errorsAssign } } = useForm();
  const { register: registerMat, handleSubmit: handleSubmitMat, reset: resetMat, watch: watchMat, formState: { errors: errorsMat } } = useForm();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN';

  const selectedMatType = watchMat('type', 'PDF');

  const openDeleteAssignmentModal = (assignId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setAssignmentToDelete(assignId);
      setIsDeleteAssignModalOpen(true);
  }

  const confirmDeleteAssignment = async () => {
      if (!assignmentToDelete) return;
      try {
          await api.delete(`/assignments/${assignmentToDelete}`);
          setIsDeleteAssignModalOpen(false);
          setAssignmentToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting assignment", error);
          alert("Impossible de supprimer ce devoir. Veuillez réessayer.");
      }
  }

  const fetchCourseDetails = async () => {
    try {
      const assignmentsRes = await api.get(`/assignments?courseId=${id}`);
      setAssignments(assignmentsRes.data);

      const materialsRes = await api.get(`/courses/${id}/materials`);
      setMaterials(materialsRes.data);
      
      const coursesRes = await api.get('/courses');
      const foundCourse = coursesRes.data.find((c: any) => c.id === id);
      setCourse(foundCourse);

    } catch (error) {
      console.error('Error fetching course details', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id]);

  const onSubmitAssignment = async (data: any) => {
    try {
      setIsSubmittingAssign(true);
      setAssignmentError(null);
      // Handle Assignment creation with file upload if supported later.
      // For now we send JSON, but if I added file upload support on backend for assignment creation, 
      // I should use FormData here.
      // The user wants "Assignments... PDF or Word".
      // Backend now supports file upload for assignments.
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('dueDate', data.dueDate);
      formData.append('courseId', id as string);
      
      if (data.file && data.file[0]) {
          formData.append('file', data.file[0]);
      }

      await api.post('/assignments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsAssignmentModalOpen(false);
      resetAssign();
      fetchCourseDetails();
    } catch (error: any) {
      console.error('Error creating assignment', error);
      setAssignmentError(error.response?.data?.message || "Erreur lors de la création du devoir.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const onSubmitMaterial = async (data: any) => {
      try {
          setIsSubmittingMat(true);
          setMaterialError(null);
          const formData = new FormData();
          formData.append('title', data.title);
          formData.append('type', data.type);
          
          if (data.type === 'LINK') {
               formData.append('url', data.url);
          } else {
               if (data.file && data.file[0]) {
                   formData.append('file', data.file[0]);
               }
          }

          await api.post(`/courses/${id}/materials`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          setIsMaterialModalOpen(false);
          resetMat();
          fetchCourseDetails();
      } catch (error: any) {
          console.error("Error adding material", error);
          setMaterialError(error.response?.data?.message || "Erreur lors de l'ajout du contenu.");
      } finally {
          setIsSubmittingMat(false);
      }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if(!window.confirm("Êtes-vous sûr de vouloir supprimer ce support ?")) return;
    try {
        await api.delete(`/courses/materials/${materialId}`);
        fetchCourseDetails();
    } catch (error) {
        console.error("Error deleting material", error);
    }
  }

  const getMaterialIcon = (type: string) => {
      switch (type) {
          case 'VIDEO': return <Video className="w-5 h-5 text-red-500" />;
          case 'PDF': return <File className="w-5 h-5 text-red-500" />; // Should be FileText or similar
          case 'LINK': return <LinkIcon className="w-5 h-5 text-blue-500" />;
          default: return <FileText className="w-5 h-5 text-gray-500" />;
      }
  }

  const cleanDescription = (desc?: string) => {
    if (!desc) return "";
    return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim();
  };

  if (!course) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Book className="w-8 h-8 text-blue-600" />
                {course.subject?.name}
                </h1>
                <p className="text-gray-500 mt-1">Classe: {course.class?.name} • Prof: {course.teacher?.firstName} {course.teacher?.lastName}</p>
            </div>
            {isTeacher && activeTab === 'CONTENT' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsMaterialModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter un contenu (PDF/Vidéo)
                        </button>
                        <button
                            onClick={() => setIsAssignmentModalOpen(true)}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            Ajouter un devoir
                        </button>
                    </div>
                )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'CONTENT' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('CONTENT')}
            >
                Contenu du cours
                {activeTab === 'CONTENT' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
            </button>
            {isTeacher && (
                <button
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'GRADES' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('GRADES')}
                >
                    Notes & Évaluations
                    {activeTab === 'GRADES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
            )}
        </div>
      </div>

      {activeTab === 'CONTENT' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Devoirs à rendre
                </h2>
                <div className="space-y-4">
                    {assignments.length === 0 && <p className="text-gray-500 italic">Aucun devoir.</p>}
                    {assignments.map(assignment => (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition hover:border-blue-300 group relative">
                                <Link to={`/assignments/${assignment.id}`} className="block h-full">
                                <div className="flex justify-between items-start pr-8">
                                    <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition">{assignment.title}</h3>
                                    <span className="text-xs font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                        {new Date(assignment.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                                {assignment.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{cleanDescription(assignment.description)}</p>}
                                
                                <div className="mt-4 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                        {isTeacher ? `${assignment._count?.submissions || 0} rendus` : 'Cliquez pour voir/rendre'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                         {isTeacher && (
                             <button 
                                 onClick={(e) => openDeleteAssignmentModal(assignment.id, e)}
                                 className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition z-10"
                                 title="Supprimer le devoir"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         )}
                         </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Supports de cours
                </h2>
                <div className="space-y-3">
                    {materials.length === 0 && <p className="text-gray-500 italic">Aucun support de cours.</p>}
                    {materials.map(material => (
                        <div 
                            key={material.id} 
                            className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition group"
                        >
                            <a 
                                href={getFileUrl(material.url)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 flex-1"
                            >
                                <div className="bg-gray-100 p-2 rounded">
                                    {getMaterialIcon(material.type)}
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-800">{material.title}</h3>
                                    <p className="text-xs text-gray-500">{new Date(material.createdAt).toLocaleDateString()}</p>
                                </div>
                            </a>
                            {isTeacher && (
                                <button 
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      ) : (
        <Gradebook courseId={id!} />
      )}

      {/* Delete Assignment Confirmation Modal */}
      {isDeleteAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Confirmer la suppression</h2>
            <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce devoir ? Cette action est irréversible et supprimera toutes les notes et rendus associés.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteAssignModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteAssignment}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Nouveau Devoir</h2>
            <form onSubmit={handleSubmitAssign(onSubmitAssignment)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  {...registerAssign('title', { required: 'Le titre est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Exercices Chapitre 1"
                />
                {errorsAssign.title && <span className="text-red-500 text-sm">{errorsAssign.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...registerAssign('description')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Instructions..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (PDF/Word)</label>
                <input
                  type="file"
                  {...registerAssign('file')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  accept=".pdf,.doc,.docx"
                />
                <p className="text-xs text-gray-500 mt-1">Facultatif : Joindre un fichier d'instructions.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                <input
                  type="date"
                  {...registerAssign('dueDate', { required: 'La date est requise' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errorsAssign.dueDate && <span className="text-red-500 text-sm">{errorsAssign.dueDate.message as string}</span>}
              </div>

              {assignmentError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {assignmentError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  disabled={isSubmittingAssign}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 ${isSubmittingAssign ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSubmittingAssign}
                >
                  {isSubmittingAssign ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Material Modal */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Ajouter un support</h2>
            <form onSubmit={handleSubmitMat(onSubmitMaterial)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  {...registerMat('title', { required: 'Le titre est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Cours Chapitre 1 (PDF)"
                />
                {errorsMat.title && <span className="text-red-500 text-sm">{errorsMat.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                    {...registerMat('type', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="PDF">PDF / Document</option>
                    <option value="VIDEO">Vidéo</option>
                    <option value="LINK">Lien Web</option>
                </select>
              </div>

              {selectedMatType === 'LINK' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL / Lien</label>
                    <input
                    {...registerMat('url', { required: 'L\'URL est requise' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                    />
                    {errorsMat.url && <span className="text-red-500 text-sm">{errorsMat.url.message as string}</span>}
                </div>
              ) : (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                    <input
                    type="file"
                    {...registerMat('file', { required: 'Le fichier est requis' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    accept={selectedMatType === 'VIDEO' ? "video/*" : ".pdf,.doc,.docx,.ppt,.pptx"}
                    />
                    {errorsMat.file && <span className="text-red-500 text-sm">{errorsMat.file.message as string}</span>}
                </div>
              )}

              {materialError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {materialError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  disabled={isSubmittingMat}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 ${isSubmittingMat ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSubmittingMat}
                >
                  {isSubmittingMat ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Ajout...
                    </>
                  ) : (
                    'Ajouter'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
