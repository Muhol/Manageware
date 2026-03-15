"use client";

import { Bell, UserCircle, Search, Menu, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { User } from "@/types";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Mock notifications for demonstration
  const notifications = [
    { id: 1, title: "Low Stock Alert", desc: "ThinkPad T14 is below threshold.", time: "10m ago", unread: true },
    { id: 2, title: "PO Generated", desc: "PO-7F9A2B generated for HQ.", time: "1h ago", unread: false },
    { id: 3, title: "New Asset Deployed", desc: "Dell Monitor assigned to Annex.", time: "3h ago", unread: false },
  ];

  useEffect(() => {
    authApi.getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      // Route to inventory page and pass search as a hash or let user handle on page
      router.push(`/inventory?search=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  const hasUnread = notifications.some(n => n.unread);

  return (
    <header className="h-16 border-b border-[var(--cool-silver-dark)] bg-white px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 mr-2 text-gray-600 hover:bg-[var(--cool-silver)] rounded-xl transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="max-w-md hidden md:block flex-1 mr-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors" />
            <input
              type="text"
              placeholder="Search assets, properties, or orders (Press Enter)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-[var(--cool-silver)] border-none text-sm placeholder:text-gray-500 focus:ring-2 focus:ring-[var(--wine-red-light)] transition-all rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          className="md:hidden p-2 text-gray-500 hover:bg-[var(--cool-silver)] rounded-xl"
          onClick={() => {
            const term = prompt("Search inventory:");
            if (term) router.push(`/inventory?search=${encodeURIComponent(term)}`);
          }}
        >
          <Search className="h-5 w-5" />
        </button>

        <div className="relative">
          {/* <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-500 hover:bg-[var(--cool-silver)] transition-colors rounded-xl relative"
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-[var(--wine-red)] border-2 border-white rounded-full"></span>
            )}
          </button> */}

          {/* Notifications Dropdown */}
          {/* {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[var(--cool-silver-dark)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-4 border-b border-[var(--cool-silver-dark)] bg-[var(--cool-silver)]/30 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">System Alerts</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-[var(--wine-red)] hover:underline font-bold uppercase"
                  >
                    Mark read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-[var(--cool-silver-dark)]/50 hover:bg-[var(--cool-silver)]/50 cursor-pointer transition-colors ${n.unread ? 'bg-[var(--wine-red)]/5' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-900">{n.title}</p>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{n.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{n.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-t border-[var(--cool-silver-dark)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">View All Architecture Logs</span>
                </div>
              </div>
            </>
          )} */}
        </div>

        <div className="h-8 w-[1px] bg-[var(--cool-silver-dark)] mx-1 md:mx-2"></div>

        <div className="flex items-center space-x-2 md:space-x-3 group p-1 pr-1 md:pr-3 rounded-xl cursor-default">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || "Loading..."}</span>
            <span className="text-xs font-medium text-[var(--wine-red)] leading-tight">
              {user?.role?.name || "Connecting..."}
            </span>
          </div>
          <UserCircle className="h-8 w-8 text-gray-400 group-hover:text-[var(--wine-red)] transition-colors" />

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
