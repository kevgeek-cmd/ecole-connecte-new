import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Printer, User, BookOpen } from 'lucide-react';

interface ReportCardData {
  student: {
    firstName: string;
    lastName: string;
    class: string;
  };
  school: {
    name: string;
    address?: string;
  };
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  subjects: {
    id: string;
    subject: string;
    subjectCode?: string;
    teacher: string;
    average: number | null;
    coefficient: number;
    grades: {
      value: number;
      assignment?: string;
    }[];
  }[];
  overallAverage: number | null;
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

const StudentReportCards = () => {
  const { user } = useAuth();
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  
  // Admin/Teacher Selection State
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [students, setStudents] = useState<{id: string, firstName: string, lastName: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTerms();
    if (user?.role !== 'STUDENT') {
        fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
        fetchClassStudents(selectedClassId);
    } else {
        setStudents([]);
        setSelectedStudentId('');
    }
  }, [selectedClassId]);

  useEffect(() => {
    // Logic for triggering fetch
    if (user?.role === 'STUDENT') {
        if (selectedTermId) fetchReportCard(selectedTermId);
    } else {
        // For Admin/Teacher, need both student and term
        if (selectedTermId && selectedStudentId) {
            fetchReportCard(selectedTermId, selectedStudentId);
        } else if (selectedStudentId && terms.length > 0 && !selectedTermId) {
             // Auto-select term if student selected but term not (unlikely due to initial load)
             const openTerm = terms.find(t => t.status === 'OPEN') || terms[0];
             if (openTerm) setSelectedTermId(openTerm.id);
        }
    }
  }, [terms, selectedTermId, selectedStudentId, user]);

  const fetchClasses = async () => {
      try {
          const response = await api.get('/classes');
          setClasses(response.data);
      } catch (err) {
          console.error("Error fetching classes", err);
      }
  };

  const fetchClassStudents = async (classId: string) => {
      try {
          const response = await api.get(`/classes/${classId}/students`);
          setStudents(response.data);
      } catch (err) {
          console.error("Error fetching students", err);
      }
  };


  const fetchTerms = async () => {
    try {
      const response = await api.get('/academic-years'); // Returns years with terms
      // Flatten terms from years
      const allTerms: Term[] = [];
      response.data.forEach((year: any) => {
        if (year.terms) {
            allTerms.push(...year.terms);
        }
      });
      // Sort terms by date desc
      allTerms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setTerms(allTerms);
    } catch (err) {
      console.error("Error fetching terms", err);
    }
  };

  const fetchReportCard = async (termId: string, studentId?: string) => {
    try {
      setLoading(true);
      setError(null);
      let url = `/grades/report-card?termId=${termId}`;
      if (studentId) {
          url = `/grades/report-card/${studentId}?termId=${termId}`;
      }
      
      const response = await api.get(url);
      setReportCard(response.data);
    } catch (err) {
      console.error("Error fetching report card", err);
      setError("Impossible de charger le bulletin.");
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Bulletins de Notes</h1>
                {user?.role !== 'STUDENT' && <p className="text-gray-500 dark:text-gray-400">Consultez les bulletins des élèves</p>}
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
                {user?.role !== 'STUDENT' && (
                    <>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <select 
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="p-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                            >
                                <option value="">Choisir une classe...</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <select 
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                disabled={!selectedClassId}
                                className="p-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] disabled:opacity-50"
                            >
                                <option value="">Choisir un élève...</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <select 
                    value={selectedTermId} 
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="p-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {terms.map(term => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                </select>
                <button 
                    onClick={handlePrint}
                    disabled={!reportCard}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    <Printer className="w-4 h-4" />
                    Imprimer
                </button>
            </div>
        </div>

        {user?.role !== 'STUDENT' && !selectedStudentId && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Veuillez sélectionner une classe et un élève pour voir le bulletin</p>
            </div>
        )}

        {loading && <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement du bulletin...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        {reportCard && !loading && (
            <div className="bg-white dark:bg-gray-800 p-8 shadow-lg rounded-lg max-w-4xl mx-auto print-area border border-transparent dark:border-gray-700" ref={printRef}>
                {/* Header */}
                <div className="flex justify-between border-b-2 border-gray-800 dark:border-gray-600 pb-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">{reportCard.school.name}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{reportCard.school.address}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">BULLETIN DE NOTES</h3>
                        <p className="text-gray-600 dark:text-gray-400">{reportCard.term.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Année Scolaire {new Date(reportCard.term.startDate).getFullYear()}-{new Date(reportCard.term.endDate).getFullYear()}</p>
                    </div>
                </div>

                {/* Student Info */}
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-500 dark:text-gray-500 uppercase text-xs font-semibold">Élève</span>
                            <p className="text-lg font-bold dark:text-white">{reportCard.student.firstName} {reportCard.student.lastName}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-gray-500 dark:text-gray-500 uppercase text-xs font-semibold">Classe</span>
                            <p className="text-lg font-bold dark:text-white">{reportCard.student.class}</p>
                        </div>
                    </div>
                </div>

                {/* Grades Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse mb-8">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                                <th className="p-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Matière</th>
                                <th className="p-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Enseignant</th>
                                <th className="p-3 text-center text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Coef.</th>
                                <th className="p-3 text-center text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Moyenne</th>
                                <th className="p-3 text-left text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportCard.subjects.map((subject) => (
                                <tr key={subject.id} className="border-b border-gray-200 dark:border-gray-700">
                                    <td className="p-3">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{subject.subject}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">{subject.subjectCode}</p>
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{subject.teacher}</td>
                                    <td className="p-3 text-center font-medium text-gray-700 dark:text-gray-300">{subject.coefficient || 1}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-bold ${
                                            subject.average === null ? 'text-gray-400' :
                                            subject.average >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {subject.average !== null ? subject.average.toFixed(2) : '-'}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">/20</span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400 italic">
                                        {subject.average !== null 
                                            ? (subject.average >= 15 ? "Très bien" : subject.average >= 12 ? "Bien" : subject.average >= 10 ? "Passable" : "Insuffisant")
                                            : "Aucune note"
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 dark:bg-gray-900 font-bold">
                                <td colSpan={3} className="p-4 text-right uppercase text-gray-700 dark:text-gray-300">Moyenne Générale</td>
                                <td className="p-4 text-center text-xl border-t-2 border-gray-800 dark:border-gray-600">
                                    <span className={
                                        reportCard.overallAverage === null ? 'text-gray-400' :
                                        reportCard.overallAverage >= 10 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                                    }>
                                        {reportCard.overallAverage !== null ? reportCard.overallAverage.toFixed(2) : '-'}
                                    </span>
                                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/20</span>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer / Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-500">
                     <div>
                        <p className="mb-8 font-semibold uppercase dark:text-gray-400">L'Élève</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase dark:text-gray-400">Les Parents</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase dark:text-gray-400">Le Directeur</p>
                     </div>
                </div>
                
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
                    Bulletin généré le {new Date().toLocaleDateString()} via Ecole Connectée
                </div>
            </div>
        )}
        
        {/* CSS for print */}
        <style>{`
            @media print {
                .no-print { display: none !important; }
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                /* Sidebar handling - might need to target specific classes if body * covers it */
                #root > div > div.fixed { display: none; } /* Sidebar */
            }
        `}</style>
    </div>
  );
};

export default StudentReportCards;
