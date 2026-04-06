import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar — Global Navigation Component
 * Shows navigation links based on user authentication status.
 * If logged in: Dashboard, Calendar, Subjects, Logout.
 * If not logged in: Login, Register.
 */
const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [logoError, setLogoError] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/" className="brand-link">
                    {!logoError ? (
                        <img
                            src="/logo.png"
                            alt="StudySphere"
                            className="navbar-logo"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <span className="logo-fallback">SS</span>
                    )}
                </Link>
            </div>

            <div className="navbar-links">
                {user ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/calendar">Calendar</Link>
                        <Link to="/subjects">Subjects</Link>
                        <div className="user-info">
                            <span>{user.name}</span>
                            <button onClick={handleLogout} className="logout-btn">
                                Logout
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
