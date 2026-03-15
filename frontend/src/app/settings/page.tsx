"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Bell,
    Shield,
    Globe,
    Database,
    Save,
    ChevronRight,
    Lock,
    Eye,
    Monitor,
    CheckCircle,
    Loader2,
    User,
    Palette,
    RefreshCcw,
    FileCheck,
    AlertCircle,
    X,
    KeyRound
} from "lucide-react";
import { apiFetch, authApi } from "@/lib/api";
import { Modal } from "@/components/Modal";

export default function SettingsPage() {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [certData, setCertData] = useState<any>(null);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);

    const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
    const [pwdBuffer, setPwdBuffer] = useState({ old: "", new: "", confirm: "" });
    const [pwdLoading, setPwdLoading] = useState(false);

    const [settingsState, setSettingsState] = useState({
        "Default Valuation Model": "Straight Line",
        "Currency Preference": "KES (Shillings)",
        "Reporting Interval": "Quarterly",
        "Two-Factor Authentication": "Mandatory",
        "Session Intelligence": "AI Monitoring",
        "Audit Trail Strategy": "Immutable Registry",
        "Display Theme": "Enterprise High-Contrast",
        "Compact Data Density": "Optimized"
    });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdBuffer.new !== pwdBuffer.confirm) {
            alert("New passwords do not match.");
            return;
        }
        setPwdLoading(true);
        try {
            await authApi.changePassword({ old_password: pwdBuffer.old, new_password: pwdBuffer.new });
            alert("Password changed successfully.");
            setIsPwdModalOpen(false);
            setPwdBuffer({ old: "", new: "", confirm: "" });
        } catch (err: any) {
            alert(err.message || "Failed to change password. check old password.");
        } finally {
            setPwdLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await apiFetch("/inventory/sync", { method: "POST" });
            alert("Portfolio Inventory Ledger synchronized successfully.");
        } catch (err) {
            alert("Sync failed. Check administrative permissions.");
        } finally {
            setSyncing(false);
        }
    };

    const handleViewCert = async () => {
        try {
            const data = await apiFetch("/admin/security-certificate");
            setCertData(data);
            setIsCertModalOpen(true);
        } catch (err) {
            alert("Could not retrieve platform certificate.");
        }
    };

    const handleCommit = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }, 1500);
    };

    const toggleSetting = (name: string) => {
        setSettingsState(prev => ({
            ...prev,
            [name]: prev[name as keyof typeof prev].includes("Enhanced") ? prev[name as keyof typeof prev].replace("Enhanced ", "") : `Enhanced ${prev[name as keyof typeof prev]}`
        }));
    };

    const settingSections = [
        {
            title: "Access & Security",
            description: "Configure your system credentials and authentication security.",
            items: [
                { name: "User Credentials", icon: Lock, label: "Update Your Password", action: () => setIsPwdModalOpen(true) },
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">SYSTEM SETTINGS</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Manage your personal account security and access protocols.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {settingSections.map((section, idx) => (
                        <div key={idx} className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl">
                            <div className="mb-8">
                                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">{section.title}</h2>
                                <p className="text-xs text-gray-500 font-medium mt-1">{section.description}</p>
                            </div>
                            <div className="space-y-4">
                                {section.items.map((item, i) => (
                                    <div
                                        key={i}
                                        onClick={item.action}
                                        className="flex items-center justify-between p-5 bg-[var(--cool-silver)]/30 border border-transparent hover:border-[var(--cool-silver-dark)] hover:bg-white transition-all rounded-2xl group cursor-pointer shadow-sm"
                                    >
                                        <div className="flex items-center space-x-5">
                                            <div className="h-10 w-10 bg-white shadow-sm border border-[var(--cool-silver-dark)] flex items-center justify-center rounded-xl group-hover:bg-[var(--wine-red)]/5 transition-colors">
                                                <item.icon className="h-5 w-5 text-gray-400 group-hover:text-[var(--wine-red)]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{item.name}</p>
                                                <p className="text-sm font-black text-gray-900 tracking-tight">{item.label}</p>
                                            </div>
                                        </div>
                                        <button className="px-6 py-2.5 bg-[var(--wine-red)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--wine-red-light)] transition-all shadow-md">
                                            Change Password
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-8">
                    <div className="bg-[var(--wine-red)] p-8 shadow-2xl rounded-3xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Shield className="h-24 w-24" />
                        </div>
                        <h2 className="text-lg font-black tracking-tight uppercase mb-4 relative z-10">Security Brief</h2>
                        <p className="text-xs text-white/70 font-medium mb-8 relative z-10 leading-relaxed">
                            Your credentials are encrypted and never stored in plain text. Maintain strong passwords and update them regularly to ensure platform integrity.
                        </p>
                    </div>

                    {/* <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl relative">
                        <div className="absolute -top-3 -right-3 bg-[var(--champagne-gold)] text-black text-[8px] font-black px-2 py-1 rounded shadow-sm">BETA</div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase mb-8">System Health</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-4 py-3 bg-[var(--cool-silver)]/50 rounded-xl">
                                <span className="text-[10px] font-bold uppercase text-gray-500">API Status</span>
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-[var(--cool-silver)]/50 rounded-xl">
                                <span className="text-[10px] font-bold uppercase text-gray-500">Database Link</span>
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>

            <Modal
                isOpen={isCertModalOpen}
                onClose={() => setIsCertModalOpen(false)}
                title="ManageWare Platform Security Certificate"
            >
                {certData && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="h-6 w-6 text-green-500" />
                                <div>
                                    <p className="text-xs font-black text-green-900 uppercase">Status: {certData.status}</p>
                                    <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest">Issuer: {certData.issuer}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(certData.security_metrics).map(([key, value]: [string, any]) => (
                                <div key={key} className="p-4 bg-[var(--cool-silver)]/30 rounded-2xl">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{key.replace('_', ' ')}</p>
                                    <p className="text-[10px] font-black text-gray-900 truncate">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 border border-[var(--cool-silver-dark)] rounded-2xl bg-white shadow-sm space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compliance Registry</h3>
                            {Object.entries(certData.compliance).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase">{key.replace('_', ' ')}</span>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">{value ? "ENABLED" : "DISABLED"}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsCertModalOpen(false)}
                            className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl"
                        >
                            Acknowledge Integrity
                        </button>
                    </div>
                )}
            </Modal>

            {/* Change Password Modal */}
            {isPwdModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                        <div className="bg-gray-900 px-6 py-6 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <KeyRound className="h-5 w-5 text-[var(--champagne-gold)]" />
                                </div>
                                <h3 className="text-white font-bold tracking-tight uppercase">Update Credentials</h3>
                            </div>
                            <button onClick={() => setIsPwdModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={pwdBuffer.old}
                                        onChange={(e) => setPwdBuffer({ ...pwdBuffer, old: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={pwdBuffer.new}
                                        onChange={(e) => setPwdBuffer({ ...pwdBuffer, new: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={pwdBuffer.confirm}
                                        onChange={(e) => setPwdBuffer({ ...pwdBuffer, confirm: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={pwdLoading}
                                className="w-full py-4 bg-[var(--wine-red)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-[var(--wine-red-light)] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center"
                            >
                                {pwdLoading ? <RefreshCcw className="h-5 w-5 animate-spin" /> : "Verify & Commit Change"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
