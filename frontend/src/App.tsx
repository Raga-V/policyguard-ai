import { useState, useEffect } from 'react';
import { 
  Shield, 
  Terminal, 
  Users, 
  Activity, 
  Cpu, 
  Lock, 
  Server,
  Zap
} from 'lucide-react';
import BuilderPage from './pages/BuilderPage';
import AgentsPage from './pages/AgentsPage';
import AuditPage from './pages/AuditPage';
import { apiClient } from './api/client';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'agents' | 'audit'>('build');
  const [agentCount, setAgentCount] = useState<number>(0);
  const [systemHealth, setSystemHealth] = useState<{
    ollama: boolean;
    cedar: boolean;
    backend: boolean;
  }>({
    ollama: true,
    cedar: true,
    backend: true
  });

  const checkHealth = async () => {
    try {
      const agents = await apiClient.listAgents().catch(() => []);
      setAgentCount(agents.length);
    } catch {
      // Keep running
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-cyber-950 text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Telemetry / Status Bar */}
      <div className="bg-[#05080E] border-b border-white/[0.06] text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium">Policy Engine:</span>
              <span className="text-emerald-400 font-mono">Cedar PDP (Active)</span>
            </span>
            <span className="hidden sm:inline-flex text-slate-600">|</span>
            <span className="hidden sm:flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inference:</span>
              <span className="text-cyan-400 font-mono">Qwen2.5:7b (Local GGUF)</span>
            </span>
            <span className="hidden md:inline-flex text-slate-600">|</span>
            <span className="hidden md:flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Air-Gap Mode:</span>
              <span className="text-amber-400 font-mono">Zero Egress</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded text-[11px] font-mono">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Hackathon Demo Mode</span>
            </span>
            <span className="flex items-center space-x-1 text-slate-500 text-[11px]">
              <Server className="w-3 h-3" />
              <span>Docker Sandbox Isolator</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-cyber-900/90 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-cyber-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-white">
                  PolicyGuard<span className="text-cyan-400">.AI</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  v1.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Air-Gapped, Policy-Governed Autonomous Agent Platform
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1.5 bg-cyber-950/80 p-1.5 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setActiveTab('build')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'build'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Agent Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'agents'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Active Sandboxes</span>
              {agentCount > 0 && (
                <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'agents' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400'
                }`}>
                  {agentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'audit'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Policy Audit Trail</span>
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

      {/* Modern Footer */}
      <footer className="border-t border-white/[0.06] bg-[#05080E] py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>PolicyGuard AI Engine · Enterprise MicroVM Isolation · Zero Cloud Dependencies</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
            <span>Cedar Auth v3</span>
            <span>·</span>
            <span>Ollama Local</span>
            <span>·</span>
            <span>FastAPI Control Plane</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
