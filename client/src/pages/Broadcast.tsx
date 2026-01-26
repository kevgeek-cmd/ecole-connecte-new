import { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

interface BroadcastForm {
  title: string;
  message: string;
  targetRole: 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'ALL';
}

const Broadcast = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BroadcastForm>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const onSubmit = async (data: BroadcastForm) => {
    setIsSubmitting(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/notifications/broadcast`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setStatus({ type: 'success', message: response.data.message });
      reset();
    } catch (error: any) {
      console.error("Broadcast error", error);
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.message || error.message || "Une erreur est survenue lors de l'envoi." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Send className="w-6 h-6 text-blue-600" />
          Diffuser une annonce
        </h1>
        <p className="text-gray-600 mt-1">Envoyez des notifications à tous les utilisateurs ou à des rôles spécifiques.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {status && (
          <div className={`mb-6 p-4 rounded-md flex items-start gap-3 ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <p>{status.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'annonce</label>
              <input
                {...register('title', { required: 'Le titre est requis' })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Maintenance prévue, Nouvelle fonctionnalité..."
              />
              {errors.title && <span className="text-red-500 text-sm">{errors.title.message}</span>}
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cible (Destinataires)</label>
                <select
                    {...register('targetRole')}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    <option value="SCHOOL_ADMIN">Administrateurs d'École (Directeurs)</option>
                    <option value="TEACHER">Professeurs</option>
                    <option value="STUDENT">Élèves</option>
                    <option value="ALL">Tous les utilisateurs</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Le message sera envoyé à tous les utilisateurs ayant ce rôle.
                </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                {...register('message', { required: 'Le message est requis' })}
                rows={6}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Écrivez votre message ici..."
              />
              {errors.message && <span className="text-red-500 text-sm">{errors.message.message}</span>}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer l\'annonce'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Broadcast;
