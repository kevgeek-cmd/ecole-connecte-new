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
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{assignment.title}</h1>
                <div className="flex items-center gap-4 text-gray-500 mb-4">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase">
                        {assignment.course.subject.name}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4" />
                        Pour le {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                    {cleanDescription(assignment.description)}
                </p>
                {getAssignmentFile(assignment.description) && (
                    <a 
                        href={getFileUrl(getAssignmentFile(assignment.description)!)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                    >
                        <FileText className="w-5 h-5" />
                        Télécharger le sujet du devoir
                    </a>
                )}
            </div>
            
            {!isTeacher && (
                <div className="min-w-[200px]">
                    {mySubmission ? (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                                <CheckCircle className="w-5 h-5" />
                                Devoir rendu
                            </div>
                            <p className="text-sm text-green-600 mb-2">
                                Le {new Date(mySubmission.createdAt).toLocaleDateString()}
                            </p>
                             {mySubmission.grade ? (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                    <p className="text-sm font-bold text-gray-700">Note: {mySubmission.grade.value}/20</p>
                                    {mySubmission.grade.comment && <p className="text-xs text-gray-500 italic">"{mySubmission.grade.comment}"</p>}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">En attente de correction</p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-500" />
                      Travaux des élèves ({submissions.length})
                  </h2>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                          <tr>
                              <th className="p-4">Élève</th>
                              <th className="p-4">Date de remise</th>
                              <th className="p-4">Contenu</th>
                              <th className="p-4">Note</th>
                              <th className="p-4">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {submissions.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="p-8 text-center text-gray-500 italic">Aucun travail rendu pour le moment.</td>
                              </tr>
                          ) : (
                              submissions.map(sub => (
                                  <tr key={sub.id} className="hover:bg-gray-50">
                                      <td className="p-4 font-medium">
                                          {sub.student.firstName} {sub.student.lastName}
                                      </td>
                                      <td className="p-4 text-sm text-gray-500">
                                          {new Date(sub.createdAt).toLocaleDateString()} à {new Date(sub.createdAt).toLocaleTimeString().slice(0,5)}
                                      </td>
                                      <td className="p-4">
                                          {sub.content && <p className="text-sm text-gray-700 line-clamp-2">{sub.content}</p>}
                                          {sub.fileUrl && (
                                            <a href={getFileUrl(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline block mt-1">
                                                Voir le fichier
                                            </a>
                                        )}
                                      </td>
                                      <td className="p-4">
                                          {sub.grade ? (
                                              <div>
                                                  <span className="font-bold text-gray-800">{sub.grade.value}/20</span>
                                              </div>
                                          ) : (
                                              <span className="text-gray-400 text-sm">-</span>
                                          )}
                                      </td>
                                      <td className="p-4">
                                          <button 
                                            onClick={() => openGradeModal(sub.id)}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded transition"
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
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Rendre votre devoir</h2>
            <form onSubmit={handleSubmitSubmit(onSubmitWork)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (Texte)</label>
                <textarea
                  {...registerSubmit('content')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={4}
                  placeholder="Écrivez votre réponse ici..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (PDF, Word, Image...)</label>
                <input
                  type="file"
                  {...registerSubmit('file')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ou Lien vers un fichier (URL)</label>
                <input
                  {...registerSubmit('fileUrl')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
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
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Noter le devoir</h2>
            <form onSubmit={handleSubmitGrade(onGradeWork)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (/20)</label>
                <input
                  type="number"
                  step="0.5"
                  max="20"
                  min="0"
                  {...registerGrade('value', { required: true, min: 0, max: 20 })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                <textarea
                  {...registerGrade('comment')}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  placeholder="Feedback pour l'élève..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
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
