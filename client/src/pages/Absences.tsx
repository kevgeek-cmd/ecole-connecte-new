import { UserX } from 'lucide-react';

const Absences = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3 mb-6">
        <UserX className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        Gestion des Absences
      </h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-300">Module de gestion des absences en cours de développement.</p>
      </div>
    </div>
  );
};

export default Absences;
