import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Calendar, ChevronLeft, ChevronRight, Clock, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Assignment {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    course: {
        id: string;
        subject: { name: string };
        class: { name: string; level: string };
    };
}

const Agenda = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    // Predefined levels - ideally should come from backend or config
    const levels = ['6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TERMINALE'];

    useEffect(() => {
        // If student, level might be auto-detected by backend or we let them choose if in multiple
        // For MVP, if student, we might not need to send level if backend infers it, 
        // BUT backend getAgenda requires 'level'.
        // So we need to know the student's level.
        // Or we can fetch "my assignments" using getAssignments logic but presented as Agenda.
        // Wait, getAgenda is specific for "Agenda par niveau".
        // If I am a student, I want to see MY agenda.
        // If I am a teacher/admin, I want to see Agenda of a LEVEL.
        
        if (user?.role === 'STUDENT') {
            // For students, we might want to fetch THEIR assignments specifically
            // But the requirement is "Agenda mensuel des devoirs par niveau".
            // Let's assume the student selects their level or we default to one.
            // Better: Fetch user's enrollments to get level? 
            // Or just ask backend for "my agenda" without level?
            // The backend getAgenda REQUIRES level.
            // Let's try to fetch assignments using getAssignments (my assignments) and filter by date locally?
            // No, getAssignments is per course.
            // Let's use getAgenda but we need a level.
            if (!selectedLevel) {
                // Try to guess or wait for selection?
                // Let's Default to 6EME or empty
                // Ideally we should fetch student's level.
            }
        }
        
        if (selectedLevel) {
            fetchAgenda();
        } else if (user?.role === 'STUDENT') {
            // If student and no level selected, maybe we should fetch "all my assignments" 
            // The backend getAgenda might be too restrictive if it requires level.
            // Let's modify backend or use a different approach for Student personal agenda.
            // Actually, "Agenda mensuel des devoirs par niveau" sounds like a global view.
            // But students need their own.
            // Let's just implement the Level selector for everyone for now (MVP).
        }
    }, [currentDate, selectedLevel, user]);

    const fetchAgenda = async () => {
        try {
            setLoading(true);
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
            
            const response = await api.get('/assignments/agenda', {
                params: {
                    level: selectedLevel,
                    startDate: start,
                    endDate: end
                }
            });
            setAssignments(response.data);
        } catch (error) {
            console.error("Error fetching agenda", error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Group assignments by date
    const getAssignmentsByDate = (date: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
        return assignments.filter(a => {
            const d = new Date(a.dueDate);
            return d.getDate() === date && 
                   d.getMonth() === checkDate.getMonth() && 
                   d.getFullYear() === checkDate.getFullYear();
        });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Agenda des Devoirs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Vue mensuelle par niveau</p>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="p-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Sélectionner un niveau...</option>
                        {levels.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedLevel ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Veuillez sélectionner un niveau pour voir l'agenda</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                            <ChevronLeft className="w-5 h-5 dark:text-white" />
                        </button>
                        <h2 className="text-xl font-semibold capitalize dark:text-white">{monthName}</h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                            <ChevronRight className="w-5 h-5 dark:text-white" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    {loading ? (
                        <div className="p-8 text-center">Chargement...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {days.map(day => {
                                const dayAssignments = getAssignmentsByDate(day);
                                if (dayAssignments.length === 0) return null;
                                
                                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

                                return (
                                    <div key={day} className="border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase border-b dark:border-gray-700 pb-1">
                                            {dayName}
                                        </div>
                                        <div className="space-y-2">
                                            {dayAssignments.map(assignment => (
                                                <Link 
                                                    to={`/assignments/${assignment.id}`} 
                                                    key={assignment.id}
                                                    className="block bg-white dark:bg-gray-700 p-2 rounded shadow-sm border-l-4 border-blue-500 hover:shadow-md transition"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                                                            {assignment.course.subject.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-medium text-sm mt-1 dark:text-white line-clamp-2">{assignment.title}</h4>
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{assignment.course.class.name}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {assignments.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    Aucun devoir pour ce mois.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Agenda;
