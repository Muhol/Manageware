"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { apiFetch, authApi } from "@/lib/api";
import { Property, AssetType, User } from "@/types";
import { Loader2, Plus, AlertCircle, ShoppingCart } from "lucide-react";

interface RequestHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestHardwareModal({ isOpen, onClose, onSuccess }: RequestHardwareModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    property_id: "",
    justification: "",
    items: [
      { asset_type_id: "", quantity: 1, estimated_price: 0 }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      fetchDependencies();
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    setFetching(true);
    try {
      const [props, types, me] = await Promise.all([
        apiFetch("/properties/"),
        apiFetch("/asset-types/"),
        authApi.getMe()
      ]);
      setProperties(props);
      setAssetTypes(types);
      setCurrentUser(me);
      
      setFormData(prev => ({
        ...prev,
        property_id: props[0]?.id || "",
        items: [{ asset_type_id: types[0]?.id || "", quantity: 1, estimated_price: 50000 }]
      }));
    } catch (err: any) {
      setError("Failed to load form dependencies.");
    } finally {
      setFetching(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { asset_type_id: assetTypes[0]?.id || "", quantity: 1, estimated_price: 50000 }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError("");

    try {
      await apiFetch("/purchase-requests/", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          requested_by: currentUser.id
        })
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Hardware Acquisition Request">
      {fetching ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
          <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Constructing Request Form...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-700 text-xs font-bold">
              <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Property</label>
                <select
                required
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Justification</label>
                <textarea
                required
                className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none min-h-[100px]"
                placeholder="Explain why this hardware is required for operations..."
                value={formData.justification}
                onChange={e => setFormData({ ...formData, justification: e.target.value })}
                />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Requested Items</h4>
                <button 
                  type="button"
                  onClick={addItem}
                  className="text-[10px] font-black text-[var(--wine-red)] uppercase tracking-widest flex items-center hover:underline"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add another item
                </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="p-4 bg-[var(--cool-silver)]/20 border border-[var(--cool-silver-dark)] rounded-2xl space-y-4 relative">
                {formData.items.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                        <Plus className="h-4 w-4 rotate-45" />
                    </button>
                )}
                
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hardware Type</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-[var(--cool-silver-dark)] rounded-lg text-xs font-bold focus:ring-1 focus:ring-[var(--wine-red-light)] outline-none"
                      value={item.asset_type_id}
                      onChange={e => updateItem(index, "asset_type_id", e.target.value)}
                    >
                      {assetTypes.map(at => (
                        <option key={at.id} value={at.id}>{at.name} ({at.manufacturer})</option>
                      ))}
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 bg-white border border-[var(--cool-silver-dark)] rounded-lg text-xs font-bold focus:ring-1 focus:ring-[var(--wine-red-light)] outline-none"
                          value={item.quantity}
                          onChange={e => updateItem(index, "quantity", parseInt(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Unit Price (Ksh)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-[var(--cool-silver-dark)] rounded-lg text-xs font-bold focus:ring-1 focus:ring-[var(--wine-red-light)] outline-none"
                          value={item.estimated_price}
                          onChange={e => updateItem(index, "estimated_price", parseFloat(e.target.value))}
                        />
                    </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--cool-silver-dark)]">
            <div className="flex items-center justify-between mb-6 px-2">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Estimated Total</span>
                <span className="text-lg font-black text-gray-900 tracking-tighter">
                  Ksh {formData.items.reduce((acc, curr) => acc + (curr.quantity * curr.estimated_price), 0).toLocaleString()}
                </span>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--wine-red-light)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
                {loading ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Submitting...
                </div>
                ) : (
                <div className="flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 mr-3" />
                    Submit Request for Approval
                </div>
                )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
