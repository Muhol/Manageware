"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Package,
  MapPin,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  CheckCircle,
  ShoppingCart
} from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
import { apiFetch, authApi } from "@/lib/api";
import { User } from "@/types";
import Link from "next/link";
import { Shield } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

const COLORS = ["var(--wine-red)", "var(--wine-red-light)", "var(--champagne-gold)", "var(--cool-silver-dark)"];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [assetMix, setAssetMix] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    authApi.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsData = await apiFetch("/dashboard/stats");
      setStats(statsData);

      try {
        const [reqsData, alertsData, mixData, propData] = await Promise.all([
          apiFetch("/purchase-requests/"),
          apiFetch("/dashboard/alerts"),
          apiFetch("/analytics/asset-mix"),
          apiFetch("/properties/")
        ]);
        setRequests(reqsData.slice(0, 4));
        setAlerts(alertsData.low_stock_items || []);
        setAssetMix(mixData);
        setProperties(propData);
      } catch (e) {
        setRequests([]);
        setAlerts([]);
        setAssetMix([]);
        setProperties([]);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
  const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");

  const statCards = stats ? [
    { name: "Total Assets", value: stats.total_assets.toLocaleString(), icon: Package, change: "Live", color: "var(--wine-red)", path: "/inventory" },
    { name: "Managed Estates", value: stats.total_properties.toLocaleString(), icon: MapPin, change: "Stable", color: "var(--champagne-gold-dark)", path: "/properties" },
    { name: "Pending Requests", value: stats.pending_requests.toLocaleString(), icon: BarChart3, change: "Action Needed", color: "var(--wine-red-light)", path: "/procurement" },
    { name: "Facility Service Alerts", value: stats.maintenance_assets.toLocaleString(), icon: AlertCircle, change: "Maintenance", color: "var(--wine-red)", path: "/inventory?search=Maintenance" },
  ].filter(card => !(isSiteRole && card.name === "Managed Estates")) : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Loading dashboard...</p>
      </div>
    );
  }


  const hasNoProperty = isSiteRole && !currentUser?.property_id;

  if (hasNoProperty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-12 bg-[var(--cool-silver)]/30 rounded-[40px] border border-[var(--cool-silver-dark)] shadow-2xl animate-in zoom-in duration-500">
        <div className="h-24 w-24 bg-[var(--wine-red)]/5 rounded-full flex items-center justify-center mb-8 relative">
          <Shield className="h-12 w-12 text-[var(--wine-red)]" />
          <div className="absolute inset-0 bg-[var(--wine-red)] rounded-full animate-ping opacity-10"></div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tighter">Action Required: Property Assignment</h2>
        <p className="text-gray-600 mb-10 max-w-xl mx-auto text-lg leading-relaxed font-medium">
          Your account is currently flagged as a <span className="text-[var(--wine-red)] font-bold">{currentUser?.role?.name}</span>, but you have not been linked to a specific estate.
          <br /><br />
          Data isolation protocols prevent you from viewing global portfolio metrics until an administrator assigns you to a physical property.
        </p>
        <div className="flex gap-4">
          <Link href="/settings" className="px-10 py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:-translate-y-1 transition-all">Check My Profile</Link>
          <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white border border-[var(--cool-silver-dark)] text-gray-900 font-black uppercase tracking-widest rounded-2xl shadow-xl hover:-translate-y-1 transition-all">Retry Sync</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 uppercase tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 font-medium">Real-time overview of hardware distribution across your real estate holdings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            onClick={() => stat.path && router.push(stat.path)}
            className="bg-white p-6 shadow-xl border border-[var(--cool-silver-dark)] flex flex-col justify-between group hover:shadow-2xl transition-all rounded-3xl relative overflow-hidden cursor-pointer hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="h-12 w-12" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div
                className="p-3 rounded-2xl shadow-sm"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${stat.change === 'Action Needed' ? 'bg-amber-100 text-amber-700' :
                stat.change === 'Maintenance' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                {stat.change}
              </span>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Threshold Alerts Widget */}
          {/* <div className="bg-white p-8 shadow-xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden ring-2 ring-[var(--wine-red)]/10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="bg-red-50 p-2 rounded-xl border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">STOCK THRESHOLD ALERTS</h2>
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-widest border border-red-100 animate-pulse">
                Action Required
              </span>
            </div>

            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-red-50/30 border border-red-100 rounded-2xl group hover:bg-red-50 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-white border border-red-100 flex items-center justify-center rounded-xl shadow-sm">
                      <Package className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{alert.asset_type}</p>
                      <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-0.5">
                        Stock: {alert.quantity} (Threshold: {alert.threshold})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/inventory?search=${encodeURIComponent(alert.asset_type)}`)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100 shadow-sm"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              )) : (
                <div className="text-center py-10 bg-[var(--cool-silver)]/10 rounded-2xl border-2 border-dashed border-[var(--cool-silver-dark)]">
                  <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">All Stock Levels Optimal</p>
                </div>
              )}
            </div>
          </div> */}

          {/* Recent Acquisitions Widget */}
          <div className="bg-white p-8 shadow-xl border border-[var(--cool-silver-dark)] rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">RECENT ACQUISITIONS</h2>
              <button
                onClick={() => router.push("/admin/audit")}
                className="text-[var(--wine-red)] text-[10px] font-black uppercase tracking-widest hover:underline px-4 py-2 bg-[var(--cool-silver)] rounded-xl transition-all border border-[var(--cool-silver-dark)]"
              >
                Legacy View
              </button>
            </div>
            <div className="space-y-4">
              {requests.length > 0 ? requests.map((req, i) => (
                <div
                  key={i}
                  onClick={() => router.push("/procurement")}
                  className="flex items-center justify-between p-5 bg-[var(--cool-silver)]/30 border border-transparent hover:border-[var(--cool-silver-dark)] hover:bg-white transition-all rounded-2xl group cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-5">
                    <div className="h-12 w-12 bg-white shadow-sm border border-[var(--cool-silver-dark)] flex items-center justify-center rounded-xl group-hover:rotate-6 transition-transform">
                      <ShoppingCart className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">
                        {req.items && req.items.length > 0 ? req.items[0].asset_type?.name : (req.justification?.slice(0, 30) || "Hardware Request")}
                      </p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate max-w-[120px]">
                          {req.property?.name || "Global Estate"}
                        </span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                          Status: <span className="text-[var(--wine-red)]">{req.status}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-[var(--wine-red)] transition-colors inline-block" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 border-2 border-dashed border-[var(--cool-silver-dark)] rounded-2xl bg-[var(--cool-silver)]/20">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold italic">No active requests</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 shadow-xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp className="h-32 w-32 text-[var(--wine-red)]" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">ASSET MIX DISTRIBUTION</h2>
            <div className="flex items-center text-[var(--wine-red)] text-xs font-black uppercase tracking-widest bg-[var(--wine-red)]/5 px-3 py-1 rounded-lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Real-time
            </div>
          </div>
          <div className="flex-1 relative z-10 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetMix} layout="vertical" margin={{ left: 40, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--cool-silver-dark)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--cool-silver)', opacity: 0.3 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {assetMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 relative z-10">
            {assetMix.slice(0, 3).map((d, i) => (
              <div
                key={i}
                onClick={() => router.push(`/inventory?search=${encodeURIComponent(d.name)}`)}
                className="text-center p-4 bg-white border border-[var(--cool-silver-dark)] rounded-2xl shadow-sm hover:scale-105 hover:shadow-md transition-all cursor-pointer"
              >
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1 truncate">{d.name}</p>
                <div className="h-1.5 w-full bg-[var(--cool-silver)] rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.value / assetMix.reduce((a, b) => a + b.value, 0)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  ></div>
                </div>
                <p className="text-xl font-black text-gray-900 tracking-tight">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isSiteRole && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">ESTATES</h2>
            {/* <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-[var(--cool-silver)] px-3 py-1 rounded-lg border border-[var(--cool-silver-dark)]">
              REQ-MW-002 COMPLIANT
            </div> */}
          </div>
          <PropertyMap
            properties={properties}
            onEstateClick={(p) => router.push(`/inventory?search=${encodeURIComponent(p.name)}`)}
          />
        </div>
      )}
    </div>
  );
}
