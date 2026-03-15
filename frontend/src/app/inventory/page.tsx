"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Search, Plus, Filter, Download, Loader2, AlertCircle, Edit3, Shield } from "lucide-react";
import { Table } from "@/components/Table";
import { Asset, User } from "@/types";
import { apiFetch, authApi } from "@/lib/api";
import Link from "next/link";
import { AssetModal } from "@/components/AddAssetModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function InventoryContent() {
    const searchParams = useSearchParams();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        authApi.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
        fetchAssets();
        // Check for search param in URL
        const query = searchParams.get("search");
        if (query) {
            setSearchTerm(query);
        }
    }, [searchParams]);

    const fetchAssets = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiFetch("/assets/");
            setAssets(data);
        } catch (err: any) {
            setError(err.message || "Failed to load assets");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (assets.length === 0) return;

        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(18);
        doc.text("ManageWare Hardware Inventory Ledger", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Assets: ${assets.length}`, 14, 36);

        const headers = [["Asset Tag", "Type", "Model", "Property", "Serial Number", "Status", "Last Audit"]];
        const rows = assets.map(a => [
            a.asset_tag,
            a.asset_type?.name || "",
            a.asset_type?.model || "",
            a.property?.name || "Unassigned",
            a.serial_number,
            a.status,
            a.updated_at ? new Date(a.updated_at).toLocaleDateString() : ""
        ]);

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [128, 0, 0] }, // Wine Red approximate
            styles: { fontSize: 8, font: 'helvetica' },
        });

        doc.save(`manageware_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleAddClick = () => {
        setAssetToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (asset: Asset) => {
        setAssetToEdit(asset);
        setIsModalOpen(true);
    };

    const filteredAssets = assets.filter(asset =>
        asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.property?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
    const paginatedAssets = filteredAssets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const columns = [
        {
            header: "Unique Tag ID",
            accessor: (item: Asset) => (
                <span className="font-bold text-[var(--wine-red)]">{item.asset_tag}</span>
            )
        },
        {
            header: "Hardware Name",
            accessor: (item: Asset) => item.asset_type?.name || "Unknown"
        },
        {
            header: "Model",
            accessor: (item: Asset) => item.asset_type?.model || "-"
        },
        {
            header: "Property",
            accessor: (item: Asset) => item.property?.name || "Unassigned"
        },
        {
            header: "Status",
            accessor: (item: Asset) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.status === 'Deployed' ? 'bg-green-100 text-green-700' :
                    item.status === 'In Stock' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'Maintenance' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                    }`}>
                    {item.status}
                </span>
            )
        },
        {
            header: "Actions",
            accessor: (item: Asset) => (
                <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 text-gray-400 hover:text-[var(--wine-red)] hover:bg-[var(--wine-red)]/5 rounded-lg transition-all"
                    title="Edit Asset"
                >
                    <Edit3 className="h-4 w-4" />
                </button>
            )
        },
    ];

    const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
    const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");
    const hasNoProperty = isSiteRole && !currentUser?.property_id;

    if (hasNoProperty && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12 bg-[var(--cool-silver)]/30 rounded-[40px] border border-[var(--cool-silver-dark)] shadow-2xl">
                <Shield className="h-16 w-16 text-[var(--wine-red)] mb-6" />
                <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter">Inventory Access Restricted</h2>
                <p className="text-gray-600 mb-10 max-w-lg mx-auto font-medium">
                    As a <span className="text-[var(--wine-red)] font-bold">{currentUser?.role?.name}</span>, you can only manage the inventory for your assigned property.
                    No estate link was detected for your account.
                </p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest animate-pulse">Loading Inventory...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-red-50 rounded-2xl border border-red-100">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Inventory</h2>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                    onClick={fetchAssets}
                    className="px-6 py-2 bg-[var(--wine-red)] text-white font-bold rounded-xl hover:bg-[var(--wine-red-light)] transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">INVENTORY</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Lifecycle tracking and management for all estate-linked hardware.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center px-5 py-3 bg-white text-gray-700 font-bold hover:bg-[var(--cool-silver)] transition-all rounded-xl border border-[var(--cool-silver-dark)] shadow-sm active:scale-95"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center justify-center px-6 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest hover:bg-[var(--wine-red-light)] transition-all rounded-xl shadow-xl active:scale-95 hover:-translate-y-1"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        New Item
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Package className="h-24 w-24 text-[var(--wine-red)]" />
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8 relative z-10">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors" />
                        <input
                            type="text"
                            placeholder="Global Search (Tag, Serial, Type, Property)..."
                            className="w-full pl-12 pr-4 py-3 bg-[var(--cool-silver)]/40 border border-[var(--cool-silver-dark)] focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent outline-none transition-all rounded-xl font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                        <p className="text-gray-500 font-black uppercase tracking-widest animate-pulse opacity-50">Syncing Ledger...</p>
                    </div>
                ) : (
                    <>
                        <Table
                            data={paginatedAssets}
                            columns={columns}
                        />

                        {filteredAssets.length === 0 && (
                            <div className="text-center py-20 bg-[var(--cool-silver)]/10 rounded-2xl border-2 border-dashed border-[var(--cool-silver-dark)] mt-4">
                                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-black uppercase tracking-widest text-xs opacity-60">No hardware found in the current viewport</p>
                            </div>
                        )}

                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-gray-400 font-black uppercase tracking-widest px-2">
                            <p>Query Results: {filteredAssets.length} units (Page {currentPage} of {totalPages || 1})</p>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-5 py-2 bg-white border border-[var(--cool-silver-dark)] rounded-xl hover:bg-[var(--cool-silver)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="px-5 py-2 bg-white border border-[var(--cool-silver-dark)] rounded-xl hover:bg-[var(--cool-silver)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AssetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAssets}
                assetToEdit={assetToEdit}
            />
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-400 font-black uppercase animate-pulse">Initializing Assets...</div>}>
            <InventoryContent />
        </Suspense>
    );
}
