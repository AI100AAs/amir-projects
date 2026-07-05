import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Inventory from './pages/Inventory';
import Meals from './pages/Meals';
import Shopping from './pages/Shopping';
import Planner from './pages/Planner';
import Settings from './pages/Settings';

type Page = 'inventory' | 'meals' | 'shopping' | 'planner' | 'settings';

function AppInner() {
  const [page, setPage] = useState<Page>('inventory');

  const renderPage = () => {
    switch (page) {
      case 'inventory': return <Inventory />;
      case 'meals':     return <Meals />;
      case 'shopping':  return <Shopping />;
      case 'planner':   return <Planner />;
      case 'settings':  return <Settings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <Navbar page={page} onNavigate={setPage} />

      {/* Main content — offset for sidebar (desktop) and topbar */}
      <main className="md:ml-16 pt-14 pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {renderPage()}
        </div>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg, #1f2937)',
            color: 'var(--toast-color, #f9fafb)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
