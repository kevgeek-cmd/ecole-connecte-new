import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Printer } from 'lucide-react';

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
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      fetchReportCard(selectedTermId);
    } else if (terms.length > 0) {
        // Auto select first open term or first term
        const openTerm = terms.find(t => t.status === 'OPEN');
        if (openTerm) {
            setSelectedTermId(openTerm.id);
        } else {
            setSelectedTermId(terms[0].id);
        }
    }
  }, [terms, selectedTermId]);

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

  const fetchReportCard = async (termId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/grades/report-card?termId=${termId}`);
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
        <div className="flex justify-between items-center no-print">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Mes Bulletins</h1>
            <div className="flex gap-4">
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
                    Imprimer / PDF
                </button>
            </div>
        </div>

        {loading && <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement du bulletin...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        {reportCard && !loading && (
            <div className="bg-white p-8 shadow-lg rounded-lg max-w-4xl mx-auto print-area" ref={printRef}>
                {/* Header */}
                <div className="flex justify-between border-b-2 border-gray-800 pb-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 uppercase">{reportCard.school.name}</h2>
                        <p className="text-gray-600">{reportCard.school.address}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-semibold text-gray-800">BULLETIN DE NOTES</h3>
                        <p className="text-gray-600">{reportCard.term.name}</p>
                        <p className="text-sm text-gray-500 mt-2">Année Scolaire {new Date(reportCard.term.startDate).getFullYear()}-{new Date(reportCard.term.endDate).getFullYear()}</p>
                    </div>
                </div>

                {/* Student Info */}
                <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-500 uppercase text-xs font-semibold">Élève</span>
                            <p className="text-lg font-bold">{reportCard.student.firstName} {reportCard.student.lastName}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-gray-500 uppercase text-xs font-semibold">Classe</span>
                            <p className="text-lg font-bold">{reportCard.student.class}</p>
                        </div>
                    </div>
                </div>

                {/* Grades Table */}
                <table className="w-full border-collapse mb-8">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="p-3 text-left text-sm font-bold text-gray-700 uppercase">Matière</th>
                            <th className="p-3 text-left text-sm font-bold text-gray-700 uppercase">Enseignant</th>
                            <th className="p-3 text-center text-sm font-bold text-gray-700 uppercase">Coef.</th>
                            <th className="p-3 text-center text-sm font-bold text-gray-700 uppercase">Moyenne</th>
                            <th className="p-3 text-left text-sm font-bold text-gray-700 uppercase">Appréciation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportCard.subjects.map((subject) => (
                            <tr key={subject.id} className="border-b border-gray-200">
                                <td className="p-3">
                                    <p className="font-semibold text-gray-800">{subject.subject}</p>
                                    <p className="text-xs text-gray-500">{subject.subjectCode}</p>
                                </td>
                                <td className="p-3 text-gray-700">{subject.teacher}</td>
                                <td className="p-3 text-center font-medium text-gray-700">{subject.coefficient || 1}</td>
                                <td className="p-3 text-center">
                                    <span className={`font-bold ${
                                        subject.average === null ? 'text-gray-400' :
                                        subject.average >= 10 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {subject.average !== null ? subject.average.toFixed(2) : '-'}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-1">/20</span>
                                </td>
                                <td className="p-3 text-sm text-gray-600 italic">
                                    {/* Placeholder for appreciation logic or display list of assignments */}
                                    {subject.average !== null 
                                        ? (subject.average >= 15 ? "Très bien" : subject.average >= 12 ? "Bien" : subject.average >= 10 ? "Passable" : "Insuffisant")
                                        : "Aucune note"
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50 font-bold">
                            <td colSpan={3} className="p-4 text-right uppercase text-gray-700">Moyenne Générale</td>
                            <td className="p-4 text-center text-xl border-t-2 border-gray-800">
                                <span className={
                                    reportCard.overallAverage === null ? 'text-gray-400' :
                                    reportCard.overallAverage >= 10 ? 'text-blue-600' : 'text-red-600'
                                }>
                                    {reportCard.overallAverage !== null ? reportCard.overallAverage.toFixed(2) : '-'}
                                </span>
                                <span className="text-sm text-gray-400 ml-1">/20</span>
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer / Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                     <div>
                        <p className="mb-8 font-semibold uppercase">L'Élève</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase">Les Parents</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase">Le Directeur</p>
                     </div>
                </div>
                
                <div className="text-center text-xs text-gray-400 mt-8">
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
