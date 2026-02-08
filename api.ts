
import axios from 'axios';

const getApiBaseUrl = () => {
    try {
        return (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';
    } catch (e) {
        return 'http://localhost:8000/api';
    }
};

const API_BASE_URL = getApiBaseUrl();
console.log("🚀 API Base URL:", API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
});

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use(
    (config) => {
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

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh?refresh_token=${refreshToken}`);
                    const { access_token } = response.data;
                    localStorage.setItem('token', access_token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
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
    register: (userData: any) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
};

export const financeApi = {
    getExpenses: (params?: any) => api.get('/expenses/', { params }),
    getCategories: () => api.get('/expenses/categories'),
    createExpense: (expense: any) => api.post('/expenses/', expense),
    deleteExpense: (id: number) => api.delete(`/expenses/${id}`),

    getIncomes: (params?: any) => api.get('/income/', { params }),
    createIncome: (income: any) => api.post('/income/', income),
    deleteIncome: (id: number) => api.delete(`/income/${id}`),

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

export default api;
