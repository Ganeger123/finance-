import axios from 'axios';

const getApiBaseUrl = (): string => {
    try {
        const env = (import.meta as any).env;
        // In dev, use relative /api so Vite proxy sends same-origin requests (no CORS)
        if (env?.DEV) {
            return '/api';
        }
        // Runtime fallback: if we're on Render frontend, always point to Render API (works even if build-time env was wrong)
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (origin === 'https://panace-web.onrender.com') {
            return 'https://panace-api.onrender.com/api';
        }
        const url = env?.VITE_API_BASE_URL || 'http://localhost:8000/api';
        return typeof url === 'string' ? url.replace(/\/+$/, '') : 'http://localhost:8000/api';
    } catch {
        return 'http://localhost:8000/api';
    }
};

// Re-resolve base URL on each access so runtime fallback (e.g. Render) works after hydration
export function getAPIBaseURL(): string {
    return getApiBaseUrl();
}
export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 45000, // 45s to allow Render free-tier cold start (~30–60s)
    headers: {
        'Accept': 'application/json',
    },
});

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use(
    (config) => {
        // Use current base URL in case it was resolved at runtime (e.g. Render)
        config.baseURL = getApiBaseUrl();
        try {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.warn("LocalStorage access failed", e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh and log network errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Log exact cause for debugging (CORS, connection refused, timeout, etc.)
        console.error('Axios Error Code:', error.code);
        console.error('Axios Config URL:', error.config?.baseURL, error.config?.url);
        if (error.message) console.error('Axios Message:', error.message);
        
        // Log error to backend (non-blocking, fire and forget)
        try {
            const errorData = {
                error_message: error.message || 'Unknown error',
                error_stack: error.stack || '',
                endpoint: error.config?.url || '',
                status_code: error.response?.status || null,
                details: error.response?.data?.detail || JSON.stringify(error.response?.data || {}),
            };
            const token = localStorage.getItem('token');
            axios.post(`${getApiBaseUrl()}/error-log`, errorData, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 5000,
            }).catch(() => {
                // Silently ignore logging failures
            });
        } catch {
            // Ignore error logging failures
        }
        
        // Additional debugging info for network errors
        if (error.code === 'ERR_NETWORK') {
            console.error('🔴 NETWORK ERROR DETECTED:');
            console.error('  - Backend URL:', error.config?.baseURL);
            console.error('  - Endpoint:', error.config?.url);
            console.error('  - This likely means the backend server is not running or not accessible');
            console.error('  - Check:', {
                'Backend running on :8000': 'http://localhost:8000/docs',
                'Frontend proxy configured': 'vite.config.ts',
                'CORS headers present': 'check browser DevTools Network tab'
            });
        }

        const originalRequest = error.config;
        // LOGIN DISABLED - 401 interceptor disabled for testing
        // if (error.response?.status === 401 && !originalRequest._retry) {
        //     originalRequest._retry = true;
        //     try {
        //         const refreshToken = localStorage.getItem('refreshToken');
        //         if (refreshToken) {
        //             const response = await axios.post(
        //                 `${getApiBaseUrl()}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
        //                 null,
        //                 { timeout: 15000 }
        //             );
        //             const { access_token } = response.data;
        //             localStorage.setItem('token', access_token);
        //             api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        //             return api(originalRequest);
        //         }
        //     } catch (refreshError) {
        //         // Refresh token expired or invalid
        //         localStorage.removeItem('token');
        //         localStorage.removeItem('refreshToken');
        //         window.location.href = '/login';
        //     }
        // }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (data: URLSearchParams) => api.post('/auth/login', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }),
    logout: () => api.post('/auth/logout'),
    register: (userData: any) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    passwordChange: (data: { old_password: string; new_password: string }) => api.post('/auth/password-change', data),
    passwordReset: (email: string) => api.post('/auth/password-reset', { email }),
};

/** Form submission tracking (logs + notifies admin). */
export const formSubmitApi = {
    submit: (formName: string, dataSummary: string | object) =>
        api.post('/form-submit', { form_name: formName, data_summary: dataSummary }),
};

/** Admin-only API (RBAC: requires admin or super_admin). */
export const adminApi = {
    getActivityLogs: (params?: { page?: number; page_size?: number; action?: string; status?: string; user_id?: string }) =>
        api.get('/admin/activity-logs', { params }),
    exportActivityLogs: (format: 'csv' = 'csv') =>
        api.get('/admin/activity-logs/export', { params: { format }, responseType: 'blob' }),
    getFormLogs: (params?: { page?: number; page_size?: number }) =>
        api.get('/admin/form-logs', { params }),
    getErrorLogs: (params?: { page?: number; page_size?: number }) =>
        api.get('/admin/error-logs', { params }),
    getSupportTickets: (params?: { page?: number; page_size?: number; status?: string }) =>
        api.get('/admin/support-tickets', { params }),
    respondSupportTicket: (ticketId: number, data: { admin_reply?: string; status?: string }) =>
        api.post(`/admin/support-tickets/${ticketId}/respond`, data),
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data: { email_alerts_enabled?: string; password_min_length?: string; ADMIN_EMAIL?: string }) =>
        api.post('/admin/settings', data),
    getUsers: () => api.get('/admin/users'),
    lockUser: (userId: number, lock: boolean) => api.post(`/admin/users/${userId}/lock`, { lock }),
};

export const financeApi = {
    getExpenses: (params?: any) => api.get('/expenses/', { params }),
    getCategories: () => api.get('/expenses/categories'),
    createExpense: (expense: any) => api.post('/expenses/', expense),
    updateExpense: (id: number, expense: any) => api.put(`/expenses/${id}/`, expense),
    deleteExpense: (id: number) => api.delete(`/expenses/${id}/`),

    getIncomes: (params?: any) => api.get('/income/', { params }),
    createIncome: (income: any) => api.post('/income/', income),
    updateIncome: (id: number, income: any) => api.put(`/income/${id}/`, income),
    deleteIncome: (id: number) => api.delete(`/income/${id}/`),

    getDashboardSummary: (year?: number) => api.get('/dashboard/summary', { params: { year } }),

    downloadReport: (year: number, month: number) => api.get('/reports/monthly-pdf', {
        params: { year, month },
        responseType: 'blob'
    }),

    // Workspaces
    getWorkspaces: () => api.get('/workspaces/'),
    createWorkspace: (data: any) => api.post('/workspaces/', data),
    deleteWorkspace: (id: number) => api.delete(`/workspaces/${id}`),

    // Custom Form Builder
    getForms: (workspaceId: number) => api.get('/expense-forms/', { params: { workspace_id: workspaceId } }),
    createForm: (data: any) => api.post('/expense-forms/', data),
    deleteForm: (formId: number) => api.delete(`/expense-forms/${formId}`),
    getEntries: (formId: number) => api.get('/expense-forms/entries', { params: { form_id: formId } }),
    createEntry: (data: any) => api.post('/expense-forms/entries', data),
    deleteEntry: (id: number) => api.delete(`/expense-forms/entries/${id}`),

    // User Management (Admin Only)
    getUsers: () => api.get('/users/'),
    getPendingUsers: () => api.get('/users/pending'),
    approveUser: (id: number) => api.post(`/users/${id}/approve`),
    rejectUser: (id: number) => api.post(`/users/${id}/reject`),
    deleteUser: (id: number) => api.delete(`/users/${id}`),
    updateUser: (id: number, data: any) => api.patch(`/users/${id}`, data),
    resetPassword: (id: number, data: any) => api.post(`/users/${id}/reset-password`, data),
    logoutEverywhere: (id: number) => api.post(`/users/${id}/logout-everywhere`),

    // Vendor Management
    getVendors: () => api.get('/vendors/'),
    createVendor: (data: any) => api.post('/vendors/', data),
    updateVendor: (id: number, data: any) => api.put(`/vendors/${id}`, data),
    deleteVendor: (id: number) => api.delete(`/vendors/${id}`),
};

/** Support: any authenticated user can create a ticket. */
export const supportApi = {
    createTicket: (message: string) => api.post('/support-tickets', { message }),
};

/** Notifications: recent activity for current user. */
export const notificationsApi = {
    getNotifications: (params?: { limit?: number }) => api.get('/notifications/', { params }),
};

export default api;
