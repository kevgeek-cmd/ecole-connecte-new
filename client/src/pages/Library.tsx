import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Search, FileText, Video, Download, ExternalLink, Filter, Plus } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
  courseId: string;
  createdAt: string;
  course: {
    class: {
      name: string;
      level: string;
    };
    subject: {
      name: string;
    };
    teacher: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Course {
    id: string;
    class: { name: string };
    subject: { name: string };
}

const Library = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  
  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newMaterial, setNewMaterial] = useState({
      title: '',
      type: 'PDF',
      url: '', // For manual URL
      source: '',
      file: null as File | null
  });

  useEffect(() => {
    fetchMaterials();
    if (user?.role === 'TEACHER') {
        fetchMyCourses();
    }
  }, [user]);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/courses/library');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCourses = async () => {
      try {
          const response = await api.get('/courses');
          setMyCourses(response.data);
      } catch (error) {
          console.error("Error fetching courses", error);
      }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourseId) return alert("Veuillez sélectionner un cours");
      if (!newMaterial.title) return alert("Veuillez entrer un titre");
      if (!newMaterial.file && !newMaterial.url) return alert("Veuillez fournir un fichier ou un lien");

      setUploadLoading(true);
      const formData = new FormData();
      formData.append('title', newMaterial.title);
      formData.append('type', newMaterial.type);
      if (newMaterial.url) formData.append('url', newMaterial.url);
      if (newMaterial.file) formData.append('file', newMaterial.file);

      try {
          await api.post(`/courses/${selectedCourseId}/materials`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert("Document ajouté avec succès !");
          setIsUploadModalOpen(false);
          setNewMaterial({ title: '', type: 'PDF', url: '', file: null });
          fetchMaterials(); // Refresh list
      } catch (error) {
          console.error("Upload failed", error);
          alert("Erreur lors de l'ajout du document");
      } finally {
          setUploadLoading(false);
      }
  };

  const availableLevels = Array.from(new Set(materials.map(m => m.course.class.level).filter(Boolean)));

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          material.course.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          material.course.class.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || material.type === typeFilter;
    const matchesLevel = levelFilter === 'ALL' || material.course.class.level === levelFilter;
    return matchesSearch && matchesType && matchesLevel;
  });

  const getIcon = (type: string) => {
    if (type === 'VIDEO' || type.includes('video')) return <Video className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bibliothèque de Cours</h1>
          <p className="text-gray-500 dark:text-gray-400">Accédez à toutes les ressources pédagogiques</p>
        </div>
        {user?.role === 'TEACHER' && (
             <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
             >
                 <Plus className="w-4 h-4" />
                 Ajouter un document
             </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un cours, une matière..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          
          {availableLevels.length > 0 && (
             <select
                className="border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
            >
                <option value="ALL">Tous les niveaux</option>
                {availableLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                ))}
            </select>
          )}

          <select
            className="border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tous les types</option>
            <option value="PDF">PDF / Documents</option>
            <option value="VIDEO">Vidéos</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun document trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {getIcon(material.type)}
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full">
                    {material.course.subject.name}
                </span>
              </div>
              
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2" title={material.title}>
                  {material.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {material.course.class.name} • Prof. {material.course.teacher.lastName}
                  {material.source && <span className="block text-xs mt-1 italic text-gray-400">Source : {material.source}</span>}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                      {new Date(material.createdAt).toLocaleDateString()}
                  </span>
                  <a 
                    href={material.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                      {material.type === 'VIDEO' ? 'Regarder' : 'Télécharger'}
                      {material.type === 'VIDEO' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-transparent dark:border-gray-700">
                <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">Ajouter un document</h2>
                </div>
                <form onSubmit={handleFileUpload} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Cours concerné</label>
                        <select 
                            className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={selectedCourseId}
                            onChange={e => setSelectedCourseId(e.target.value)}
                            required
                        >
                            <option value="">Sélectionner un cours...</option>
                            {myCourses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.class.name} - {c.subject.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Titre du document</label>
                        <input 
                            type="text"
                            className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newMaterial.title}
                            onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Source (Optionnel)</label>
                        <input 
                            type="text"
                            placeholder="Ex: Ministère de l'Éducation, Manuel scolaire..."
                            className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newMaterial.source}
                            onChange={e => setNewMaterial({...newMaterial, source: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                        <select 
                            className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={newMaterial.type}
                            onChange={e => setNewMaterial({...newMaterial, type: e.target.value})}
                        >
                            <option value="PDF">Document (PDF, Word, Excel...)</option>
                            <option value="VIDEO">Vidéo (Lien YouTube...)</option>
                        </select>
                    </div>

                    {newMaterial.type === 'VIDEO' ? (
                        <div>
                             <label className="block text-sm font-medium mb-1 dark:text-gray-300">Lien Vidéo</label>
                             <input 
                                type="url"
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="https://youtube.com/..."
                                value={newMaterial.url}
                                onChange={e => setNewMaterial({...newMaterial, url: e.target.value})}
                                required
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fichier</label>
                            <input 
                                type="file"
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                onChange={e => setNewMaterial({...newMaterial, file: e.target.files ? e.target.files[0] : null})}
                                required={!newMaterial.url} // If URL not set, file is required
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button 
                            type="button"
                            onClick={() => setIsUploadModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            disabled={uploadLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {uploadLoading ? 'Envoi...' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Library;
