"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { apiFetch } from "@/lib/api";
import { User } from "@/types";
import { Loader2, Building2, AlertCircle } from "lucide-react";

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    manager_id: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: "", location: "", description: "", manager_id: "" });
      setError("");
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const data = await apiFetch("/users/");
      // Filter to Property Manager roles for the manager dropdown
      const managers = data.filter((u: User) =>
        ["Property Manager", "Administrator"].includes(u.role?.name || "")
      );
      setUsers(managers);
    } catch {
      // If user list fails, still allow form submission without a manager
      setUsers([]);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/properties/", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          description: formData.description || null,
          manager_id: formData.manager_id || null,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create property.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Property">
      {fetching ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 text-[var(--wine-red)] animate-spin" />
          <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Loading...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-700 text-xs font-bold">
              <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Property Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Property Name <span className="text-[var(--wine-red)]">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Westlands Tower A"
              className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Location / City <span className="text-[var(--wine-red)]">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Nairobi, Westlands"
              className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Description / Classification */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Classification / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Commercial, Residential, Mixed-Use"
              className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Estate Manager */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Assign Estate Manager <span className="text-gray-300">(optional)</span>
            </label>
            <select
              className="w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--wine-red-light)] outline-none appearance-none"
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
            >
              <option value="">— No manager assigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[var(--cool-silver-dark)]">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--wine-red)] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--wine-red-light)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 mr-3" />
                  Register Property
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
