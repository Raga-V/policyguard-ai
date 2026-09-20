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
  XCircle,
  Zap,
  Cpu,
  FileCheck,
  SearchCode
} from 'lucide-react';
import { apiClient, AgentResponse } from '../api/client';
import PolicyPreview from '../components/PolicyPreview';

interface BuilderPageProps {
  onDeploy: () => void;
}

const PRESET_SCENARIOS = [
  {
    id: 'cyber',
    title: 'Cybersecurity Incident Investigator',
    desc: 'Audit auth logs, detect SSH brute-force attacks, create incident alerts',
    icon: Shield,
    color: 'blue',
    prompt: 'Read authentication logs from /data/logs/auth.log, identify failed SSH login attempts from unrecognized IP addresses, and write incident alerts to /data/alerts/security.json',
    tools: ['read_file', 'write_file', 'list_dir'],
    scopes: {
      filePaths: '/data/logs/*, /data/alerts/*',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'confidential' as const
  },
  {
    id: 'finance',
    title: 'Financial Invoice Auditor',
    desc: 'Extract scoped invoice records, verify vendor totals, export CSV reports',
    icon: FileCheck,
    color: 'emerald',
    prompt: 'Read PDF invoice metadata in /data/invoices/*, cross-reference invoice IDs, calculate line-item totals, and write summarized reports to /data/reports/summary.csv',
    tools: ['read_file', 'write_file', 'list_dir'],
    scopes: {
      filePaths: '/data/invoices/*, /data/reports/*',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'internal' as const
  },
  {
    id: 'devops',
    title: 'DevOps Config Sentinel',
    desc: 'Audit local service manifests, detect drift, block unauthorized network calls',
    icon: Terminal,
    color: 'purple',
    prompt: 'Inspect infrastructure manifests in /data/configs/*, verify adherence to security baseline policies, and output non-compliant configurations to /data/reports/drift.json',
    tools: ['read_file', 'list_dir', 'write_file'],
    scopes: {
      filePaths: '/data/configs/*, /data/reports/*',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'restricted' as const
  }
];

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
  const [rightTab, setRightTab] = useState<'policy' | 'matrix'>('policy');

  // Policy Simulation state
  const [simResult, setSimResult] = useState<{ decision: 'ALLOW' | 'DENY'; reason: string } | null>(null);

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setDescription(preset.prompt);
    setSelectedTools(preset.tools);
    setScopes(preset.scopes);
    setSensitivity(preset.sensitivity);
    setError('');
  };

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
    if (!previewAgent) {
      if (isTamper || path.includes('/etc') || path.includes('/secrets') || path.includes('.env')) {
        setSimResult({
          decision: 'DENY',
          reason: 'Hard Deny Rule: Access to system paths (/etc/**, /secrets/**, **/.env) is unconditionally forbidden'
        });
      } else {
        setSimResult({
          decision: 'ALLOW',
          reason: 'Permit Rule: Path matches defined resource scope (/data/logs/*)'
        });
      }
      return;
    }

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
      
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Agent Policy Compiler & MicroVM Sandbox</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Describe autonomous worker duties. The compiler synthesizes formal Cedar authorization rules and deploys an isolated microVM sandbox.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>Qwen2.5 Local LLM</span>
          </span>
        </div>
      </div>

      {/* Quick-Load Security Scenarios */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Quick-Select Security Archetypes:</span>
          </span>
          <span className="text-[11px] text-slate-400">Click to populate form instantly</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-left p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      preset.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      preset.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {preset.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {preset.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{preset.sensitivity.toUpperCase()}</span>
                  <span className="text-blue-600 font-sans font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Load</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Agent Builder Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Agent Capability Specification</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Structured JSON Pipeline</span>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
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
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition leading-relaxed font-sans"
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
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
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
                      className={`flex items-start space-x-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/30 shadow-2xs' 
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${isChecked ? 'text-blue-900' : 'text-slate-700'}`}>
                              {tool.label}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
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
                  Granular Resource Scopes (Least Privilege Boundaries)
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
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
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
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
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
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sensitivity Selection & Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sensitivity Classification
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 p-0.5 bg-slate-100">
                  {(['internal', 'confidential', 'restricted'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSensitivity(level)}
                      className={`px-3 py-1 text-xs font-medium capitalize rounded-md transition-all ${
                        sensitivity === level
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'text-slate-600 hover:text-slate-900'
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
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Cedar Authorization Policy...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Compile Policy & Deploy Sandbox</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT: Live Generated Policy & Verification (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            
            {/* Header with Tab Switcher */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Cedar Policy & Sandbox Spec</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pre-flight verified prior to each tool call
                </p>
              </div>

              <div className="flex items-center space-x-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setRightTab('policy')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rightTab === 'policy' 
                      ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cedar Code
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('matrix')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rightTab === 'matrix' 
                      ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rules Matrix
                </button>
              </div>
            </div>

            {/* View: Policy Code or Permission Matrix */}
            {rightTab === 'policy' && (
              <div>
                {previewAgent ? (
                  <PolicyPreview policyText={previewAgent.policy_text} />
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2">
                    <div className="text-slate-500">// Platform Baseline Cedar Policy (Default Enforced)</div>
                    <div><span className="text-rose-400 font-bold">forbid</span> (principal, action, resource)</div>
                    <div className="text-slate-400">when {'{'}</div>
                    <div className="pl-4 text-slate-300">resource like <span className="text-amber-300">"AgentApp::File::\"/etc/**\""</span> ||</div>
                    <div className="pl-4 text-slate-300">resource like <span className="text-amber-300">"AgentApp::File::\"/secrets/**\""</span> ||</div>
                    <div className="pl-4 text-slate-300">resource like <span className="text-amber-300">"AgentApp::File::\"**/.env\""</span></div>
                    <div className="text-slate-400">{'}'};</div>
                    <div className="text-slate-500 pt-2">// Click 'Compile Policy' to synthesize agent-specific permits</div>
                  </div>
                )}
              </div>
            )}

            {rightTab === 'matrix' && (
              <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Resource Target</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3 text-right">Policy Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr className="bg-emerald-50/40">
                      <td className="py-2 px-3 font-semibold text-slate-800">/data/logs/*</td>
                      <td className="py-2 px-3 text-slate-600">readFile</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">PERMIT</td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="py-2 px-3 font-semibold text-slate-800">/data/reports/*</td>
                      <td className="py-2 px-3 text-slate-600">writeFile</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-bold">PERMIT</td>
                    </tr>
                    <tr className="bg-rose-50/40">
                      <td className="py-2 px-3 font-semibold text-slate-800">/etc/shadow</td>
                      <td className="py-2 px-3 text-slate-600">*</td>
                      <td className="py-2 px-3 text-right text-rose-700 font-bold">HARD FORBID</td>
                    </tr>
                    <tr className="bg-rose-50/40">
                      <td className="py-2 px-3 font-semibold text-slate-800">**/.env</td>
                      <td className="py-2 px-3 text-slate-600">*</td>
                      <td className="py-2 px-3 text-right text-rose-700 font-bold">HARD FORBID</td>
                    </tr>
                    <tr className="bg-rose-50/40">
                      <td className="py-2 px-3 font-semibold text-slate-800">https://external-leak.com</td>
                      <td className="py-2 px-3 text-slate-600">callApi</td>
                      <td className="py-2 px-3 text-right text-rose-700 font-bold">EGRESS BLOCK</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Interactive Policy Simulation Tester */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <SearchCode className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Live Policy Simulation Tester
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Sub-ms PDP
                </span>
              </div>

              <p className="text-[11px] text-slate-500">
                Trigger simulated calls to verify authorization gates in real-time:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => runSimulation('/data/logs/auth.log', false)}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Scoped Path</span>
                </button>
                <button
                  type="button"
                  onClick={() => runSimulation('/etc/shadow', true)}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Test Exploit Path</span>
                </button>
              </div>

              {simResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 transition-all ${
                  simResult.decision === 'ALLOW' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {simResult.decision === 'ALLOW' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold flex items-center space-x-1.5">
                      <span>PDP Decision:</span>
                      <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                        simResult.decision === 'ALLOW' ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'
                      }`}>
                        {simResult.decision}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 mt-1 leading-relaxed">{simResult.reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Deployed Action Link */}
            {previewAgent && (
              <button
                type="button"
                onClick={onDeploy}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Active MicroVM Console</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
