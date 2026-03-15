"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState<"login" | "request" | "confirm">("login");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const data = await authApi.login(formData);
            localStorage.setItem("token", data.access_token);
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await authApi.forgotPassword({ email });
            setResetMode("confirm");
        } catch (err: any) {
            setError(err.message || "Could not request password reset.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await authApi.resetPassword({ token: resetToken, new_password: newPassword });
            setSuccessMessage("Password reset successful. Please sign in.");
            setResetMode("login");
            setResetToken("");
            setNewPassword("");
        } catch (err: any) {
            setError(err.message || "Invalid reset token or password criteria.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--cool-silver)] px-4 py-12 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--wine-red)] opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[var(--champagne-gold)] opacity-10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-[var(--cool-silver-dark)] relative z-10">
                <div>
                    <div className="h-16 w-16 bg-[var(--wine-red)] text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight uppercase">
                        ManageWare
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 font-medium">
                        {resetMode === "login" ? "Hardware & Portfolio Management System" :
                            resetMode === "request" ? "Account Recovery - Step 1" : "Account Recovery - Step 2"}
                    </p>
                </div>

                {resetMode === "login" && (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm animate-shake">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                                <p className="font-medium">{successMessage}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError("");
                                        }}
                                        className="block w-full pl-11 pr-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent rounded-xl transition-all font-medium"
                                        placeholder="admin@manageware.com"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="flex justify-between items-center mb-1 ml-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setResetMode("request")}
                                        className="text-[10px] font-black text-[var(--wine-red)] uppercase tracking-widest hover:underline"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError("");
                                        }}
                                        className="block w-full pl-11 pr-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent rounded-xl transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--wine-red)] hover:bg-[var(--wine-red-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--wine-red)] transition-all shadow-lg active:scale-95 disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    "Sign In to Dashboard"
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {resetMode === "request" && (
                    <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
                        <p className="text-xs text-center text-gray-500 font-medium px-4">
                            Enter your verified email. We will send a security token to your registered communication channel.
                        </p>

                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block ml-1">
                                Recovery Email
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[var(--wine-red)] transition-colors">
                                    <Mail className="h-5 w-5" />
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent rounded-xl transition-all font-medium"
                                    placeholder="admin@manageware.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[var(--wine-red)] text-white text-sm font-bold rounded-xl shadow-lg hover:bg-[var(--wine-red-light)] transition-all active:scale-95 disabled:opacity-70 flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Request Reset Token"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setResetMode("login")}
                                className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Return to Login
                            </button>
                        </div>
                    </form>
                )}

                {resetMode === "confirm" && (
                    <form className="mt-8 space-y-6" onSubmit={handleConfirmReset}>
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[10px] text-amber-800 font-bold uppercase tracking-widest text-center">
                            Token Sent to {email}
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block ml-1">
                                    Security Token
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="block w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent rounded-xl transition-all font-black text-center tracking-widest"
                                    placeholder="MOCK-RESET-XXXX"
                                />
                            </div>

                            <div className="relative group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block ml-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full px-4 py-3 bg-[var(--cool-silver)]/50 border border-[var(--cool-silver-dark)] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--wine-red-light)] focus:border-transparent rounded-xl transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-70 flex justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify & Activate New Password"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setResetMode("login")}
                                className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Cancel Recovery
                            </button>
                        </div>
                    </form>
                )}

                <div className="text-center">
                    {/* <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        Authorized Access Only • Security Logged
                    </p> */}
                </div>
            </div>
        </div>
    );
}
