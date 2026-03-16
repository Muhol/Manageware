"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Shield,
    Search,
    Filter,
    RefreshCcw,
    User,
    Clock,
    Activity,
    FileText,
    ChevronRight,
    Loader2
} from "lucide-react";
import { apiFetch, authApi } from "@/lib/api";

import { Modal } from "@/components/Modal";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [resourceFilter, setResourceFilter] = useState("ALL");
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);

    useEffect(() => {
        fetchLogs();
        authApi.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
    }, []);

    const isAdmin = currentUser?.role?.name === "Administrator" || currentUser?.role?.name === "IT Specialist";

    if (currentUser && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Security Clearance Required</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Access to the immutable system audit trail is restricted to Global Administrators and IT Security Specialists.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/admin/audit-logs");
            setLogs(data);
        } catch (err) {
            console.error("Error fetching audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter = resourceFilter === "ALL" || log.resource_type === resourceFilter;
        return matchesSearch && matchesFilter;
    });

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes("APPROVE") || a.includes("REGISTER") || a.includes("CREATE") || a.includes("SUCCESS")) 
            return "text-green-600 bg-green-50 border-green-100";
        if (a.includes("REJECT") || a.includes("DELETE") || a.includes("DEACTIVATE")) 
            return "text-red-600 bg-red-50 border-red-100";
        if (a.includes("UPDATE") || a.includes("SYNC") || a.includes("CHANGE")) 
            return "text-amber-600 bg-amber-50 border-amber-100";
        if (a.includes("LOGIN") || a.includes("AUTH")) 
            return "text-indigo-600 bg-indigo-50 border-indigo-100";
        if (a.includes("DOWNLOAD")) 
            return "text-cyan-600 bg-cyan-50 border-cyan-100";
        return "text-blue-600 bg-blue-50 border-blue-100";
    };

    const resourceTypes = ["ALL", "ASSET", "PURCHASE_REQUEST", "PURCHASE_ORDER", "INVENTORY", "USER", "PROPERTY", "ASSET_TYPE", "AUTH"];

    if (loading && logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                <p className="text-gray-500 font-bold animate-pulse">Loading Audit Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center">
                        <Shield className="h-6 w-6 mr-3 text-[var(--wine-red)]" />
                        SYSTEM AUDIT
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Immutable registry of all hardware transactions and system events.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center justify-center px-6 py-4 bg-white border border-[var(--cool-silver-dark)] text-gray-900 font-black uppercase tracking-widest hover:bg-[var(--cool-silver)] transition-all rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                >
                    <RefreshCcw className={`h-4 w-4 mr-2.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            <div className="bg-white p-6 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by action, user, or resource..."
                            className="w-full pl-12 pr-4 py-4 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--wine-red)] transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-2xl px-4 py-2">
                        <Filter className="h-4 w-4 text-gray-400 mr-2" />
                        <select
                            value={resourceFilter}
                            onChange={(e) => setResourceFilter(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-gray-600 py-2 cursor-pointer outline-none"
                        >
                            {resourceTypes.map(type => (
                                <option key={type} value={type}>{type.replace("_", " ")}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--cool-silver-dark)]">
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Timestamp</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized User</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operation</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Type</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Details</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right pr-4">Trace</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--cool-silver-dark)]/50">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[var(--cool-silver)]/10 transition-colors group">
                                    <td className="py-5 pl-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-8 w-8 rounded-xl bg-[var(--champagne-gold)]/20 flex items-center justify-center border border-[var(--champagne-gold)]/30">
                                                <User className="h-4 w-4 text-[var(--champagne-gold-dark)]" />
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 italic">{log.user?.name || "System"}</span>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest ${getActionColor(log.action)}`}>
                                            {log.action.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="py-5">
                                        <div className="flex items-center space-x-2 text-gray-600">
                                            <FileText className="h-3.5 w-3.5" />
                                            <span className="text-xs font-black uppercase tracking-tight">{log.resource_type}</span>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <p className="text-xs font-medium text-gray-500 max-w-xs truncate">
                                            {log.details || "No secondary data available."}
                                        </p>
                                    </td>
                                    <td className="py-5 text-right pr-4">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="p-2 text-gray-400 hover:text-[var(--wine-red)] hover:bg-white rounded-lg transition-all border border-transparent hover:border-[var(--cool-silver-dark)]"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-20">
                            <Activity className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No audit matches found in the registry</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { 
                        label: "Security Events", 
                        value: logs.filter(l => l.resource_type === "AUTH" || l.action.toLowerCase().includes("password")).length, 
                        sub: "Identity Actions", 
                        color: "var(--wine-red)" 
                    },
                    { 
                        label: "Hardware Lifecycle", 
                        value: logs.filter(l => ["ASSET", "INVENTORY", "ASSET_TYPE"].includes(l.resource_type)).length, 
                        sub: "Modifications", 
                        color: "var(--champagne-gold-dark)" 
                    },
                    { 
                        label: "Procurement Ledger", 
                        value: logs.filter(l => ["PURCHASE_REQUEST", "PURCHASE_ORDER"].includes(l.resource_type)).length, 
                        sub: "Financial Events", 
                        color: "var(--wine-red-light)" 
                    },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 border border-[var(--cool-silver-dark)] rounded-3xl shadow-xl flex items-center justify-between group hover:shadow-2xl transition-all">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1">{stat.sub}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: stat.color }}>
                            <Activity className="h-6 w-6" style={{ color: stat.color }} />
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Operation Trace Details"
            >
                {selectedLog && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[var(--cool-silver)]/30 rounded-2xl">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction ID</p>
                                <p className="text-xs font-black text-gray-900 font-mono">{selectedLog.id}</p>
                            </div>
                            <div className="p-4 bg-[var(--cool-silver)]/30 rounded-2xl">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Timestamp</p>
                                <p className="text-xs font-black text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-5 border border-[var(--cool-silver-dark)] rounded-2xl bg-white shadow-sm">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-[var(--wine-red)]" />
                                Audit Metadata
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Authorized User</span>
                                    <span className="text-xs font-black text-gray-900 italic">{selectedLog.user?.name || "System"}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Operation</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${getActionColor(selectedLog.action)}`}>
                                        {selectedLog.action}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Resource</span>
                                    <span className="text-xs font-black text-gray-900">{selectedLog.resource_type}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Contextual Details</h3>
                            <div className="p-4 bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800">
                                <pre className="text-[10px] font-mono text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                    {selectedLog.details || "No secondary JSON data captured for this transaction."}
                                </pre>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedLog(null)}
                            className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl"
                        >
                            Return to Ledger
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
