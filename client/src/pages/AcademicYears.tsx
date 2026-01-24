import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useForm } from 'react-hook-form';
import { Plus, Calendar, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface TermModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
}

interface AcademicYearModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  terms: TermModel[];
}

const AcademicYears = () => {
  const [years, setYears] = useState<AcademicYearModel[]>([]);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null);

  const [editingYear, setEditingYear] = useState<AcademicYearModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const { register: registerYear, handleSubmit: handleSubmitYear, reset: resetYear } = useForm();
  const { register: registerTerm, handleSubmit: handleSubmitTerm, reset: resetTerm } = useForm();

  const fetchYears = async () => {
    try {
      const response = await api.get('/academic/years');
      setYears(response.data);
    } catch (error) {
      console.error('Error fetching academic years', error);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const onSubmitYear = async (data: any) => {
    if (editingYear) {
        setEditFormData(data);
        setIsEditConfirmModalOpen(true);
    } else {
        try {
            await api.post('/academic/years', data);
            setIsYearModalOpen(false);
            resetYear();
            fetchYears();
        } catch (error) {
            console.error('Error creating academic year', error);
        }
    }
  };

  const confirmEdit = async () => {
      if (!editingYear || !editFormData) return;
      try {
          await api.put(`/academic/years/${editingYear.id}`, editFormData);
          setIsYearModalOpen(false);
          resetYear();
          fetchYears();
      } catch (error) {
          console.error('Error updating academic year', error);
      } finally {
          setIsEditConfirmModalOpen(false);
          setEditFormData(null);
          setEditingYear(null);
      }
  }

  const handleDeleteClick = (id: string) => {
      setYearToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
      if (!yearToDelete) return;
      try {
          await api.delete(`/academic/years/${yearToDelete}`);
          fetchYears();
      } catch (error) {
          console.error('Error deleting academic year', error);
      } finally {
          setIsDeleteModalOpen(false);
          setYearToDelete(null);
      }
  }

  const openCreateModal = () => {
      setEditingYear(null);
      resetYear({ name: '', startDate: '', endDate: '' });
      setIsYearModalOpen(true);
  }

  const handleEditClick = (year: AcademicYearModel) => {
      setEditingYear(year);
      // Format dates for input type="date"
      const startDate = new Date(year.startDate).toISOString().split('T')[0];
      const endDate = new Date(year.endDate).toISOString().split('T')[0];
      
      resetYear({ 
          name: year.name, 
          startDate, 
          endDate 
      });
      setIsYearModalOpen(true);
  }

  const onSubmitTerm = async (data: any) => {
    try {
      await api.post('/academic/terms', { ...data, academicYearId: selectedYearId });
      setIsTermModalOpen(false);
      resetTerm();
      fetchYears();
    } catch (error) {
      console.error('Error creating term', error);
    }
  };

  const openTermModal = (yearId: string) => {
      setSelectedYearId(yearId);
      setIsTermModalOpen(true);
  }

  const toggleYearExpand = (yearId: string) => {
      if (expandedYearId === yearId) {
          setExpandedYearId(null);
      } else {
          setExpandedYearId(yearId);
      }
  }

  const handleToggleStatus = async (termId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.patch(`/academic/terms/${termId}/status`, { status: newStatus });
      fetchYears();
    } catch (error) {
      console.error('Error toggling term status', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-8 h-8 text-blue-600" />
          Années Scolaires
        </h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Année
        </button>
      </div>

      <div className="space-y-4">
        {years.map((year) => (
          <div key={year.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
                className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleYearExpand(year.id)}
            >
              <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{year.name}</h3>
                    <p className="text-sm text-gray-500">
                        {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                    </p>
                  </div>
              </div>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm text-gray-500">{year.terms.length} Périodes</span>
                <button 
                    onClick={() => handleEditClick(year)}
                    className="p-1 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded transition"
                    title="Modifier"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => handleDeleteClick(year.id)}
                    className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition"
                    title="Supprimer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                {expandedYearId === year.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </div>

            {expandedYearId === year.id && (
                <div className="bg-gray-50 p-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">Périodes / Trimestres</h4>
                        <button 
                            onClick={(e) => { e.stopPropagation(); openTermModal(year.id); }}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Ajouter une période
                        </button>
                    </div>
                    
                    {year.terms.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Aucune période définie.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {year.terms.map(term => (
                                <div key={term.id} className="bg-white p-4 rounded border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold">{term.name}</span>
                                        <button
                                            onClick={() => handleToggleStatus(term.id, term.status)}
                                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                                                term.status === 'OPEN' 
                                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                                                : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                                            }`}
                                            title="Cliquez pour changer le statut"
                                        >
                                            {term.status === 'OPEN' ? 'OUVERT' : 'FERMÉ'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Year Modal */}
      {isYearModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">{editingYear ? 'Modifier l\'année scolaire' : 'Ajouter une année scolaire'}</h2>
            <form onSubmit={handleSubmitYear(onSubmitYear)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  {...registerYear('name', { required: 'Le nom est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 2023-2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                    <input
                    type="date"
                    {...registerYear('startDate', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                    <input
                    type="date"
                    {...registerYear('endDate', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {editingYear ? 'Sauvegarder' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Term Modal */}
       {isTermModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Nouvelle Période</h2>
            <form onSubmit={handleSubmitTerm(onSubmitTerm)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  {...registerTerm('name', { required: 'Le nom est requis' })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Trimestre 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                    <input
                    type="date"
                    {...registerTerm('startDate', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                    <input
                    type="date"
                    {...registerTerm('endDate', { required: true })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'année scolaire"
        message="Êtes-vous sûr de vouloir supprimer cette année scolaire ? Cette action supprimera également toutes les périodes associées."
        confirmText="Supprimer"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Modifier l'année scolaire"
        message="Êtes-vous sûr de vouloir modifier cette année scolaire ?"
        confirmText="Sauvegarder"
        isDanger={false}
      />
    </div>
  );
};

export default AcademicYears;
