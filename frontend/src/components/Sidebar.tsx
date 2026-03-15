"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    MapPin,
    ShoppingCart,
    BarChart3,
    Users,
    Settings,
    ShieldCheck,
    Shield,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { User } from "@/types";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["*"] },
    { name: "Building Assets", href: "/inventory", icon: Package, roles: ["*"] },
    { name: "Properties", href: "/properties", icon: MapPin, roles: ["Administrator", "Finance Director", "IT Specialist", "Property Manager"] },
    { name: "Procurement", href: "/procurement", icon: ShoppingCart, roles: ["Administrator", "Finance Director", "Property Manager", "Site Procurement Officer"] },
    { name: "Analytics", href: "/reports", icon: BarChart3, roles: ["Administrator", "Finance Director", "Property Manager"] },
    { name: "User Management", href: "/staff", icon: Users, roles: ["Administrator", "IT Specialist"] },
    { name: "System Audit Trail", href: "/admin/audit", icon: Shield, roles: ["Administrator", "IT Specialist"] },
];

interface SidebarProps {
    onClose?: () => void;
    className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        authApi.getMe().then(setUser).catch(() => setUser(null));
    }, []);

    const filteredNavigation = navigation.filter(item => {
        if (item.roles.includes("*")) return true;
        if (!user || !user.role) return false;
        return item.roles.includes(user.role.name);
    });

    return (
        <div className={cn("flex h-full flex-col bg-white border-r border-[var(--cool-silver-dark)] overflow-hidden", className)}>
            <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--cool-silver-dark)] bg-[var(--wine-red)]">
                <div className="flex items-center">
                    <ShieldCheck className="h-8 w-8 text-[var(--champagne-gold)] mr-2" />
                    <span className="text-xl font-bold text-white tracking-tight">ManageWare</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-1 text-white hover:bg-white/10 rounded-lg">
                        <X className="h-6 w-6" />
                    </button>
                )}
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            // onClick={onClose}
                            className={cn(
                                "group flex items-center px-3 py-2 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-[var(--cool-silver)] text-[var(--wine-red)] font-semibold shadow-sm rounded-xl"
                                    : "text-gray-600 hover:bg-[var(--cool-silver)] hover:text-gray-900 rounded-lg"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                    isActive ? "text-[var(--wine-red)]" : "text-gray-400 group-hover:text-gray-500"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-[var(--cool-silver-dark)]">
                <Link
                    href="/settings"
                    onClick={onClose}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-[var(--cool-silver)] hover:text-gray-900 rounded-lg transition-all"
                >
                    <Settings className="mr-3 h-5 w-5 text-gray-400" />
                    System Settings
                </Link>
            </div>
        </div>
    );
}
