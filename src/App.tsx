import { useEffect } from 'react';
import PlayerRegistration from './components/PlayerRegistration';
import HostDashboard from './components/HostDashboard';
import ActiveGame from './components/ActiveGame';
import { useStore } from './store/useStore';

function App() {
  const isGameStarted = useStore((state) => state.isGameStarted);
  const initSession = useStore((state) => state.initSession);
  const sessionId = useStore((state) => state.sessionId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let session = params.get('session');
    
    if (!session) {
      session = crypto.randomUUID().slice(0, 8);
      // Update URL without reloading
      const newUrl = `${window.location.pathname}?session=${session}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
    
    initSession(session);
  }, [initSession]);

  if (!sessionId) {
    return <div className="min-h-screen flex items-center justify-center">Loading Session...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Bossel-Vibe</h1>
      </header>
      
      <main className="container mx-auto max-w-md p-4 space-y-8">
        {isGameStarted ? (
          <ActiveGame />
        ) : (
          <>
            <section>
              <PlayerRegistration />
            </section>

            <section className="pt-8 border-t border-slate-200">
              <HostDashboard />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;