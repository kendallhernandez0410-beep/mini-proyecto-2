import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import ChatPage from "../pages/ChatPage";
import DashboardPage from "../pages/DashboardPage";
import { useAuth } from "../context/AuthContext";

export function AppRouter() {
  const { isAuthenticated, isRRHH } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={isRRHH ? "/dashboard" : "/chat"} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="rrhh">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? (isRRHH ? "/dashboard" : "/chat") : "/login"} replace />}
      />
    </Routes>
  );
}
