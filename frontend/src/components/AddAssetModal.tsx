"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { apiFetch } from "@/lib/api";
import { Property, AssetType, Asset } from "@/types";
import { Loader2, Plus, AlertCircle, Save } from "lucide-react";

interface AssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetToEdit?: Asset | null;
}

export function AssetModal({ isOpen, onClose, onSuccess, assetToEdit }: AssetModalProps) {
    const [properties, setProperties] = useState<Property[]>([]);
    const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        serial_number: "",
        asset_tag: "",
        asset_type_id: "",
        property_id: "",
        status: "In Stock"
    });

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
        }
    }, [isOpen]);

    useEffect(() => {
        if (assetToEdit) {
            setFormData({
                serial_number: assetToEdit.serial_number,
                asset_tag: assetToEdit.asset_tag,
                asset_type_id: assetToEdit.asset_type_id,
                property_id: assetToEdit.property_id,
                status: assetToEdit.status
            });
        } else {
            setFormData({
                serial_number: "",
                asset_tag: "",
                asset_type_id: assetTypes[0]?.id || "",
                property_id: properties[0]?.id || "",
                status: "In Stock"
            });
        }
    }, [assetToEdit, assetTypes, properties, isOpen]);

    const fetchDependencies = async () => {
        setFetching(true);
        try {
            const [props, types] = await Promise.all([
                apiFetch("/properties/"),
                apiFetch("/asset-types/")
            ]);
            setProperties(props);
            setAssetTypes(types);

            if (!assetToEdit) {
                if (types.length > 0) setFormData(prev => ({ ...prev, asset_type_id: types[0].id }));
                if (props.length > 0) setFormData(prev => ({ ...prev, property_id: props[0].id }));
            }
        } catch (err: any) {
            setError("Failed to load form dependencies.");
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (assetToEdit) {
                await apiFetch(`/assets/${assetToEdit.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(formData)
                });
            } else {
                await apiFetch("/assets/", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save asset.");
        } finally {
            setLoading(false);
        }
    };

    const title = assetToEdit ? "Update Hardware Asset" : "Register New Asset";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            {fetching ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Awaiting Data...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-700 text-xs font-bold">
                            <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Serial Number</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
                                placeholder="SN-123456"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Asset Tag</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
                                placeholder="Auto-generated if empty"
                                value={formData.asset_tag}
                                onChange={e => setFormData({ ...formData, asset_tag: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hardware Category</label>
                        <select
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
                            value={formData.asset_type_id}
                            onChange={e => setFormData({ ...formData, asset_type_id: e.target.value })}
                        >
                            {assetTypes.map(at => (
                                <option key={at.id} value={at.id}>{at.name} ({at.manufacturer})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Property</label>
                        <select
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
                            value={formData.property_id}
                            onChange={e => setFormData({ ...formData, property_id: e.target.value })}
                        >
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lifecycle Status</label>
                        <select
                            className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="In Stock">In Stock</option>
                            <option value="Deployed">Deployed</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Retired">Retired</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--wine-red-light)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                {assetToEdit ? <Save className="h-5 w-5 mr-3" /> : <Plus className="h-5 w-5 mr-3" />}
                                {assetToEdit ? "Update System Records" : "Register Hardware Item"}
                            </div>
                        )}
                    </button>
                </form>
            )}
        </Modal>
    );
}
