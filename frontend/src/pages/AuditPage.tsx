import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Users, Filter, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient, AuditRecord, AuditStats } from '../api/client';

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [filterAgent, setFilterAgent] = useState('');
  const [filterDecision, setFilterDecision] = useState('All');
  const [limit, setLimit] = useState(50);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock stats
      setStats({
        total: 1245,
        allow_count: 1180,
        deny_count: 65,
        by_agent: { 'agent-1': 800, 'agent-2': 445 }
      });

      // Mock records
      const mockRecords: AuditRecord[] = Array.from({ length: 15 }).map((_, i) => ({
        id: Date.now() - i,
        agent_id: i % 3 === 0 ? 'agent-2' : 'agent-1',
        event_type: 'TOOL_CALL',
        tool_name: i % 4 === 0 ? 'write_file' : 'read_file',
        resource: i % 4 === 0 ? '/data/reports/out.csv' : '/data/invoices/inv_23.pdf',
        policy_decision: i === 2 || i === 7 ? 'DENY' : 'ALLOW',
        policy_reason: i === 2 || i === 7 ? 'Implicit deny: no matching permit rule' : 'Permit rule #1 matched',
        latency_ms: Math.floor(Math.random() * 150) + 10,
        timestamp: new Date(Date.now() - i * 60000).toISOString()
      }));
      setRecords(mockRecords);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [filterAgent, filterDecision, limit]);

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Activity className="w-4 h-4 text-blue-400" />
          <span>Real-time monitoring active</span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={stats?.total || 0} icon={<Activity className="w-5 h-5 text-blue-400" />} color="blue" />
        <StatCard title="Allowed" value={stats?.allow_count || 0} icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />} color="emerald" />
        <StatCard title="Denied" value={stats?.deny_count || 0} icon={<ShieldAlert className="w-5 h-5 text-red-400" />} color="red" />
        <StatCard title="Unique Agents" value={Object.keys(stats?.by_agent || {}).length} icon={<Users className="w-5 h-5 text-purple-400" />} color="purple" />
      </div>

      {/* FILTERS */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2 text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Agents</option>
          {Object.keys(stats?.by_agent || {}).map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterDecision}
          onChange={e => setFilterDecision(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Decisions</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
        </select>

        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
        >
          <option value={50}>Limit: 50</option>
          <option value={100}>Limit: 100</option>
          <option value={500}>Limit: 500</option>
        </select>

        <div className="flex-1" />
        
        <button onClick={fetchData} className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-900/50 border-b border-gray-700 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Tool</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium text-right">Latency</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {records.map(record => (
                <React.Fragment key={record.id}>
                  <tr 
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                    className={`cursor-pointer transition hover:bg-gray-700/50 ${record.policy_decision === 'DENY' ? 'bg-red-900/10' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400">{timeAgo(record.timestamp)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.agent_id}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{record.event_type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-400 text-xs">{record.tool_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300 max-w-[200px] truncate" title={record.resource}>
                      {record.resource}
                    </td>
                    <td className="px-4 py-3">
                      {record.policy_decision === 'ALLOW' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs font-bold border border-emerald-400/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span>ALLOW</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-400 bg-red-400/10 px-2 py-0.5 rounded text-xs font-bold border border-red-400/20">
                          <ShieldAlert className="w-3 h-3" />
                          <span>DENY</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">{record.latency_ms}ms</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {expandedId === record.id ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr className={`${record.policy_decision === 'DENY' ? 'bg-red-900/5' : 'bg-gray-900/30'}`}>
                      <td colSpan={8} className="px-4 py-4 border-b border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Policy Evaluation</h4>
                            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 font-mono text-sm">
                              <p className="text-gray-400">Reason:</p>
                              <p className={record.policy_decision === 'ALLOW' ? 'text-emerald-400' : 'text-red-400'}>
                                {record.policy_reason}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Raw Event Data</h4>
                            <pre className="bg-gray-950 p-3 rounded-lg border border-gray-800 font-mono text-xs text-gray-300 overflow-x-auto">
                              {JSON.stringify(record, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number | string, icon: React.ReactNode, color: string }) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
  };
  
  return (
    <div className={`p-5 rounded-xl border ${bgColors[color]} flex items-center justify-between`}>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500/10`}>
        {icon}
      </div>
    </div>
  );
}
