const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        const error = await response.json();
        throw new Error(error.detail || 'Something went wrong');
    }

    return response.json();
}

export const authApi = {
    login: async (formData: FormData) => {
        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },
    getMe: () => apiFetch('/users/me'),
    forgotPassword: (data: { email: string }) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
    resetPassword: (data: any) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
    changePassword: (data: any) => apiFetch('/users/change-password', { method: 'POST', body: JSON.stringify(data) }),
};
