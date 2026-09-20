import { useState } from 'react';
import { Shield, Hammer, Users, Activity } from 'lucide-react';
import BuilderPage from './pages/BuilderPage';
import AgentsPage from './pages/AgentsPage';
import AuditPage from './pages/AuditPage';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'agents' | 'audit'>('build');

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 font-sans">
      <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              PolicyGuard AI
            </span>
          </div>
          <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('build')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'build' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>Build Agent</span>
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'agents' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Agents</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'build' && <BuilderPage onDeploy={() => setActiveTab('agents')} />}
        {activeTab === 'agents' && <AgentsPage onBuildNew={() => setActiveTab('build')} />}
        {activeTab === 'audit' && <AuditPage />}
      </main>
    </div>
  );
}

export default App;
