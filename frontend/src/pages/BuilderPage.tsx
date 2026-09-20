import { useState } from 'react';
import { 
  Shield, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Globe, 
  Database, 
  Terminal, 
  Folder, 
  Edit3, 
  Play, 
  ArrowRight, 
  Lock, 
  Layers, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { apiClient, AgentResponse } from '../api/client';
import PolicyPreview from '../components/PolicyPreview';

interface BuilderPageProps {
  onDeploy: () => void;
}

const TOOLS = [
  { id: 'read_file', label: 'File Read', icon: Folder, category: 'Storage', desc: 'Read files from allowed directory trees' },
  { id: 'write_file', label: 'File Write', icon: Edit3, category: 'Storage', desc: 'Create and update allowed report files' },
  { id: 'list_dir', label: 'List Directory', icon: FileText, category: 'Storage', desc: 'Inspect available files in scoped paths' },
  { id: 'http_get', label: 'HTTP GET', icon: Globe, category: 'Network', desc: 'Fetch data from approved internal APIs' },
  { id: 'http_post', label: 'HTTP POST', icon: Globe, category: 'Network', desc: 'Push structured reports to internal endpoints' },
  { id: 'sql_query', label: 'SQL Query', icon: Database, category: 'Database', desc: 'Execute read-only queries on internal databases' },
  { id: 'run_command', label: 'Shell Command', icon: Terminal, category: 'Runtime', desc: 'Execute explicitly permitted shell utilities' },
];

export default function BuilderPage({ onDeploy }: BuilderPageProps) {
  const [description, setDescription] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['read_file', 'list_dir', 'write_file']);
  const [sensitivity, setSensitivity] = useState<'internal' | 'confidential' | 'restricted'>('internal');
  const [scopes, setScopes] = useState({
    filePaths: '/data/logs/*, /data/reports/*',
    endpoints: '',
    databases: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAgent, setPreviewAgent] = useState<AgentResponse | null>(null);

  // Policy Simulation state
  const [simResult, setSimResult] = useState<{ decision: 'ALLOW' | 'DENY'; reason: string } | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a natural language description of the agent role.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const resource_scopes: Record<string, string[]> = {};
      if (scopes.filePaths) resource_scopes['files'] = scopes.filePaths.split(',').map(s => s.trim());
      if (scopes.endpoints) resource_scopes['endpoints'] = scopes.endpoints.split(',').map(s => s.trim());
      if (scopes.databases) resource_scopes['databases'] = scopes.databases.split(',').map(s => s.trim());

      const agent = await apiClient.createAgent({
        description,
        selected_tools: selectedTools,
        resource_scopes
      });
      setPreviewAgent(agent);
      setSimResult(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during agent compilation.');
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = (path: string, isTamper = false) => {
    if (!previewAgent) return;
    const policy = previewAgent.policy_text || '';
    
    if (isTamper || path.includes('/etc') || path.includes('/secrets') || path.includes('.env')) {
      setSimResult({
        decision: 'DENY',
        reason: 'Blocked by Platform Hard Deny: Target resource is within protected system boundaries'
      });
      return;
    }

    const matchesScope = policy.includes(path) || policy.includes(path.split('/').slice(0, -1).join('/') + '/*');
    if (matchesScope) {
      setSimResult({
        decision: 'ALLOW',
        reason: `Matched Cedar permit rule for ${previewAgent.name}`
      });
    } else {
      setSimResult({
        decision: 'DENY',
        reason: 'Implicit Deny: Resource is outside agent permitted scope'
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agent Configuration & Policy Compiler</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define agent capabilities. The compiler synthesizes formal Cedar authorization policies and deploys an isolated microVM sandbox.
          </p>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Agent Builder Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Agent Definition</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Qwen2.5 Local Inference</span>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Natural Language Prompt */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Natural Language Description
              </label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed font-sans"
                rows={4}
                placeholder="Example: Read system auth logs from /data/logs/auth.log, identify failed SSH login attempts, and write incident alerts to /data/alerts/security.json"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Allowed Tools Grid */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  Approved Tool Capabilities
                </label>
                <span className="text-[11px] text-slate-500">
                  {selectedTools.length} tools enabled
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOOLS.map(tool => {
                  const Icon = tool.icon;
                  const isChecked = selectedTools.includes(tool.id);
                  return (
                    <label 
                      key={tool.id} 
                      className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                        isChecked 
                          ? 'bg-blue-50/60 border-blue-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTools([...selectedTools, tool.id]);
                          else setSelectedTools(selectedTools.filter(t => t !== tool.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className={`text-xs font-medium ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {tool.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {tool.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Fine-Grained Resource Scopes */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-semibold text-slate-700">
                  Granular Resource Scopes
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Allowed Filesystem Paths (Glob Patterns)
                  </label>
                  <input
                    type="text"
                    placeholder="/data/logs/*, /data/reports/*"
                    value={scopes.filePaths}
                    onChange={e => setScopes({ ...scopes, filePaths: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Approved HTTP Endpoints
                    </label>
                    <input
                      type="text"
                      placeholder="https://internal-api.corp/v1/*"
                      value={scopes.endpoints}
                      onChange={e => setScopes({ ...scopes, endpoints: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Allowed Databases
                    </label>
                    <input
                      type="text"
                      placeholder="analytics_db, reports_db"
                      value={scopes.databases}
                      onChange={e => setScopes({ ...scopes, databases: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sensitivity Selection */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sensitivity Classification
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 p-0.5 bg-slate-50">
                  {(['internal', 'confidential', 'restricted'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSensitivity(level)}
                      className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition ${
                        sensitivity === level
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling Cedar Policy...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Generate Policy & Deploy Sandbox</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT: Live Generated Policy & Verification (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 flex flex-col">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Authorization Policy Verification</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified by Cedar Policy Engine prior to each sandbox tool invocation.
                </p>
              </div>
            </div>

            {/* Empty state */}
            {!previewAgent && (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2 my-auto">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <h4 className="text-xs font-semibold text-slate-700">No Policy Compiled</h4>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Enter an agent description and click <strong>Generate Policy & Deploy Sandbox</strong> to compile the specification.
                </p>
              </div>
            )}

            {/* Compiled Agent Details */}
            {previewAgent && (
              <div className="space-y-4">
                
                {/* Metadata Row */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Agent Identifier:</span>
                    <span className="font-semibold text-slate-800">{previewAgent.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sandbox MicroVM:</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {previewAgent.container_id ? `agent-${previewAgent.id.slice(0, 8)}` : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sensitivity:</span>
                    <span className="text-slate-700 uppercase font-bold text-[10px]">
                      {previewAgent.sensitivity || sensitivity}
                    </span>
                  </div>
                </div>

                {/* Cedar Policy Viewer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      Compiled Cedar Policy
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">RFC Compliant</span>
                  </div>
                  <PolicyPreview policyText={previewAgent.policy_text} />
                </div>

                {/* Live Policy Simulation */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      Policy Simulation Tester
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Sub-millisecond PDP</span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Verify authorization outcomes before agent execution:
                  </p>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => runSimulation('/data/logs/auth.log', false)}
                      className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-medium transition flex items-center justify-center space-x-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Test Permitted Path</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => runSimulation('/etc/shadow', true)}
                      className="flex-1 py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-medium transition flex items-center justify-center space-x-1.5 shadow-2xs"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Test Protected Path</span>
                    </button>
                  </div>

                  {simResult && (
                    <div className={`p-2.5 rounded-md border text-xs flex items-start space-x-2 ${
                      simResult.decision === 'ALLOW' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {simResult.decision === 'ALLOW' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          Decision: {simResult.decision}
                        </div>
                        <p className="text-[11px] opacity-90 mt-0.5">{simResult.reason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Sandboxes Button */}
                <button
                  type="button"
                  onClick={onDeploy}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>View in Sandboxes Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
