import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Book, FileText, Video, File, Link as LinkIcon, Plus, Trash2, FolderPlus, Folder } from 'lucide-react';
import Gradebook from '../components/Gradebook';
import QuizList from '../components/QuizList';

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
  submissions?: {
    grade?: {
      value: number;
    }
  }[];
}

interface MaterialModel {
    id: string;
    title: string;
    type: 'PDF' | 'VIDEO' | 'LINK';
    url: string;
    createdAt: string;
    source?: string;
}

interface ChapterModel {
  id: string;
  title: string;
  materials: MaterialModel[];
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentModel[]>([]);
  
  // Chapter & Material State
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [orphanMaterials, setOrphanMaterials] = useState<MaterialModel[]>([]);
  
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [isSubmittingMat, setIsSubmittingMat] = useState(false);
  const [isSubmittingChap, setIsSubmittingChap] = useState(false);
  
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [isDeleteAssignModalOpen, setIsDeleteAssignModalOpen] = useState(false);

  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isDeleteMatModalOpen, setIsDeleteMatModalOpen] = useState(false);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'GRADES' | 'QUIZZES' | 'ASSIGNMENTS'>('CONTENT');

  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign, formState: { errors: errorsAssign } } = useForm<{ title: string; description?: string; dueDate: string; file?: FileList }>();
  const { register: registerMat, handleSubmit: handleSubmitMat, reset: resetMat, watch: watchMat, formState: { errors: errorsMat } } = useForm<{ title: string; type: string; url: string; source?: string; chapterId?: string; file?: FileList }>();
  const { register: registerChap, handleSubmit: handleSubmitChap, reset: resetChap } = useForm<{ title: string }>();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN';

  const selectedMatType = watchMat('type', 'PDF');

  const openDeleteAssignmentModal = (assignId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setAssignmentToDelete(assignId);
      setIsDeleteAssignModalOpen(true);
  }

  const openDeleteMaterialModal = (matId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setMaterialToDelete(matId);
      setIsDeleteMatModalOpen(true);
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

  const confirmDeleteMaterial = async () => {
      if (!materialToDelete) return;
      try {
          await api.delete(`/courses/materials/${materialToDelete}`);
          setIsDeleteMatModalOpen(false);
          setMaterialToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting material", error);
          alert("Impossible de supprimer ce support. Veuillez réessayer.");
      }
  }

  const fetchCourseDetails = async () => {
    try {
      if (!id) return;
      setError(null);

      // Fetch course first
      try {
        const courseRes = await api.get(`/courses/${id}`);
        setCourse(courseRes.data);
      } catch (err) {
        console.error("Error fetching course info", err);
        setError("Impossible de charger les détails du cours.");
        return; 
      }

      // Fetch other data
      const fetchAssignments = api.get(`/assignments?courseId=${id}`)
        .then(res => setAssignments(res.data))
        .catch(err => console.error("Error fetching assignments", err));

      const fetchChapters = api.get(`/courses/${id}/chapters`)
        .then(res => {
            setChapters(res.data.chapters);
            setOrphanMaterials(res.data.orphanMaterials);
        })
        .catch(err => console.error("Error fetching chapters", err));

      const fetchQuizzes = api.get(`/quizzes?courseId=${id}`)
        .then(res => setQuizzes(res.data))
        .catch(err => console.error("Error fetching quizzes", err));

      await Promise.allSettled([fetchAssignments, fetchChapters, fetchQuizzes]);

    } catch (error) {
      console.error('Error fetching course details', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id]);

  const onSubmitAssignment = async (data: { title: string; description?: string; dueDate: string; file?: FileList }) => {
    try {
      setIsSubmittingAssign(true);
      setAssignmentError(null);
      
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
    } catch (error) {
      console.error('Error creating assignment', error);
      const err = error as { response?: { data?: { message?: string } } };
      setAssignmentError(err.response?.data?.message || "Erreur lors de la création du devoir.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const onSubmitChapter = async (data: { title: string }) => {
      try {
          setIsSubmittingChap(true);
          await api.post(`/courses/${id}/chapters`, data);
          setIsChapterModalOpen(false);
          resetChap();
          fetchCourseDetails();
      } catch (error) {
          console.error("Error creating chapter", error);
          alert("Erreur lors de la création du chapitre");
      } finally {
          setIsSubmittingChap(false);
      }
  }

  const onSubmitMaterial = async (data: { title: string; type: string; url: string; source?: string; chapterId?: string; file?: FileList }) => {
      try {
          setIsSubmittingMat(true);
          setMaterialError(null);

          if (data.type !== 'LINK' && data.type !== 'VIDEO') {
            if (data.file && data.file[0] && data.file[0].size > 50 * 1024 * 1024) {
              setMaterialError("Le fichier est trop volumineux (max 50MB).");
              setIsSubmittingMat(false);
              return;
            }
          }

          const formData = new FormData();
          formData.append('title', data.title);
          formData.append('type', data.type);
          if (data.source) formData.append('source', data.source);
          if (data.chapterId) formData.append('chapterId', data.chapterId);
          
          if (data.type === 'LINK' || data.type === 'VIDEO') {
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
      } catch (error) {
          console.error("Error adding material", error);
          const err = error as { response?: { data?: { message?: string } } };
          setMaterialError(err.response?.data?.message || "Erreur lors de l'ajout du contenu.");
      } finally {
          setIsSubmittingMat(false);
      }
  }

  const getMaterialIcon = (type: string) => {
      switch (type) {
          case 'VIDEO': return <Video className="w-5 h-5 text-red-500" />;
          case 'PDF': return <File className="w-5 h-5 text-red-500" />;
          case 'LINK': return <LinkIcon className="w-5 h-5 text-blue-500" />;
          default: return <FileText className="w-5 h-5 text-gray-500" />;
      }
  }

  const cleanDescription = (desc?: string) => {
    if (!desc) return "";
    return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim();
  };

  if (error) return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;
  if (!course) return <div className="p-6 text-gray-800 dark:text-gray-200">Chargement...</div>;

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Book className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                {course.subject?.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Classe: {course.class?.name} • Prof: {course.teacher?.firstName} {course.teacher?.lastName}</p>
            </div>
            {isTeacher && activeTab === 'CONTENT' && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setIsChapterModalOpen(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Nouveau Chapitre
                        </button>
                        <button
                            onClick={() => setIsMaterialModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter Contenu
                        </button>
                    </div>
                )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'CONTENT' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                onClick={() => setActiveTab('CONTENT')}
            >
                Contenu du cours
                {activeTab === 'CONTENT' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
            </button>
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'ASSIGNMENTS' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                onClick={() => setActiveTab('ASSIGNMENTS')}
            >
                Devoirs
                {activeTab === 'ASSIGNMENTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
            </button>
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'QUIZZES' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                onClick={() => setActiveTab('QUIZZES')}
            >
                QCM & Quiz
                {activeTab === 'QUIZZES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
            </button>
            {isTeacher && (
                <button
                    className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'GRADES' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    onClick={() => setActiveTab('GRADES')}
                >
                    Notes & Évaluations
                    {activeTab === 'GRADES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
                </button>
            )}
        </div>
      </div>

      {activeTab === 'CONTENT' ? (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Chapters & Materials */}
            <div className="lg:col-span-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    Programme & Supports
                </h2>
                <div className="space-y-6">
                    {/* Chapters Loop */}
                    {chapters.map(chapter => (
                        <div key={chapter.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <Folder className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{chapter.title}</h3>
                            </div>
                            <div className="p-2 space-y-1">
                                {chapter.materials.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 p-2 italic">Aucun contenu dans ce chapitre.</p>}
                                {chapter.materials.map(material => (
                                    <MaterialItem 
                                        key={material.id} 
                                        material={material} 
                                        isTeacher={isTeacher} 
                                        onDelete={(e) => openDeleteMaterialModal(material.id, e)} 
                                        getIcon={getMaterialIcon}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Orphan Materials (Autre) */}
                    {(orphanMaterials.length > 0 || chapters.length === 0) && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <Folder className="w-5 h-5 text-gray-500" />
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Autres ressources</h3>
                            </div>
                            <div className="p-2 space-y-1">
                                {orphanMaterials.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 p-2 italic">Aucun contenu.</p>}
                                {orphanMaterials.map(material => (
                                    <MaterialItem 
                                        key={material.id} 
                                        material={material} 
                                        isTeacher={isTeacher} 
                                        onDelete={(e) => openDeleteMaterialModal(material.id, e)} 
                                        getIcon={getMaterialIcon}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : activeTab === 'ASSIGNMENTS' ? (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Devoirs à rendre
                </h2>
                {isTeacher && (
                    <button
                        onClick={() => setIsAssignmentModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter Devoir
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.length === 0 && <div className="col-span-full text-center text-gray-500 dark:text-gray-400 italic py-10">Aucun devoir publié.</div>}
                {assignments.map(assignment => (
                    <div key={assignment.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500 group relative">
                            <Link to={`/assignments/${assignment.id}`} className="block h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-2">
                                        {assignment.submissions?.[0]?.grade && (
                                            <span className="text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded">
                                                {assignment.submissions[0].grade.value}/20
                                            </span>
                                        )}
                                        <span className="text-xs font-mono bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 px-2 py-1 rounded">
                                            {new Date(assignment.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition mb-2">{assignment.title}</h3>
                                
                                {assignment.description && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 flex-grow">{cleanDescription(assignment.description)}</p>}
                                
                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {isTeacher ? `${assignment._count?.submissions || 0} rendus` : 'Voir les détails'}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Ouvrir</span>
                                </div>
                            </div>
                    </Link>
                        {isTeacher && (
                            <button 
                                onClick={(e) => openDeleteAssignmentModal(assignment.id, e)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition opacity-0 group-hover:opacity-100"
                                title="Supprimer le devoir"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        </div>
                ))}
            </div>
        </div>
      ) : activeTab === 'QUIZZES' ? (
        <QuizList courseId={id!} isTeacher={isTeacher} quizzes={quizzes} onUpdate={fetchCourseDetails} />
      ) : (
        <Gradebook courseId={id!} />
      )}

      {/* Delete Assignment Confirmation Modal */}
      {isDeleteAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-transparent dark:border-gray-700 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Confirmer la suppression</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer ce devoir ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteAssignModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">Annuler</button>
              <button onClick={confirmDeleteAssignment} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Material Confirmation Modal */}
      {isDeleteMatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-transparent dark:border-gray-700 shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Confirmer la suppression</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer ce support de cours ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteMatModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">Annuler</button>
              <button onClick={confirmDeleteMaterial} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Chapter Modal */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md border border-transparent dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Nouveau Chapitre</h2>
            <form onSubmit={handleSubmitChap(onSubmitChapter)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre du chapitre</label>
                <input
                  {...registerChap('title', { required: 'Le titre est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Ex: Chapitre 1 - Introduction"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsChapterModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">Annuler</button>
                <button type="submit" disabled={isSubmittingChap} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                    {isSubmittingChap ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md border border-transparent dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Nouveau Devoir</h2>
            <form onSubmit={handleSubmitAssign(onSubmitAssignment)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                <input
                  {...registerAssign('title', { required: 'Le titre est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Ex: Exercices Chapitre 1"
                />
                {errorsAssign.title && <span className="text-red-500 text-sm">{errorsAssign.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  {...registerAssign('description')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Instructions..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (PDF/Word)</label>
                <input
                  type="file"
                  {...registerAssign('file')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  accept=".pdf,.doc,.docx"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Facultatif : Joindre un fichier d'instructions.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date limite</label>
                <input
                  type="date"
                  {...registerAssign('dueDate', { required: 'La date est requise' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errorsAssign.dueDate && <span className="text-red-500 text-sm">{errorsAssign.dueDate.message as string}</span>}
              </div>

              {assignmentError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                  {assignmentError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  disabled={isSubmittingAssign}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 ${isSubmittingAssign ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSubmittingAssign}
                >
                  {isSubmittingAssign ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Material Modal */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md border border-transparent dark:border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Ajouter un support</h2>
            <form onSubmit={handleSubmitMat(onSubmitMaterial)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapitre</label>
                <select
                    {...registerMat('chapterId')}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="">-- Aucun (Général) --</option>
                    {chapters.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                <input
                  {...registerMat('title', { required: 'Le titre est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Ex: Cours PDF"
                />
                {errorsMat.title && <span className="text-red-500 text-sm">{errorsMat.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source / Auteur (Facultatif)</label>
                <input
                  {...registerMat('source')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Ex: Manuel page 12 ou Nom de l'auteur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                    {...registerMat('type', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="PDF">PDF / Document</option>
                    <option value="VIDEO">Vidéo</option>
                    <option value="LINK">Lien Web</option>
                </select>
              </div>

              {selectedMatType === 'LINK' || selectedMatType === 'VIDEO' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {selectedMatType === 'VIDEO' ? 'Lien Vidéo (YouTube, Vimeo...)' : 'URL / Lien'}
                    </label>
                    <input
                    {...registerMat('url', { required: 'L\'URL est requise' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    placeholder={selectedMatType === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
                    />
                    {errorsMat.url && <span className="text-red-500 text-sm">{errorsMat.url.message as string}</span>}
                </div>
              ) : (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (PDF, Word...)</label>
                    <input
                    type="file"
                    {...registerMat('file', { required: 'Le fichier est requis' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    />
                    {errorsMat.file && <span className="text-red-500 text-sm">{errorsMat.file.message as string}</span>}
                </div>
              )}

              {materialError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                  {materialError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  disabled={isSubmittingMat}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 ${isSubmittingMat ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSubmittingMat}
                >
                  {isSubmittingMat ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Material Item
const MaterialItem = ({ material, isTeacher, onDelete, getIcon }: { material: MaterialModel, isTeacher: boolean, onDelete: (e: React.MouseEvent) => void, getIcon: (t: string) => JSX.Element }) => (
    <div 
        className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
    >
        <a 
            href={getFileUrl(material.url)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 flex-1"
        >
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-600 dark:text-gray-300">
                {getIcon(material.type)}
            </div>
            <div>
                <h3 className="font-medium text-gray-800 dark:text-white text-sm">{material.title}</h3>
                <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                    {material.source && <span>• Source: {material.source}</span>}
                </div>
            </div>
        </a>
        {isTeacher && (
            <button 
                onClick={onDelete}
                className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"
                title="Supprimer"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
    </div>
);

export default CourseDetails;
