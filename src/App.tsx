import PlayerRegistration from './components/PlayerRegistration';
import HostDashboard from './components/HostDashboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Bossel-Vibe</h1>
      </header>
      
      <main className="container mx-auto max-w-md p-4 space-y-8">
        {/* For this phase, we render both views stacked, or normally there would be a router. 
            We'll show Registration as primary, and Host Dashboard below for testing. */}
        <section>
          <PlayerRegistration />
        </section>

        <section className="pt-8 border-t border-slate-200">
          <HostDashboard />
        </section>
      </main>
    </div>
  );
}

export default App;