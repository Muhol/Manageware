"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    BarChart3,
    PieChart as PieChartIcon,
    TrendingDown,
    AlertTriangle,
    Download,
    Calendar,
    Loader2,
    Shield
} from "lucide-react";
import { apiFetch, authApi } from "@/lib/api";
import { User } from "@/types";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["var(--wine-red)", "var(--wine-red-light)", "var(--champagne-gold)", "var(--cool-silver-dark)", "#94a3b8", "#cbd5e1"];

export default function ReportsPage() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [fiscalTrend, setFiscalTrend] = useState<any[]>([]);
    const [assetMix, setAssetMix] = useState<any[]>([]);
    const [assetAging, setAssetAging] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        fetchReportsData();
        authApi.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
    }, []);

    const fetchReportsData = async () => {
        try {
            const [invData, trendData, mixData, agingData] = await Promise.all([
                apiFetch("/inventory/"),
                apiFetch("/analytics/fiscal-trend"),
                apiFetch("/analytics/asset-mix"),
                apiFetch("/analytics/asset-aging")
            ]);
            setInventory(invData);
            setFiscalTrend(trendData);
            setAssetMix(mixData);
            setAssetAging(agingData);
        } catch (err) {
            console.error("Error fetching reports data", err);
        } finally {
            setLoading(false);
        }
    };

    const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
    const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");
    const canViewReports = ["Administrator", "Finance Director", "Property Manager"].includes(currentUser?.role?.name || "");
    const hasNoProperty = isSiteRole && !currentUser?.property_id;

    if (hasNoProperty && currentUser && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Intelligence Access Restricted</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Analytical intelligence reports require a verified estate link. Your account has not been associated with a specific property for data isolation.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest text-center leading-relaxed">Loading...</p>
            </div>
        );
    }

    if (currentUser && !canViewReports) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Intelligence Restricted</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Access to global analytics and financial drift data is restricted to executive management and lead property operators.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    const reportCards = [
        { name: "Global Inventory Accuracy", value: "99.4%", description: "Audited 24h ago", icon: BarChart3, color: "var(--wine-red)" },
        { name: "Financial Drift", value: "-2.4%", description: "Budget vs Actual", icon: TrendingDown, color: "var(--wine-red-light)" },
        { name: "Mean Asset Age", value: "3.2 Yrs", description: "Portfolio Lifecycle", icon: Calendar, color: "var(--champagne-gold-dark)" },
        { name: "Active Stock Items", value: inventory.length > 0 ? inventory.reduce((acc, curr) => acc + curr.quantity, 0).toLocaleString() : "0", description: "Across all properties", icon: AlertTriangle, color: "var(--wine-red)" },
    ];

    const generateMasterReport = () => {
        if (inventory.length === 0) return;

        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(22);
        doc.setTextColor(128, 0, 0); // Wine Red
        doc.text("ManageWare Portfolio Master Report", 14, 25);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 33);
        doc.text("Scope: Global Estate Hardware & Stock Health", 14, 39);

        // Section 1: KPI Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("1. Key Performance Indicators", 14, 55);

        const kpiHeaders = [["Metric", "Value", "Context"]];
        const kpiRows = reportCards.map(c => [c.name, c.value, c.description]);

        autoTable(doc, {
            head: kpiHeaders,
            body: kpiRows,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [128, 0, 0] },
            styles: { fontSize: 10 },
        });

        // Section 2: Asset Mix
        doc.text("2. Estate Asset Mix Summary", 14, (doc as any).lastAutoTable.finalY + 15);

        const mixHeaders = [["Classification", "Current Count"]];
        const mixRows = assetMix.map(m => [m.name, `${m.value} units`]);

        autoTable(doc, {
            head: mixHeaders,
            body: mixRows,
            startY: (doc as any).lastAutoTable.finalY + 20,
            theme: 'striped',
            headStyles: { fillColor: [100, 100, 100] },
        });

        // Section 3: Stock Health Ledger
        doc.addPage();
        doc.text("3. Stock Health & Threshold Ledger", 14, 25);

        const stockHeaders = [["Hardware Type", "Current Count", "Min. Threshold", "Health Status"]];
        const stockRows = inventory.map(item => {
            const status = item.quantity === 0 ? "CRITICAL" : (item.quantity <= item.threshold_level ? "LOW" : "OPTIMAL");
            return [item.asset_type?.name, item.quantity, item.threshold_level, status];
        });

        autoTable(doc, {
            head: stockHeaders,
            body: stockRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [128, 0, 0] },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.text[0];
                    if (status === 'CRITICAL') doc.setTextColor(255, 0, 0);
                    else if (status === 'LOW') doc.setTextColor(255, 165, 0);
                    else doc.setTextColor(0, 128, 0);
                }
            }
        });

        doc.save(`manageware_master_report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                <p className="text-gray-500 font-bold animate-pulse">Loading Analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">PORTFOLIO ANALYTICS</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Detailed insights into property asset accuracy, finances, and lifecycles.</p>
                </div>
                <button
                    onClick={generateMasterReport}
                    className="flex items-center justify-center px-6 py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest hover:bg-[var(--wine-red-light)] transition-all rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                >
                    <Download className="h-4 w-4 mr-2.5" />
                    Generate Master Report
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportCards.map((card) => (
                    <div key={card.name} className="bg-white p-8 shadow-xl border border-[var(--cool-silver-dark)] rounded-3xl flex flex-col justify-between group hover:shadow-2xl transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <card.icon className="h-12 w-12" style={{ color: card.color }} />
                        </div>
                        <div className="flex items-center space-x-3 text-gray-400 mb-6 font-black uppercase tracking-widest text-[10px] relative z-10">
                            <card.icon className="h-4 w-4" style={{ color: card.color }} />
                            <span>{card.name}</span>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tighter">{card.value}</p>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Fiscal Trend Chart */}
                <div className="lg:col-span-2 bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl h-[450px] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <TrendingDown className="h-32 w-32 text-[var(--wine-red)]" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4 relative z-10">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">FISCAL EXPOSURE (TREND)</h2>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-[var(--wine-red)] shadow-lg"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Actual Expenditure</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-[var(--champagne-gold)] shadow-lg"></div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Approved Budget</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fiscalTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cool-silver-dark)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }}
                                    tickFormatter={(value) => `Ksh ${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="total" fill="var(--wine-red)" radius={[4, 4, 0, 0]} name="Actual" barSize={30} />
                                <Bar dataKey="budget" fill="var(--champagne-gold)" radius={[4, 4, 0, 0]} name="Budget" barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Asset Mix Pie Chart */}
                <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl h-auto flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <PieChartIcon className="h-24 w-24 text-[var(--wine-red)]" />
                    </div>
                    <h2 className="text-lg font-black text-gray-900 mb-10 uppercase tracking-tight relative z-10">ESTATE ASSET MIX</h2>
                    <div className="flex-1 flex items-center justify-center relative z-10 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={assetMix}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {assetMix.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-10 space-y-4 relative z-10">
                        {assetMix.slice(0, 4).map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between group">
                                <div className="flex items-center space-x-3">
                                    <div className={`h-3 w-3 rounded-md shadow-sm transition-transform group-hover:scale-125`} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-gray-900 tracking-tighter">
                                    {((item.value / assetMix.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Asset Aging Analysis */}
            <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">HARDWARE LIFECYCLE AGING</h2>
                    <div className="flex items-center text-[var(--wine-red)] text-[10px] font-black uppercase tracking-widest bg-[var(--wine-red)]/5 px-3 py-1 rounded-lg">
                        <Calendar className="h-4 w-4 mr-2" />
                        Audited Accuracy
                    </div>
                </div>
                <div className="h-64 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assetAging}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cool-silver-dark)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--cool-silver)', opacity: 0.3 }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="value" fill="var(--wine-red-light)" radius={[4, 4, 0, 0]} name="Asset Count" barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">STOCK HEALTH LEDGER</h2>
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Optimal</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Low Stock</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Critical</span>
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--cool-silver-dark)]">
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hardware Type</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Count</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Min. Threshold</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--cool-silver-dark)]/50">
                            {inventory.map((item, i) => {
                                const isCritical = item.quantity === 0;
                                const isLow = item.quantity <= item.threshold_level && item.quantity > 0;

                                return (
                                    <tr key={i} className="hover:bg-[var(--cool-silver)]/10 transition-colors">
                                        <td className="py-4 font-bold text-gray-900 text-sm italic">{item.asset_type?.name}</td>
                                        <td className="py-4 font-black text-gray-900 text-sm tracking-tighter">{item.quantity}</td>
                                        <td className="py-4 font-bold text-gray-400 text-xs">{item.threshold_level}</td>
                                        <td className="py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-1.5 w-24 bg-[var(--cool-silver)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500 w-[5%]' :
                                                            isLow ? 'bg-amber-500 w-[40%]' : 'bg-green-500 w-full'
                                                            }`}
                                                    ></div>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isCritical ? 'text-red-600' :
                                                    isLow ? 'text-amber-600' : 'text-green-600'
                                                    }`}>
                                                    {isCritical ? 'Critical' : isLow ? 'Low' : 'Healthy'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
