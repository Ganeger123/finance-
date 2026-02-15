import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminActivityPage from '../pages/admin/AdminActivityPage';
import AdminFormsPage from '../pages/admin/AdminFormsPage';
import AdminSupportPage from '../pages/admin/AdminSupportPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="activity" element={<AdminActivityPage />} />
        <Route path="forms" element={<AdminFormsPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
