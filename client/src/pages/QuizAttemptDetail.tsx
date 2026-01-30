import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import api from '../utils/api';

interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE';
    points: number;
    options: Option[];
}

interface Answer {
    questionId: string;
    selectedOptions: string[];
}

interface AttemptDetail {
    id: string;
    score: number;
    completedAt: string;
    student: {
        firstName: string;
        lastName: string;
    };
    quiz: {
        title: string;
        questions: Question[];
    };
    answers: Answer[];
}

const QuizAttemptDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/quizzes/attempts/${id}`)
            .then(res => setAttempt(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-10 text-center dark:text-white">Chargement...</div>;
    if (!attempt) return <div className="p-10 text-center dark:text-white">Tentative introuvable.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 mb-6 transition"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour
            </button>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{attempt.quiz.title}</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Par {attempt.student.firstName} {attempt.student.lastName} • 
                            Le {new Date(attempt.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                        <span className="block text-sm text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Note Finale</span>
                        <span className="text-4xl font-black text-blue-600 dark:text-blue-400">
                            {attempt.score.toFixed(1)}<span className="text-xl opacity-60">/20</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    Détail des réponses
                </h2>

                {attempt.quiz.questions.map((question, index) => {
                    const studentAnswer = attempt.answers.find(a => a.questionId === question.id);
                    const selectedIds = studentAnswer?.selectedOptions || [];
                    const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
                    
                    const isFullyCorrect = 
                        selectedIds.length === correctIds.length && 
                        selectedIds.every(id => correctIds.includes(id));

                    return (
                        <div key={question.id} className={`p-6 rounded-xl border-2 transition ${
                            isFullyCorrect 
                                ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' 
                                : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white pt-0.5">{question.text}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isFullyCorrect ? (
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/40 px-3 py-1 rounded-full text-sm">
                                            <CheckCircle className="w-4 h-4" /> Correct
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/40 px-3 py-1 rounded-full text-sm">
                                            <XCircle className="w-4 h-4" /> Erreur
                                        </span>
                                    )}
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        {question.points} pt{question.points > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 ml-11">
                                {question.options.map(option => {
                                    const isSelected = selectedIds.includes(option.id);
                                    const isCorrect = option.isCorrect;
                                    
                                    let statusStyle = "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
                                    let icon = null;

                                    if (isCorrect) {
                                        statusStyle = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
                                        icon = <CheckCircle className="w-4 h-4 text-green-600" />;
                                    } else if (isSelected && !isCorrect) {
                                        statusStyle = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
                                        icon = <XCircle className="w-4 h-4 text-red-600" />;
                                    }

                                    return (
                                        <div key={option.id} className={`p-3 rounded-lg border-2 flex items-center justify-between ${statusStyle}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                                }`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                                <span className="font-medium">{option.text}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isSelected && <span className="text-xs font-bold uppercase tracking-tighter opacity-60">Votre réponse</span>}
                                                {icon}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isFullyCorrect && (
                                <div className="mt-4 ml-11 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>
                                        <strong>Solution correcte :</strong> {question.options.filter(o => o.isCorrect).map(o => o.text).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizAttemptDetail;