import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import Chat from './pages/Chat';
import AIAssistant from './pages/AIAssistant';

// Styles
import './index.css';

/**
 * App.jsx — Root Component
 * Sets up the React Router and wraps the application in the AuthProvider.
 * Defines public routes (Login, Register) and private routes (all others).
 */
function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />

                            {/* Private Routes (Protected) */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/calendar" element={<Calendar />} />
                                <Route path="/subjects" element={<Subjects />} />
                                <Route path="/subjects/:id" element={<SubjectDetail />} />
                                <Route path="/chat/:subject_id" element={<Chat />} />
                                <Route path="/ai/:subject_id" element={<AIAssistant />} />
                            </Route>

                            {/* Catch-all — redirect to dashboard */}
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
