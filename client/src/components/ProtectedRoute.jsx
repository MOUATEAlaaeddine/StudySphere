import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — Access Control Component
 * Wraps routes that require authentication.
 * If the user is not logged in, they are redirected to /login.
 * While the session is being checked, a loading state is shown.
 */
const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Authenticating StudySphere...</div>;
    }

    // If there's no user, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If there's a user, render the child routes (via Outlet)
    return <Outlet />;
};

export default ProtectedRoute;
