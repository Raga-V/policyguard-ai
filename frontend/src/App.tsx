import { useState, useEffect } from 'react';
import { 
  Shield, 
  Terminal, 
  Users, 
  Activity, 
  Cpu, 
  Lock, 
  Server,
  CheckCircle2
} from 'lucide-react';
import BuilderPage from './pages/BuilderPage';
import AgentsPage from './pages/AgentsPage';
import AuditPage from './pages/AuditPage';
import ArchitectureFlow from './components/ArchitectureFlow';
import { apiClient } from './api/client';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'agents' | 'audit'>('build');
  const [agentCount, setAgentCount] = useState<number>(0);

  const fetchAgentCount = async () => {
    try {
      const agents = await apiClient.listAgents().catch(() => []);
      setAgentCount(agents.length);
    } catch {
      // Keep running
    }
  };

  useEffect(() => {
    fetchAgentCount();
    const interval = setInterval(fetchAgentCount, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Top High-Tech Status Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 text-xs py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 font-medium">Policy Engine:</span>
              <span className="text-emerald-400 font-mono font-semibold">Cedar PDP v3 (Active)</span>
            </span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="hidden sm:flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Model Runtime:</span>
              <span className="text-blue-300 font-mono font-semibold">Qwen2.5:7b (Local GGUF)</span>
            </span>
            <span className="hidden md:inline text-slate-700">|</span>
            <span className="hidden md:flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Network Egress:</span>
              <span className="text-slate-200 font-mono font-semibold">Air-Gapped / Isolated</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Zero-Leak Enforced</span>
            </span>
            <span className="hidden lg:flex items-center space-x-1 text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
              <Server className="w-3 h-3 text-purple-400" />
              <span>MicroVM Sandbox</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform Details */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  PolicyGuard AI
                </span>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  Zero-Trust
                </span>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                  Air-Gapped
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Offline Policy-Governed Autonomous Agent Infrastructure
              </p>
            </div>
          </div>

          {/* Segmented Navigation Switcher */}
          <nav className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('build')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'build'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Agent Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'agents'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Active Sandboxes</span>
              {agentCount > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'agents' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {agentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </nav>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Architecture Pipeline Flow Banner */}
        <ArchitectureFlow />

        {/* Tab Pages */}
        {activeTab === 'build' && <BuilderPage onDeploy={() => setActiveTab('agents')} />}
        {activeTab === 'agents' && <AgentsPage onBuildNew={() => setActiveTab('build')} />}
        {activeTab === 'audit' && <AuditPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>PolicyGuard AI · Workload-Level MicroVM Isolation · Zero Cloud Dependencies</span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
            <span>Cedar PDP v3</span>
            <span>·</span>
            <span>Ollama Offline</span>
            <span>·</span>
            <span>FastAPI Core</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
