
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { Scanner } from './components/Scanner';
import { useStore } from './lib/store';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const currentView = useStore((state) => state.currentView);

  return (
    <AppLayout>
      <ErrorBoundary>
        {currentView === 'home' && <HomePage />}
        {/* history is now merged into home */}
        
        {/* Scanner is an overlay, conditionally rendered */}
        {currentView === 'scanner' && <Scanner />}
      </ErrorBoundary>
    </AppLayout>
  );
}

export default App;
