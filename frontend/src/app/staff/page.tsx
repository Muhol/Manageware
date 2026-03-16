"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, Shield, Loader2, AlertCircle, Edit, UserX, CheckCircle, Search } from "lucide-react";
import { Table } from "@/components/Table";
import { User, Property } from "@/types";
import { apiFetch, authApi } from "@/lib/api";
import { Modal } from "@/components/Modal";

interface Role {
    id: string;
    name: string;
    description: string;
}

export default function StaffPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role_id: "",
        property_id: "",
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersData, rolesData, userData, propsData] = await Promise.all([
                apiFetch("/users/"),
                apiFetch("/roles/"),
                authApi.getMe(),
                apiFetch("/properties/")
            ]);
            setUsers(usersData);
            setRoles(rolesData);
            setCurrentUser(userData);
            setProperties(propsData);
        } catch (err: any) {
            setError(err.message || "Failed to load staff data. You may not have administrative privileges.");
        } finally {
            setLoading(false);
        }
    };

    const siteRoles = ["Property Manager", "Inventory Clerk", "Maintenance Technician", "Site Procurement Officer"];
    const isSiteRole = siteRoles.includes(currentUser?.role?.name || "");
    const canViewStaff = ["Administrator", "IT Specialist", "Property Manager"].includes(currentUser?.role?.name || "");
    const hasNoProperty = isSiteRole && !currentUser?.property_id;

    if (hasNoProperty && currentUser && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Property Assignment Required</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Access to the personnel registry requires a verified estate link. Your account must be associated with a property to manage or view staff.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-24 space-y-4">
                <Loader2 className="h-12 w-12 text-[var(--wine-red)] animate-spin" />
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading...</p>
            </div>
        );
    }

    if (currentUser && !canViewStaff) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Security Clearance Required</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Global staff management is restricted to authorized administrative personnel. Standard site operators cannot access the cross-estate directory.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    const openCreateModal = () => {
        setUserToEdit(null);
        setFormData({
            name: "",
            email: "",
            password: "",
            role_id: roles.length > 0 ? roles[0].id : "",
            property_id: "",
            is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setUserToEdit(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "", // Leave blank unless changing
            role_id: user.role?.id || (roles.length > 0 ? roles[0].id : ""),
            property_id: user.property_id || "",
            is_active: user.is_active !== undefined ? user.is_active : true
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // If editing, handle empty password
            const payload: any = { ...formData };
            if (userToEdit && !payload.password) {
                delete payload.password;
            }

            // Handle null property_id if empty string
            if (!payload.property_id) {
                payload.property_id = null;
            }

            if (userToEdit) {
                await apiFetch(`/users/${userToEdit.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });
            } else {
                await apiFetch("/users/", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert("Error saving user: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async (userId: string) => {
        if (!confirm("Are you sure you want to deactivate this user? They will no longer be able to log in.")) return;

        try {
            await apiFetch(`/users/${userId}`, {
                method: "DELETE"
            });
            fetchData();
        } catch (err: any) {
            alert("Error deactivating user: " + err.message);
        }
    };

    const isAdmin = currentUser?.role?.name === "Administrator";

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const columns = [
        {
            header: "Staff Member",
            accessor: (item: User) => (
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-[var(--cool-silver)]/50 rounded-full flex items-center justify-center text-[var(--wine-red)] font-black text-xs">
                        {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{item.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{item.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Assigned Role",
            accessor: (item: User) => (
                <span className="flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-[var(--wine-red)]">
                    <Shield className="h-3 w-3" />
                    <span>{item.role?.name || "Unknown"}</span>
                </span>
            )
        },
        {
            header: "Assigned Property",
            accessor: (item: User) => (
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                    {item.assigned_property?.name || "Global / Unassigned"}
                </span>
            )
        },
        {
            header: "Account Status",
            accessor: (item: User) => {
                const isActive = item.is_active !== false;
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                        {isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                        {isActive ? 'Active' : 'Deactivated'}
                    </span>
                );
            }
        },
        {
            header: "Operations",
            accessor: (item: User) => (
                <div className="flex items-center space-x-2">
                    {isAdmin && item.id !== currentUser?.id ? (
                        <>
                            <button
                                onClick={() => openEditModal(item)}
                                className="p-2 text-gray-500 hover:text-[var(--wine-red)] transition-colors hover:bg-[var(--wine-red)]/5 rounded-lg"
                                title="Edit Staff Member"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            {(item.is_active !== false) && (
                                <button
                                    onClick={() => handleDeactivate(item.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                                    title="Deactivate Account"
                                >
                                    <UserX className="h-4 w-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        <span className="text-[10px] font-bold text-gray-400 italic">Restricted</span>
                    )}
                </div>
            )
        }
    ];

    if (error || (currentUser && !isAdmin)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--cool-silver)]/30 rounded-3xl border border-[var(--cool-silver-dark)]">
                <Shield className="h-12 w-12 text-[var(--wine-red)] mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Access Restricted</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Your account credentials do not have the required clearance level to view the system staff directory. Please contact a Global Administrator if you believe this is an error.</p>
                <Link href="/" className="px-8 py-3 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">STAFF DIRECTORY</h1>
                    <p className="text-sm md:text-base text-gray-600 font-medium">Manage system access, assign roles, and administer personnel credentials.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center px-6 py-4 bg-[var(--wine-red)] text-white font-black capitalize tracking-widest hover:bg-[var(--wine-red-light)] transition-all rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                    >
                        <UserPlus className="h-5 w-5 mr-2.5" />
                        create new account
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-8 shadow-2xl border border-[var(--cool-silver-dark)] rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Users className="h-24 w-24 text-[var(--wine-red)]" />
                        </div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">SYSTEM PERSONNEL</h2>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="pl-10 pr-4 py-2 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-xs font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
                                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading...</p>
                            </div>
                        ) : (
                            <Table data={filteredUsers} columns={columns} />
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[var(--wine-red)] p-8 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <Shield className="h-32 w-32" />
                        </div>
                        <h2 className="text-xl font-black tracking-tighter mb-2 uppercase">SECURITY LEVELS</h2>
                        <p className="text-xs font-bold opacity-80 mb-6 uppercase tracking-widest">Role-Based Access Control</p>

                        <div className="space-y-4">
                            {roles.map((role) => (
                                <div key={role.id} className="bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-sm font-black tracking-tight">{role.name}</h3>
                                        <span className="text-[10px] font-black tracking-widest bg-white/20 px-2 py-0.5 rounded-lg">
                                            {users.filter(u => u.role?.id === role.id && u.is_active !== false).length}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-medium opacity-70 leading-relaxed">{role.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={userToEdit ? "Update Staff Profile" : "Provision New Access"}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Corporate Email</label>
                        <input
                            required
                            type="email"
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
                            placeholder="john.doe@manageware.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            {userToEdit ? "Reset Password (Optional)" : "Initial Password"}
                        </label>
                        <input
                            required={!userToEdit}
                            type="password"
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
                            placeholder={userToEdit ? "Leave blank to keep unchanged" : "Secure password"}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role Assignment</label>
                        <select
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
                            value={formData.role_id}
                            onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                        >
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Property Assignment</label>
                        <select
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
                            value={formData.property_id}
                            onChange={e => setFormData({ ...formData, property_id: e.target.value })}
                        >
                            <option value="">Global / Unassigned</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] font-medium text-gray-400 italic ml-1 leading-tight">
                            * Required for Property Managers, Inventory Clerks, and Technicians.
                        </p>
                    </div>

                    {userToEdit && (
                        <div className="flex items-center space-x-3 p-4 bg-[var(--cool-silver)]/30 rounded-xl border border-[var(--cool-silver-dark)]">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 text-[var(--wine-red)] rounded border-gray-300 focus:ring-[var(--wine-red)]"
                            />
                            <label htmlFor="is_active" className="text-xs font-bold text-gray-700">Account Active & Unlocked</label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--wine-red-light)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center">
                                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                Securing Profile...
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                {userToEdit ? "Commit Updates" : "Issue Credentials"}
                            </div>
                        )}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
