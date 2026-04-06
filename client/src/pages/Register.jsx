import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Register.jsx — Registration Page
 * Features:
 *  - Name, Email, and Password form
 *  - Form validation (basic)
 *  - On success: redirect to /login
 *  - Link to Login page
 */
const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, error: authError } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsSubmitting(true);

        if (!name || !email || !password) {
            setLocalError('Please fill in all fields');
            setIsSubmitting(false);
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            setIsSubmitting(false);
            return;
        }

        try {
            await register(name, email, password);
            // Success! Redirect to login so they can sign in
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            // Error handled in AuthContext
            console.error('Registration error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="card auth-card">
                <h1>Join StudySphere</h1>
                <p className="auth-subtitle">Start organizing your revision today</p>

                {/* Error display */}
                {(localError || authError) && (
                    <div className="error-message">
                        {localError || authError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            placeholder="e.g. Alex Johnson"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                        <label htmlFor="password">Password (min 6 characters)</label>
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
                        {isSubmitting ? 'Creating account...' : 'Registers'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
