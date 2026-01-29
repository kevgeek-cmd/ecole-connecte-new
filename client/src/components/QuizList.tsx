import { useState } from 'react';
import { Plus, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateQuizModal from './CreateQuizModal';

interface Quiz {
    id: string;
    title: string;
    description?: string;
    _count: { questions: number };
    attempts?: { score: number }[];
}

interface QuizListProps {
    courseId: string;
    isTeacher: boolean;
    quizzes: Quiz[];
    onUpdate: () => void;
}

const QuizList = ({ courseId, isTeacher, quizzes, onUpdate }: QuizListProps) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">QCM & Évaluations</h2>
                {isTeacher && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau QCM
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {quizzes.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Aucun QCM disponible pour le moment.</p>
                    </div>
                )}
                
                {quizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{quiz.title}</h3>
                                {quiz.description && <p className="text-gray-600 mt-1">{quiz.description}</p>}
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {quiz._count.questions} questions
                                    </span>
                                    {/* For students, show best score if attempted */}
                                    {!isTeacher && quiz.attempts && quiz.attempts.length > 0 && (
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                            <CheckCircle className="w-4 h-4" />
                                            Dernier score: {quiz.attempts[0].score.toFixed(1)}/20
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                {isTeacher ? (
                                    <div className="text-sm text-gray-500 italic">
                                        (Visible par les élèves)
                                    </div>
                                ) : (
                                    <Link
                                        to={`/quizzes/${quiz.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                        {quiz.attempts && quiz.attempts.length > 0 ? 'Refaire' : 'Commencer'}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCreateModalOpen && (
                <CreateQuizModal 
                    courseId={courseId} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        onUpdate();
                    }} 
                />
            )}
        </div>
    );
};

export default QuizList;
