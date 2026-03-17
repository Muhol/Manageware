"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CreditCard, Plus, FileText, CheckCircle, Clock, XCircle, Search, Loader2, AlertCircle, TrendingDown, ArrowRight, ThumbsUp, ThumbsDown, Download, Shield } from "lucide-react";
import { Table } from "@/components/Table";
import { PurchaseRequest, User, PurchaseOrder } from "@/types";
import { apiFetch, authApi, apiFetchBlob } from "@/lib/api";
import { RequestHardwareModal } from "@/components/RequestHardwareModal";
import { Modal } from "@/components/Modal";

export default function ProcurementPage() {
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"requests" | "orders">("requests");
    const [loading, setLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [error, setError] = useState("");
    const [ordersError, setOrdersError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [orderSearchTerm, setOrderSearchTerm] = useState("");
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Approval Modal State
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [approvalNotes, setApprovalNotes] = useState("");
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        setError("");
        try {
            const [reqsData, userData] = await Promise.all([
                apiFetch("/purchase-requests/"),
                authApi.getMe()
            ]);
            setRequests(reqsData);
            setCurrentUser(userData);
            
            // If we're on the orders tab or want to prefetch
            if (activeTab === "orders") {
                fetchOrders();
            }
        } catch (err: any) {
            setError(err.message || "Failed to load procurement data");
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        setOrdersLoading(true);
        setOrdersError("");
        try {
            const ordersData = await apiFetch("/purchase-orders/");
            setOrders(ordersData);
        } catch (err: any) {
            setOrdersError(err.message || "Failed to load purchase orders");
        } finally {
            setOrdersLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "orders" && orders.length === 0) {
            fetchOrders();
        }
    }, [activeTab]);

    const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
    const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");
    const canViewProcurement = ["Administrator", "Finance Director", "Property Manager", "Site Procurement Officer"].includes(currentUser?.role?.name || "");
    const hasNoProperty = isSiteRole && !currentUser?.property_id;

    if (hasNoProperty && currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Property Assignment Required</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Procurement access requires a verified estate link. Your account has not been assigned to a specific property for hardware requisition.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-24 space-y-4">
                <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Accessing Procurement Registry...</p>
            </div>
        );
    }

    if (currentUser && !canViewProcurement) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Your account does not have authorization to access the global procurement ledger. Supply request management is restricted to management and procurement officers.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    const handleApprove = async () => {
        if (!selectedRequest) return;
        setIsConfirming(true);
        try {
            await apiFetch(`/purchase-requests/${selectedRequest.id}/approve`, {
                method: "PATCH",
                body: JSON.stringify({
                    purchase_request_id: selectedRequest.id,
                    status: "Approved",
                    approval_notes: approvalNotes
                })
            });
            setSelectedRequest(null);
            setApprovalNotes("");
            fetchInitialData();
        } catch (err: any) {
            alert("Error approving request: " + err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        setIsConfirming(true);
        try {
            await apiFetch(`/purchase-requests/${selectedRequest.id}/reject`, {
                method: "PATCH",
                body: JSON.stringify({
                    purchase_request_id: selectedRequest.id,
                    status: "Rejected",
                    approval_notes: approvalNotes
                })
            });
            setSelectedRequest(null);
            setApprovalNotes("");
            fetchInitialData();
        } catch (err: any) {
            alert("Error rejecting request: " + err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleDownload = async (requestId: string) => {
        try {
            const po = await apiFetch(`/purchase-requests/${requestId}/po`);
            const blob = await apiFetchBlob(`/purchase-orders/${po.id}/download`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${po.po_number}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert("Could not download Purchase Order: " + err.message);
        }
    };

    const handleDownloadOrder = async (poId: string, poNumber: string) => {
        try {
            const blob = await apiFetchBlob(`/purchase-orders/${poId}/download`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${poNumber}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert("Could not download Purchase Order: " + err.message);
        }
    };

    const filteredRequests = requests.filter(req =>
        req.justification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.property?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOrders = orders.filter(order =>
        order.po_number.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.purchase_request?.property?.name.toLowerCase().includes(orderSearchTerm.toLowerCase())
    );

    const isFinanceDirector = currentUser?.role?.name === "Finance Director" || currentUser?.role?.name === "Administrator";

    const columns = [
        {
            header: "Request ID",
            accessor: (item: PurchaseRequest) => (
                <span className="font-bold text-[var(--wine-red)]">{item.id.slice(0, 8).toUpperCase()}</span>
            )
        },
        {
            header: "Requested On",
            accessor: (item: PurchaseRequest) => new Date(item.created_at).toLocaleDateString()
        },
        {
            header: "Originator Property",
            accessor: (item: PurchaseRequest) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{item.property?.name || "Global"}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{item.requester?.name}</span>
                </div>
            )
        },
        {
            header: "Current Status",
            accessor: (item: PurchaseRequest) => (
                <span className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${item.status === 'Approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                    item.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                    {item.status === 'Approved' ? <CheckCircle className="h-4 w-4" /> :
                        item.status === 'Pending' ? <Clock className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{item.status}</span>
                </span>
            )
        },
        {
            header: "Operations",
            accessor: (item: PurchaseRequest) => (
                <div className="flex items-center space-x-2">
                    {item.status === 'Pending' && isFinanceDirector ? (
                        <button
                            onClick={() => setSelectedRequest(item)}
                            className="text-[var(--wine-red)] font-black text-[10px] uppercase tracking-widest hover:bg-[var(--wine-red)]/10 px-3 py-1.5 rounded-lg border border-[var(--wine-red)]/20 transition-all"
                        >
                            Review Request
                        </button>
                    ) : item.status === 'Approved' ? (
                        <button
                            onClick={() => handleDownload(item.id)}
                            className="bg-[var(--cool-silver)]/50 text-gray-700 font-black text-[10px] uppercase tracking-widest hover:bg-[var(--wine-red)] hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center"
                        >
                            <Download className="h-3 w-3 mr-2" /> Download PO (PDF)
                        </button>
                    ) : (
                        <span className="text-[10px] font-bold text-gray-400 italic">No actions</span>
                    )}
                </div>
            )
        },
    ];

    const orderColumns = [
        {
            header: "Order Number",
            accessor: (item: PurchaseOrder) => (
                <span className="font-bold text-[var(--wine-red)]">{item.po_number}</span>
            )
        },
        {
            header: "Generated On",
            accessor: (item: PurchaseOrder) => new Date(item.created_at).toLocaleDateString()
        },
        {
            header: "Property",
            accessor: (item: PurchaseOrder) => item.purchase_request?.property?.name || "Global"
        },
        {
            header: "Total Amount",
            accessor: (item: PurchaseOrder) => (
                <span className="font-black">Ksh {item.total_amount?.toLocaleString()}</span>
            )
        },
        {
            header: "Actions",
            accessor: (item: PurchaseOrder) => (
                <button
                    onClick={() => handleDownloadOrder(item.id, item.po_number)}
                    className="flex items-center text-[10px] font-black uppercase tracking-widest text-[var(--wine-red)] hover:underline"
                >
                    <Download className="h-3 w-3 mr-2" /> PO (PDF)
                </button>
            )
        }
    ];

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-red-50 rounded-3xl border border-red-100">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-red-900 mb-2">Acquisition System Error</h2>
                <p className="text-red-700 mb-6">{error}</p>
                <button onClick={fetchInitialData} className="px-6 py-2 bg-[var(--wine-red)] text-white font-bold rounded-xl">Retry Connection</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">PROCUREMENT LEDGER</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Lifecycle management of hardware acquisition from request to financial sign-off.</p>
                </div>
                <button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="flex items-center justify-center px-6 py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest hover:bg-[var(--wine-red-light)] transition-all rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                >
                    <Plus className="h-5 w-5 mr-2.5" />
                    New Hardware Request
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center space-x-4 border-b border-[var(--cool-silver-dark)] pb-px">
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'text-[var(--wine-red)]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Requests
                    {activeTab === 'requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--wine-red)]" />}
                </button>
                <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'orders' ? 'text-[var(--wine-red)]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Orders
                    {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--wine-red)]" />}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CreditCard className="h-24 w-24 text-[var(--wine-red)]" />
                        </div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">
                                {activeTab === 'requests' ? 'Acquisition Requests' : 'Approved Purchase Orders'}
                            </h2>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'requests' ? "Filter requests..." : "Filter by PO number or property..."}
                                    className="pl-10 pr-4 py-2 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-xs font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none rounded-xl"
                                    value={activeTab === 'requests' ? searchTerm : orderSearchTerm}
                                    onChange={(e) => activeTab === 'requests' ? setSearchTerm(e.target.value) : setOrderSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {activeTab === 'requests' ? (
                            loading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading Requests...</p>
                                </div>
                            ) : (
                                <Table data={filteredRequests} columns={columns} />
                            )
                        ) : (
                            ordersLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading Orders...</p>
                                </div>
                            ) : (
                                <Table data={filteredOrders} columns={orderColumns} />
                            )
                        )}
                    </div>
                </div>

                {/* <div className="space-y-6">
                    <div className="bg-[var(--wine-red)] p-8 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <CreditCard className="h-32 w-32" />
                        </div>
                        <h2 className="text-xl font-black tracking-tighter mb-2 uppercase">QUARTERLY CYCLE</h2>
                        <p className="text-xs font-bold opacity-80 mb-8 uppercase tracking-widest">Real Estate Hardware CapEx</p>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[10px] mb-2 font-black uppercase tracking-widest">
                                    <span>Consumption</span>
                                    <span>Ksh 1.24M / 2.0M</span>
                                </div>
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-[var(--champagne-gold)] w-[62%] rounded-full shadow-lg"></div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-black tracking-tighter">Ksh 760k</p>
                                    <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest mt-1">Available Reserve</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <TrendingDown className="h-6 w-6 text-[var(--champagne-gold)]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 shadow-xl border border-[var(--cool-silver-dark)] rounded-3xl group">
                        <h2 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest">FINANCE SYNC STATUS</h2>
                        <div className="flex items-start p-5 bg-green-50 border border-green-100 rounded-2xl space-x-4 text-green-700 mb-4 transition-all hover:bg-green-100/50">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black leading-tight uppercase mb-1">Group ERP Connected</p>
                                <p className="text-[10px] font-medium leading-relaxed opacity-80">All approved POs are cryptographically hashed and synced to the central treasury ledger in real-time.</p>
                            </div>
                        </div>
                    </div>
                </div> */}
            </div>

            <RequestHardwareModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={fetchInitialData}
            />

            {/* Approval Review Modal */}
            <Modal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                title="Finance Director Review"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        <div className="bg-[var(--cool-silver)]/30 p-5 rounded-2xl border border-[var(--cool-silver-dark)]">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Request Details</h4>
                            <p className="text-sm font-bold text-gray-900 mb-1">{selectedRequest.property?.name}</p>
                            <p className="text-xs text-gray-600 leading-relaxed italic">"{selectedRequest.justification}"</p>

                            <div className="mt-4 pt-4 border-t border-[var(--cool-silver-dark)]">
                                <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Requested Items</h5>
                                <div className="space-y-2">
                                    {selectedRequest.items?.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-gray-900">{item.quantity}x {item.asset_type?.name || "Hardware Unit"}</span>
                                            <span className="font-black text-[var(--wine-red)]">Ksh {item.estimated_price?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Financial Approval Notes</label>
                            <textarea
                                className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none min-h-[100px]"
                                placeholder="Add any notes for the procurement team..."
                                value={approvalNotes}
                                onChange={e => setApprovalNotes(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button
                                onClick={handleReject}
                                disabled={isConfirming}
                                className="flex items-center justify-center p-4 border-2 border-red-200 text-red-600 font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                                <ThumbsDown className="h-5 w-5 mr-2" /> Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isConfirming}
                                className="flex items-center justify-center p-4 bg-green-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-green-700 hover:-translate-y-1 transition-all disabled:opacity-50"
                            >
                                <ThumbsUp className="h-5 w-5 mr-2" /> Approve
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
