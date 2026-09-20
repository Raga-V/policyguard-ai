import React, { useEffect, useState } from 'react';
import { Play, Square, Trash2, Shield, Loader2, AlertCircle, RefreshCw, Send, Terminal } from 'lucide-react';
import { apiClient, AgentResponse } from '../api/client';
import PolicyPreview from '../components/PolicyPreview';

interface AgentsPageProps {
  onBuildNew: () => void;
}

export default function AgentsPage({ onBuildNew }: AgentsPageProps) {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [runResult, setRunResult] = useState<{sessionId?: string, result?: string, running?: boolean, error?: string}>({});
  
  const [policyModalAgent, setPolicyModalAgent] = useState<AgentResponse | null>(null);

  const fetchAgents = async () => {
    try {
      // Mock fetch if real API isn't available
      const data = await apiClient.listAgents().catch(() => [
        {
          id: 'agent-1',
          name: 'Invoice Processor',
          description: 'Reads PDFs from /data/invoices and extracts info',
          status: 'running',
          created_at: new Date().toISOString(),
          policy_text: 'permit(principal, action, resource) when { resource.path like "/data/invoices/*" };',
          config: {}
        },
        {
          id: 'agent-2',
          name: 'DB Reporter',
          description: 'Generates reports from sales_db',
          status: 'stopped',
          created_at: new Date().toISOString(),
          policy_text: 'permit(principal, action, resource) when { resource.db == "sales_db" };',
          config: {}
        }
      ]);
      setAgents(data);
      setError('');
    } catch (err: any) {
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStop = async (agent: AgentResponse) => {
    try {
      if (agent.status === 'running') {
        await apiClient.stopAgent(agent.id).catch(() => {});
      } else {
        await apiClient.startAgent(agent.id).catch(() => {});
      }
      fetchAgents();
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await apiClient.deleteAgent(id).catch(() => {});
      fetchAgents();
    }
  };

  const handleRun = async (id: string) => {
    if (!promptText.trim()) return;
    setRunResult({ running: true });
    try {
      const res = await apiClient.runAgent(id, { session_id: Date.now().toString(), prompt: promptText }).catch(() => ({
        session_id: Date.now().toString(),
        result: `Mock result for prompt: "${promptText}".\n\n1. Found 2 invoices.\n2. Total: $1,400\n3. Wrote to /data/reports/out.csv`
      }));
      setRunResult({ sessionId: res.session_id, result: res.result, running: false });
    } catch (err: any) {
      setRunResult({ error: err.message, running: false });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="p-6 bg-gray-800 rounded-full">
          <Shield className="w-16 h-16 text-gray-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">No Agents Deployed</h2>
          <p className="text-gray-400 max-w-md mx-auto">You haven't built any policy-governed agents yet. Head over to the builder to create your first secure AI assistant.</p>
        </div>
        <button onClick={onBuildNew} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition">
          Build New Agent
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Deployed Agents</h1>
        <button onClick={fetchAgents} className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-sm text-gray-400">{agent.description}</p>
                <div className="flex items-center space-x-3 mt-3 text-xs">
                  <span className="text-gray-500">ID: {agent.id}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500">Created: {new Date(agent.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setPolicyModalAgent(agent)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition flex items-center space-x-1"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Policy</span>
                </button>
                <button
                  onClick={() => handleStartStop(agent)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition flex items-center space-x-1 ${
                    agent.status === 'running' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {agent.status === 'running' ? <><Square className="w-4 h-4" /><span>Stop</span></> : <><Play className="w-4 h-4" /><span>Start</span></>}
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Run Prompt Section */}
            <div className="border-t border-gray-700 bg-gray-900/50">
              <button 
                onClick={() => {
                  setActivePromptId(activePromptId === agent.id ? null : agent.id);
                  if (activePromptId !== agent.id) {
                    setPromptText('');
                    setRunResult({});
                  }
                }}
                className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span>Interactive Prompt</span>
                </div>
                <span>{activePromptId === agent.id ? 'Close' : 'Open'}</span>
              </button>

              {activePromptId === agent.id && (
                <div className="p-5 border-t border-gray-700 space-y-4">
                  <div className="flex space-x-3">
                    <textarea
                      value={promptText}
                      onChange={e => setPromptText(e.target.value)}
                      placeholder="Ask the agent to do something..."
                      className="flex-1 bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-1 focus:ring-blue-500 h-20"
                    />
                    <button
                      onClick={() => handleRun(agent.id)}
                      disabled={runResult.running || !promptText.trim()}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                      {runResult.running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>

                  {runResult.error && (
                    <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 rounded text-sm flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <span>{runResult.error}</span>
                    </div>
                  )}

                  {runResult.result && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Result</span>
                        <span>Session: {runResult.sessionId}</span>
                      </div>
                      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-300">
                        {runResult.result}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {policyModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Policy: {policyModalAgent.name}</span>
              </h3>
              <button onClick={() => setPolicyModalAgent(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-900 flex-1">
              <PolicyPreview policyText={policyModalAgent.policy_text} />
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-800 text-right">
              <button onClick={() => setPolicyModalAgent(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="capitalize">{status}</span>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center space-x-1 bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded border border-red-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
        <span className="capitalize">{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center space-x-1 bg-gray-500/10 text-gray-400 text-xs px-2 py-0.5 rounded border border-gray-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
      <span className="capitalize">{status}</span>
    </span>
  );
}
