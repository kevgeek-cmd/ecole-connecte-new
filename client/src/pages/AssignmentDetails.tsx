import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Upload, CheckCircle, Clock, User, Award, FileText } from 'lucide-react';

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  course: {
    id: string;
    subject: { name: string };
    class: { name: string };
  };
  submissions?: {
    id: string;
    content?: string;
    fileUrl?: string;
    createdAt: string;
    grade?: {
        value: number;
        comment?: string;
    }
  }[];
}

interface SubmissionModel {
    id: string;
    content?: string;
    fileUrl?: string;
    createdAt: string;
    student: {
        firstName: string;
        lastName: string;
        email: string;
    };
    grade?: {
        value: number;
        comment?: string;
    };
}

const AssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentModel | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { register: registerSubmit, handleSubmit: handleSubmitSubmit, reset: resetSubmit } = useForm();
  const { register: registerGrade, handleSubmit: handleSubmitGrade, reset: resetGrade } = useForm();

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN';

  // Helper to extract file link from description
  const getAssignmentFile = (desc?: string) => {
    if (!desc) return null;
    const match = desc.match(/\[Télécharger le fichier joint\]\((.*?)\)/);
    return match ? match[1] : null;
  };

  const cleanDescription = (desc?: string) => {
      if (!desc) return "Aucune description.";
      return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim() || "Aucune description.";
  };

  const fetchAssignment = async () => {
    try {
      const response = await api.get(`/assignments/${id}`);
      setAssignment(response.data);
      
      if (isTeacher) {
          const subsResponse = await api.get(`/assignments/${id}/submissions`);
          setSubmissions(subsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching assignment', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignment();
    }
  }, [id]);

  const onSubmitWork = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append('content', data.content || '');
      if (data.file && data.file[0]) {
          formData.append('file', data.file[0]);
      } else if (data.fileUrl) {
          formData.append('fileUrl', data.fileUrl);
      }

      await api.post(`/assignments/${id}/submit`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsSubmitModalOpen(false);
      resetSubmit();
      fetchAssignment();
    } catch (error) {
      console.error('Error submitting work', error);
    }
  };

  const onGradeWork = async (data: any) => {
      if (!selectedSubmissionId) return;
      try {
          await api.post(`/assignments/submissions/${selectedSubmissionId}/grade`, {
              value: parseFloat(data.value),
              comment: data.comment
          });
          setIsGradeModalOpen(false);
          resetGrade();
          fetchAssignment(); // Refresh to show updated grades
      } catch (error) {
          console.error("Error grading work", error);
      }
  }

  const openGradeModal = (submissionId: string) => {
      setSelectedSubmissionId(submissionId);
      setIsGradeModalOpen(true);
  }

  if (!assignment) return <div className="p-6">Chargement...</div>;

  const mySubmission = assignment.submissions?.[0];

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{assignment.title}</h1>
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mb-4">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded font-bold uppercase">
                        {assignment.course.subject.name}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4" />
                        Pour le {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
                    {cleanDescription(assignment.description)}
                </p>
                {getAssignmentFile(assignment.description) && (
                    <a 
                        href={getFileUrl(getAssignmentFile(assignment.description)!)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition border border-blue-200 dark:border-blue-800"
                    >
                        <FileText className="w-5 h-5" />
                        Télécharger le sujet du devoir
                    </a>
                )}
            </div>
            
            {!isTeacher && (
                <div className="min-w-[200px]">
                    {mySubmission ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold mb-2">
                                <CheckCircle className="w-5 h-5" />
                                Devoir rendu
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-500 mb-2">
                                Le {new Date(mySubmission.createdAt).toLocaleDateString()}
                            </p>
                            {mySubmission.grade ? (
                                <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-green-300 dark:border-green-900 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Award className="w-6 h-6 text-yellow-500" />
                                        <span className="text-lg font-bold text-gray-800 dark:text-white">Note obtenue</span>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{mySubmission.grade.value}<span className="text-base text-gray-400">/20</span></p>
                                    {mySubmission.grade.comment && (
                                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{mySubmission.grade.comment}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">En attente de correction</p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            <Upload className="w-5 h-5" />
                            Rendre le devoir
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      {isTeacher && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      Travaux des élèves ({submissions.length})
                  </h2>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm uppercase">
                          <tr>
                              <th className="p-4">Élève</th>
                              <th className="p-4">Date de remise</th>
                              <th className="p-4">Contenu</th>
                              <th className="p-4">Note</th>
                              <th className="p-4">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {submissions.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">Aucun travail rendu pour le moment.</td>
                              </tr>
                          ) : (
                              submissions.map(sub => (
                                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                                          {sub.student.firstName} {sub.student.lastName}
                                      </td>
                                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                          {new Date(sub.createdAt).toLocaleDateString()} à {new Date(sub.createdAt).toLocaleTimeString().slice(0,5)}
                                      </td>
                                      <td className="p-4">
                                          {sub.content && <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{sub.content}</p>}
                                          {sub.fileUrl && (
                                              <div className="mt-1">
                                                  {(sub.fileUrl.endsWith('.mp3') || sub.fileUrl.endsWith('.wav') || sub.fileUrl.endsWith('.ogg') || sub.fileUrl.endsWith('.webm')) ? (
                                                      <audio controls src={getFileUrl(sub.fileUrl)} className="h-8 w-48 mt-1" />
                                                  ) : (
                                                      <a href={getFileUrl(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 text-sm hover:underline block">
                                                          Voir le fichier
                                                      </a>
                                                  )}
                                              </div>
                                        )}
                                      </td>
                                      <td className="p-4">
                                          {sub.grade ? (
                                              <div>
                                                  <span className="font-bold text-gray-800 dark:text-white">{sub.grade.value}/20</span>
                                              </div>
                                          ) : (
                                              <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                                          )}
                                      </td>
                                      <td className="p-4">
                                          <button 
                                            onClick={() => openGradeModal(sub.id)}
                                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded transition"
                                            title="Noter"
                                          >
                                              <Award className="w-5 h-5" />
                                          </button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Rendre votre devoir</h2>
            <form onSubmit={handleSubmitSubmit(onSubmitWork)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenu (Texte)</label>
                <textarea
                  {...registerSubmit('content')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  rows={4}
                  placeholder="Écrivez votre réponse ici..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (PDF, Word, Image, Audio MP3...)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav,.ogg,.webm"
                  {...registerSubmit('file')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Formats acceptés : PDF, Word, Images, MP3 (max 20MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ou Lien vers un fichier (URL)</label>
                <input
                  {...registerSubmit('fileUrl')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Noter le devoir</h2>
            <form onSubmit={handleSubmitGrade(onGradeWork)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (/20)</label>
                <input
                  type="number"
                  step="0.5"
                  max="20"
                  min="0"
                  {...registerGrade('value', { required: true, min: 0, max: 20 })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commentaire</label>
                <textarea
                  {...registerGrade('comment')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  rows={3}
                  placeholder="Feedback pour l'élève..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetails;
