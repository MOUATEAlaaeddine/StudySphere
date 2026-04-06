import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login.jsx — Login Page
 * Features:
 *  - Email and password form
 *  - Form validation (basic)
 *  - Error message display
 *  - Redirects to /dashboard on success
 *  - Link to Register page
 */
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, error: authError } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsSubmitting(true);

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            setIsSubmitting(false);
            return;
        }

        try {
            await login(email, password);
            // Success! Redirect to dashboard
            navigate('/dashboard');
        } catch (err) {
            // Error is handled in AuthContext and exposed via authError
            console.error('Login error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="card auth-card">
                <h1>Login to StudySphere</h1>
                <p className="auth-subtitle">Organize your revision like a pro</p>

                {/* Show error from context or local validation */}
                {(localError || authError) && (
                    <div className="error-message">
                        {localError || authError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="e.g. alex@university.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
