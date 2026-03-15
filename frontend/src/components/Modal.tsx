"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleEsc);
        }
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--cool-silver-dark)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--cool-silver-dark)] flex items-center justify-between bg-[var(--cool-silver)]/30">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
