import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';
import NotificationCenter from '../components/NotificationCenter';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar - Pass props for control */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header - visible sur mobile et desktop pour les notifications */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-30 flex items-center justify-between h-16 shrink-0">
          <div className="flex items-center gap-2">
            <div className="lg:hidden bg-blue-600 p-1.5 rounded-lg">
              <Menu 
                className="w-6 h-6 text-white cursor-pointer" 
                onClick={() => setIsSidebarOpen(true)}
              />
            </div>
            <span className="font-bold text-gray-800 dark:text-white hidden sm:inline-block">Ecole Connectée</span>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        {/* Zone de contenu principal - scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 min-w-0 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
