import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';

interface Attempt {
    id: string;
    score: number;
    completedAt: string;
    student: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

const QuizAttemptsList = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [quizRes, attemptsRes] = await Promise.all([
                    api.get(`/quizzes/${id}`),
                    api.get(`/quizzes/${id}/attempts`)
                ]);
                setQuizTitle(quizRes.data.title);
                setAttempts(attemptsRes.data);
            } catch (error) {
                console.error("Error fetching attempts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center dark:text-white">Chargement...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 mb-6 transition"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour au cours
            </button>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Résultats : {quizTitle}</h1>
                <p className="text-gray-500 dark:text-gray-400">{attempts.length} tentative(s) enregistrée(s)</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Élève</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Note /20</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {attempts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    Aucune tentative pour le moment.
                                </td>
                            </tr>
                        ) : (
                            attempts.map((attempt) => (
                                <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white">
                                                    {attempt.student.firstName} {attempt.student.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500">{attempt.student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(attempt.completedAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-bold text-lg ${
                                            attempt.score >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {attempt.score.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => navigate(`/quizzes/attempts/${attempt.id}`)}
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                        >
                                            Voir détails
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QuizAttemptsList;