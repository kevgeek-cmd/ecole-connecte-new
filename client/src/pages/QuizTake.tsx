import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE';
    points: number;
    options: Option[];
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    questions: Question[];
}

const QuizTake = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [currentStep, setCurrentStep] = useState(0); // 0 = Intro, 1...N = Questions, N+1 = Review
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number, totalPoints: number } | null>(null);

    useEffect(() => {
        if (id) {
            api.get(`/quizzes/${id}`).then(res => setQuiz(res.data)).catch(err => console.error(err));
        }
    }, [id]);

    const handleOptionSelect = (questionId: string, optionId: string, type: 'SINGLE' | 'MULTIPLE') => {
        setAnswers(prev => {
            const current = prev[questionId] || [];
            if (type === 'SINGLE') {
                return { ...prev, [questionId]: [optionId] };
            } else {
                if (current.includes(optionId)) {
                    return { ...prev, [questionId]: current.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [questionId]: [...current, optionId] };
                }
            }
        });
    };

    const submitQuiz = async () => {
        try {
            setIsSubmitting(true);
            const res = await api.post(`/quizzes/${id}/submit`, { answers });
            setResult({
                score: res.data.attempt.score,
                totalPoints: 20 // Always scaled to 20
            });
        } catch (error) {
            console.error("Submission error", error);
            alert("Erreur lors de l'envoi du quiz.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!quiz) return <div className="p-10 text-center">Chargement...</div>;

    // Intro Screen
    if (currentStep === 0) {
        return (
            <div className="max-w-2xl mx-auto p-6 mt-10">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-gray-100">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">{quiz.title}</h1>
                    {quiz.description && <p className="text-gray-600 mb-8 text-lg">{quiz.description}</p>}
                    
                    <div className="bg-blue-50 p-4 rounded-lg inline-block mb-8 text-blue-800 text-sm">
                        <p>Ce QCM contient {quiz.questions.length} questions.</p>
                        <p>Prenez votre temps pour répondre.</p>
                    </div>

                    <button
                        onClick={() => setCurrentStep(1)}
                        className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-lg flex items-center justify-center gap-2 mx-auto"
                    >
                        Commencer <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    // Result Screen
    if (result) {
        return (
            <div className="max-w-xl mx-auto p-6 mt-10">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-gray-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Terminé !</h2>
                    <p className="text-gray-600 mb-6">Merci d'avoir participé.</p>
                    
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                        {result.score.toFixed(1)}<span className="text-2xl text-gray-400">/20</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-8">Votre note finale</p>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        Retour au cours
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestionIndex = currentStep - 1;
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    // Question Screen
    return (
        <div className="max-w-3xl mx-auto p-6 mt-6">
            <div className="mb-6 flex justify-between items-center text-sm text-gray-500">
                <span>Question {currentStep} / {quiz.questions.length}</span>
                <span>Progression: {Math.round((currentQuestionIndex / quiz.questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full mb-8 overflow-hidden">
                <div 
                    className="bg-blue-600 h-full transition-all duration-300" 
                    style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
                ></div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6">{currentQuestion.text}</h2>
                
                <div className="space-y-3">
                    {currentQuestion.options.map(option => {
                        const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                        return (
                            <div 
                                key={option.id}
                                onClick={() => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition flex items-center justify-between ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <span className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{option.text}</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-between">
                    <button
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className={`px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Précédent
                    </button>

                    {isLastQuestion ? (
                        <button
                            onClick={submitQuiz}
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-lg shadow-green-200"
                        >
                            {isSubmitting ? 'Envoi...' : 'Terminer le Quiz'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                            Suivant <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizTake;
