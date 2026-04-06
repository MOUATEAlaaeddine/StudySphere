import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create the context
const AuthContext = createContext();

/**
 * AuthProvider — Context Provider
 * Manages the global authentication state: user, loading, and error.
 * Provides login, logout, and checkMe functions.
 * Also configures axios defaults for session-based auth (withCredentials).
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Configure axios to include cookies in every request (for Flask sessions)
    axios.defaults.withCredentials = true;

    // ── Sync user session with backend on mount ─────────────────────────────
    useEffect(() => {
        checkMe();
    }, []);

    const checkMe = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/auth/me');
            setUser(res.data.user);
        } catch (err) {
            // Not authenticated or session expired — that's fine
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setError(null);
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            setUser(res.data.user);
            return res.data.user;
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            throw err;
        }
    };

    const register = async (name, email, password) => {
        setError(null);
        try {
            await axios.post('/api/auth/register', { name, email, password });
            // Redirect or login automatically
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
            throw err;
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout, checkMe }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook for easy access to AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
