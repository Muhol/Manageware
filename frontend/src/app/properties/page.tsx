"use client";

import Link from "next/link";
import { MapPin, Building2, Search, Info, Loader2, AlertCircle, ArrowUpRight, Shield, Plus } from "lucide-react";
import { Property, User } from "@/types";
import { apiFetch, authApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { AddPropertyModal } from "@/components/AddPropertyModal";

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchProperties();
        authApi.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
    }, []);

    const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
    const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");
    const canViewProperties = ["Administrator", "Finance Director", "IT Specialist", "Property Manager"].includes(currentUser?.role?.name || "");
    const hasNoProperty = isSiteRole && !currentUser?.property_id;
    const isAdmin = currentUser?.role?.name === "Administrator";

    if (hasNoProperty && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Property Assignment Required</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">As a lead operator, you must be linked to a specific estate to view property details or track assets. Please contact a Global Administrator.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    if (currentUser && !canViewProperties) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Your account does not have permission to view the global property portfolio. This section is restricted to administrative and management roles.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    const fetchProperties = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiFetch("/properties/");
            setProperties(data);
        } catch (err: any) {
            setError(err.message || "Failed to load properties");
        } finally {
            setLoading(false);
        }
    };

    const filteredProperties = properties.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-red-50 rounded-3xl border border-red-100">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Portfolio</h2>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                    onClick={fetchProperties}
                    className="px-6 py-2 bg-[var(--wine-red)] text-white font-bold rounded-xl hover:bg-[var(--wine-red-light)] transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight uppercase">PROPERTIES</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Visual overview of managed real estate holdings and hardware distribution.</p>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center justify-center px-6 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest hover:bg-[var(--wine-red-light)] transition-all rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Property
                        </button>
                    )}
                    <div className="relative group min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search property name or city..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--cool-silver-dark)] text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] rounded-xl outline-none shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading Properties...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProperties.map((property) => (
                        <div key={property.id} className="group bg-white border border-[var(--cool-silver-dark)] hover:border-[var(--wine-red)] transition-all rounded-[32px] shadow-sm hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col h-full">
                            <div className="p-8 flex-grow">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="h-14 w-14 bg-[var(--cool-silver)]/50 rounded-2xl flex items-center justify-center group-hover:bg-[var(--wine-red)] group-hover:text-white transition-all duration-300">
                                        <Building2 className="h-7 w-7" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">ACTIVE</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">{property.name}</h3>
                                    <div className="flex items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        <MapPin className="h-3 w-3 mr-1.5 text-[var(--wine-red)]" />
                                        {property.location}
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between gap-2">
                                    <div className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Classification</span>
                                        <span className="text-[10px] font-black text-gray-700 uppercase">{property.description || 'COMMERCIAL'}</span>
                                    </div>
                                    <div className="flex-1 px-3 py-1.5 bg-[var(--wine-red)]/5 rounded-lg border border-[var(--wine-red)]/10">
                                        <span className="text-[10px] font-black text-[var(--wine-red)] uppercase tracking-widest block leading-none mb-1">Estate Manager</span>
                                        <span className="text-[10px] font-black text-gray-900 uppercase truncate block">
                                            {property.manager?.name || "Unassigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href={`/inventory?search=${encodeURIComponent(property.name)}`}
                                className="w-full py-5 bg-gray-50 group-hover:bg-[var(--wine-red)] border-t border-[var(--cool-silver-dark)] flex items-center justify-center space-x-3 transition-colors"
                            >
                                <span className="text-xs font-black text-gray-600 group-hover:text-white uppercase tracking-[0.2em]">Track Assets</span>
                                <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
                            </Link>
                        </div>
                    ))}
                    {filteredProperties.length === 0 && (
                        <div className="col-span-full py-24 text-center">
                            <AlertCircle className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-sm">No properties found in global registry</p>
                        </div>
                    )}
                </div>
            )}

            <AddPropertyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchProperties}
            />
        </div>
    );
}
