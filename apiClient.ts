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
        // Trim whitespace and trailing slashes to avoid accidental "/api " or similar
        if (typeof url === 'string') {
            return url.trim().replace(/\/+$/, '');
        }
        return 'http://localhost:8000/api';
    } catch {
        return 'http://localhost:8000/api';
    }
};

// Re-resolve base URL on each access so runtime fallback (e.g. Render) works after hydration
export function getAPIBaseURL(): string {
    return getApiBaseUrl().trim();
}
export const API_BASE_URL = getApiBaseUrl().trim();

// Debug helper: log resolved base URL during development to catch trailing-space issues
if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    const resolved = getApiBaseUrl();
    const trimmed = resolved.trim();
    console.debug('[apiClient] Raw API_BASE_URL:', JSON.stringify(resolved));
    console.debug('[apiClient] Trimmed API_BASE_URL:', JSON.stringify(trimmed));
    console.debug('[apiClient] Length (raw):', resolved.length, 'Length (trimmed):', trimmed.length);
    if (resolved !== trimmed) {
        console.warn('[apiClient] WARNING: API_BASE_URL has whitespace!', {raw: resolved, trimmed});
    }
}

const api = axios.create({
    baseURL: API_BASE_URL.trim(),
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
        const resolvedBaseURL = getApiBaseUrl().trim();
        config.baseURL = resolvedBaseURL;
        
        // DEBUG: Log the full URL being constructed
        if ((import.meta as any).env?.DEV) {
            const fullUrl = `${config.baseURL}${config.url}`;
            console.debug(`[apiClient] Request: ${config.method?.toUpperCase()} ${fullUrl}`);
        }
        
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
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(
                        `${getApiBaseUrl()}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
                        null,
                        { timeout: 15000 }
                    );
                    const { access_token } = response.data;
                    localStorage.setItem('token', access_token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                if (typeof window !== 'undefined') window.location.href = '/login';
            }
        }
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
    updateProfile: (data: { full_name: string }) => api.patch('/profile/update', data),
    uploadPhoto: (formData: FormData) => api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const profileApi = {
    uploadPhoto: (formData: FormData) => api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateName: (name: string) => api.put('/profile/name', { name }),
    getProfile: () => api.get('/profile/me'),
};

/** Form submission tracking (logs + notifies admin). */
export const formSubmitApi = {
    submit: (formName: string, dataSummary: string | object) =>
        api.post('/form-submit', { form_name: formName, data_summary: dataSummary }),
};

/** Admin-only API (RBAC: requires admin or super_admin). */
export const adminApi = {
    getActivityLogs: (params?: any) =>
        api.get('/admin/activity-logs/', { params }),
    exportActivityLogs: (format: 'csv' = 'csv') =>
        api.get('/admin/activity-logs/export/', { params: { format }, responseType: 'blob' }),
    getFormLogs: (params?: any) =>
        api.get('/admin/form-logs/', { params }),
    getErrorLogs: (params?: any) =>
        api.get('/admin/error-logs/', { params }),
    getSupportTickets: (params?: any) =>
        api.get('/admin/support-tickets/', { params }),
    respondSupportTicket: (ticketId: number, data: { admin_reply?: string; status?: string }) =>
        api.post(`/admin/support-tickets/${ticketId}/respond/`, data),
    getSystemStats: () => api.get('/admin/system-stats'),
    getSettings: () => api.get('/admin/settings/'),
    updateSettings: (data: any) => api.post('/admin/settings/', data),
    getUsers: (status?: string) => api.get('/admin/users/', { params: { status } }),
    approveUser: (userId: number) => api.post(`/admin/users/${userId}/approve`),
    rejectUser: (userId: number) => api.post(`/admin/users/${userId}/reject`),
    deleteUser: (userId: number) => api.post(`/admin/users/${userId}/delete`),
    resetPassword: (userId: number, newPassword: string) => api.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword }),
    getLogs: (skip?: number, limit?: number) => api.get('/admin/logs', { params: { skip, limit } }),
    updateUserStatus: (userId: number, status: string) => api.patch(`/admin/users/${userId}/status`, { status }),
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
    deleteWorkspace: (id: number) => api.delete(`/workspaces/${id}/`),

    // Custom Form Builder
    getForms: (workspaceId: number) => api.get('/expense-forms/', { params: { workspace_id: workspaceId } }),
    createForm: (data: any) => api.post('/expense-forms/', data),
    deleteForm: (formId: number) => api.delete(`/expense-forms/${formId}/`),
    getEntries: (formId: number) => api.get('/expense-forms/entries/'),
    createEntry: (data: any) => api.post('/expense-forms/entries/'),
    deleteEntry: (id: number) => api.delete(`/expense-forms/entries/${id}/`),

    // User Management (Admin Only)
    getUsers: () => api.get('/users/'),
    getPendingUsers: () => api.get('/users/pending/'),
    approveUser: (id: number) => api.post(`/users/${id}/approve/`),
    rejectUser: (id: number) => api.post(`/users/${id}/reject/`),
    deleteUser: (id: number) => api.delete(`/users/${id}/`),
    updateUser: (id: number, data: any) => api.patch(`/users/${id}/`, data),
    resetPassword: (id: number, data: any) => api.post(`/users/${id}/reset-password/`, data),
    logoutEverywhere: (id: number) => api.post(`/users/${id}/logout-everywhere/`),

    // Vendor Management
    getVendors: () => api.get('/vendors/'),
    createVendor: (data: any) => api.post('/vendors/', data),
    updateVendor: (id: number, data: any) => api.put(`/vendors/${id}/`, data),
    deleteVendor: (id: number) => api.delete(`/vendors/${id}/`),
};

/** Support: any authenticated user can create a ticket. */
export const supportApi = {
    createTicket: (message: string) => api.post('/support-tickets/', { message }),
};


/** Notifications: recent activity for current user. */
export const notificationsApi = {
    getNotifications: (params?: { limit?: number }) => api.get('/notifications/', { params }),
};

/** AI Transaction Parser: Natural language to structured transaction data */
export const aiApi = {
    parseTransaction: (text: string) => api.post('/ai/parse-transaction', { text }),
    getParserSuggestions: () => api.get('/ai/parse-suggestions'),
    getRecurringSuggestions: (daysBack?: number) => api.get('/ai/recurring-suggestions', { params: { days_back: daysBack || 90 } }),
};

/** WebSocket: Real-time user presence tracking */
export const presenceApi = {
    getOnlineUsers: () => api.get('/online-users'),
    getOnlineStatus: (userId: number) => api.get(`/online-status/${userId}`),
    connectWebSocket: (token: string) => {
        const protocol = getApiBaseUrl().startsWith('https') ? 'wss' : 'ws';
        const baseUrl = getApiBaseUrl().replace(/^https?:/, '');
        return new WebSocket(`${protocol}:${baseUrl}/api/ws/${token}`);
    },
};

/** AI Assistant: rule-based helper. */
export const assistantApi = {
    query: (query: string) => api.post('/assistant/query', { query }),
};

export default api;
