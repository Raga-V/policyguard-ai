import { useState, useEffect } from 'react';
import { 
  Shield, 
  Terminal, 
  Users, 
  Activity, 
  Cpu, 
  Lock, 
  Server
} from 'lucide-react';
import BuilderPage from './pages/BuilderPage';
import AgentsPage from './pages/AgentsPage';
import AuditPage from './pages/AuditPage';
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
      {/* Top Telemetry Header Bar */}
      <div className="bg-white border-b border-slate-200 text-xs py-2 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-500 font-medium">Policy Engine:</span>
              <span className="text-slate-800 font-mono font-medium">Cedar PDP (Active)</span>
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500 font-medium">Model Runtime:</span>
              <span className="text-slate-800 font-mono font-medium">Qwen2.5:7b (Local)</span>
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Network Egress:</span>
              <span className="text-slate-800 font-mono font-medium">Air-Gapped / Isolated</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <Server className="w-3.5 h-3.5 text-slate-600" />
              <span>Containerized Sandboxes</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  PolicyGuard AI
                </span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Offline Policy-Governed Autonomous Agent Platform
              </p>
            </div>
          </div>

          {/* Clean Segmented Tab Navigation */}
          <nav className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('build')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'build'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>Agent Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'agents'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Sandboxes</span>
              {agentCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                  activeTab === 'agents' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {agentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Trail</span>
            </button>
          </nav>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'build' && <BuilderPage onDeploy={() => setActiveTab('agents')} />}
        {activeTab === 'agents' && <AgentsPage onBuildNew={() => setActiveTab('build')} />}
        {activeTab === 'audit' && <AuditPage />}
      </main>

      {/* Enterprise Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>PolicyGuard AI Engine · Hardware-Level MicroVM Isolation · Zero Cloud Dependencies</span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
            <span>Cedar Auth v3</span>
            <span>·</span>
            <span>Ollama Offline</span>
            <span>·</span>
            <span>FastAPI Control Plane</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
