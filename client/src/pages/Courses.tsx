import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Plus, Book, User } from 'lucide-react';

interface CourseModel {
  id: string;
  class: { name: string; level?: string };
  subject: { name: string; code?: string };
  teacher: { firstName: string; lastName: string };
}

interface Option {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  
  // State for form options
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses', error);
    }
  };

  const fetchDataForForm = async () => {
      try {
          const promises = [
              api.get('/classes'),
              api.get('/subjects'),
          ];
          
          if (isAdmin) {
             promises.push(api.get('/users?role=TEACHER'));
          }

          const results = await Promise.all(promises);
          
          setClasses(results[0].data);
          setSubjects(results[1].data);
          
          if (isAdmin && results[2]) {
              setTeachers(results[2].data);
          }
      } catch (error) {
          console.error("Error fetching form data", error);
      }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  const openModal = () => {
      fetchDataForForm();
      setIsModalOpen(true);
  }

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const payload = { ...data };
      if (isTeacher && user) {
          payload.teacherId = user.id;
      }

      await api.post('/courses', payload);
      setIsModalOpen(false);
      reset();
      fetchCourses();
    } catch (error: any) {
      console.error('Error creating course', error);
      setSubmitError(error.response?.data?.message || "Une erreur est survenue lors de la création du cours.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Book className="w-8 h-8 text-blue-600" />
          {isAdmin ? 'Gestion des Cours' : 'Mes Cours'}
        </h1>
        {(isAdmin || isTeacher) && (
          <button
            onClick={openModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            {isAdmin ? 'Attribuer un cours' : 'Créer un cours'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div 
            key={course.id} 
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
            onClick={() => navigate(`/courses/${course.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-xl font-bold text-gray-800">{course.subject?.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                    {course.class?.name}
                  </span>
               </div>
               <div className="bg-blue-50 p-2 rounded-full">
                  <Book className="w-6 h-6 text-blue-500" />
               </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Prof. {course.teacher?.firstName} {course.teacher?.lastName}</span>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">{isAdmin ? 'Attribuer un cours' : 'Créer un nouveau cours'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select
                  {...register('classId', { required: 'La classe est requise' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {errors.classId && <span className="text-red-500 text-sm">{errors.classId.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                <select
                  {...register('subjectId', { required: 'La matière est requise' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">Sélectionner une matière</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {errors.subjectId && <span className="text-red-500 text-sm">{errors.subjectId.message as string}</span>}
              </div>

              {isAdmin && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant</label>
                    <select
                    {...register('teacherId', { required: 'L\'enseignant est requis' })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Sélectionner un enseignant</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                        ))}
                    </select>
                    {errors.teacherId && <span className="text-red-500 text-sm">{errors.teacherId.message as string}</span>}
                </div>
              )}

              {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                <p className="font-medium">Note :</p>
                <p>Vous pourrez ajouter du contenu (PDF, Vidéo, etc.) une fois le cours créé, en cliquant dessus.</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Création...
                    </>
                  ) : (
                    'Créer le cours'
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

export default Courses;
