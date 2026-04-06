import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SessionDetailModal from '../components/SessionDetailModal';
import { io } from 'socket.io-client';

/**
 * Dashboard.jsx — Main User Dashboard (v2 — Real-time)
 */
const Dashboard = () => {
    const { user } = useAuth();
    const [exams, setExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [countdown, setCountdown] = useState("");

    const socketRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
        setupSocket();

        const timer = setInterval(updateCountdown, 60000);
        return () => {
            clearInterval(timer);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        updateCountdown();
    }, [exams]);

    const setupSocket = () => {
        const socket = io('http://localhost:5001', { withCredentials: true });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_room', { user_id: user?.id });
        });

        socket.on('progress_update', () => {
            fetchDashboardData();
        });
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [examsRes, sessionsRes, subjectsRes] = await Promise.all([
                api.get('/exams/'),
                api.get('/planning/'),
                api.get('/subjects/')
            ]);
            setExams(examsRes.exams || []);
            setSessions(sessionsRes.sessions || []);
            setSubjects(subjectsRes.subjects || []);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateCountdown = () => {
        if (!exams.length) return;

        const next = [...exams]
            .filter(e => new Date(e.exam_date) > new Date())
            .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0];

        if (!next) {
            setCountdown("Pas d'examens prévus");
            return;
        }

        const diff = new Date(next.exam_date) - new Date();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        setCountdown(`Dans ${days}j ${hours}h`);
    };

    const handleOpenModal = (session) => {
        setSelectedSession(session);
        setIsModalOpen(true);
    };

    const handleUpdateSession = (updatedSession) => {
        setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
        setSelectedSession(updatedSession);
    };

    const handleGeneratePlanning = async () => {
        try {
            setGenerating(true);
            const res = await api.post('/planning/generate');
            setSessions(res.sessions || []);
            alert(res.message || 'Planning généré avec succès !');
        } catch (err) {
            alert(err.error || 'Erreur lors de la génération. Ajoutez des examens d\'abord.');
        } finally {
            setGenerating(false);
        }
    };

    // ── Calculations ──────────────────────────────────────────
    const totalSessions = sessions.length;
    const doneSessions = sessions.filter(s => s.status === 'done').length;
    const progressPercent = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;

    const getMotivationalMessage = () => {
        if (progressPercent <= 30) return "C'est un bon début ! La régularité est la clé. Continue comme ça ! 🚀";
        if (progressPercent <= 70) return "Beau travail ! Tu as fait plus du tiers. Garde ce rythme ! 💪";
        return "Presque au bout ! Tu y es presque, ne lâche rien maintenant ! ✨";
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date.startsWith(todayStr));

    if (loading) return <div className="loading-screen">Chargement...</div>;

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <h1>Bonjour {user?.name} ! 👋</h1>
                <p>{getMotivationalMessage()}</p>
            </header>

            <div className="stats-grid-v2">
                {/* Overall Progress */}
                <div className="card stat-card-v2 progress-main">
                    <h3>🏆 Progression Globale</h3>
                    <div className="progress-content">
                        <div className="progress-value-row">
                            <span className="percent-val">{progressPercent}%</span>
                            <span className="count-val">{doneSessions} / {totalSessions} sessions</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Exam Countdown */}
                <div className="card stat-card-v2 countdown-main">
                    <h3>🚨 Prochain Examen</h3>
                    <div className="countdown-content">
                        <p className="countdown-timer">{countdown}</p>
                        <p className="countdown-subject">
                            {exams.length > 0 ? exams[0].subject : "Optimise ton planning !"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="dashboard-layout-v2">
                {/* Left: Today's Focus */}
                <div className="dashboard-col focus-col">
                    <div className="section-head">
                        <h2>📅 Focus d'aujourd'hui</h2>
                        <span className="badge-today">{todaySessions.length} session(s)</span>
                    </div>

                    <div className="sessions-stack">
                        {todaySessions.length > 0 ? (
                            todaySessions.map(session => {
                                const subject = subjects.find(s => s.id === session.subject_id || s.name === session.subject_name);
                                const color = subject ? subject.color : '#4f46e5';

                                return (
                                    <div
                                        key={session.id}
                                        className={`card dashboard-session-card ${session.status}`}
                                        style={{ borderLeftColor: color }}
                                        onClick={() => handleOpenModal(session)}
                                    >
                                        <div className="sess-time-col">
                                            <span className="sess-hour">⏳ {session.duration_hours}h</span>
                                            {session.status === 'in_progress' && (
                                                <div className="live-pulse">
                                                    <span className="dot"></span> LIVE
                                                </div>
                                            )}
                                        </div>
                                        <div className="sess-info-col">
                                            <span className="sess-subject">{session.subject_name}</span>
                                            <span className="sess-status-text">
                                                {session.status === 'done' ? '✓ Terminé' :
                                                    session.status === 'in_progress' ? '⚡ En cours' : '📅 À faire'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="card empty-state-card-v2">
                                <p>Rien de prévu pour aujourd'hui. Profites-en pour te reposer ! ☕</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Subjects Overview */}
                <div className="dashboard-col subjects-col">
                    <div className="section-head">
                        <h2>📚 Par Matière</h2>
                    </div>
                    <div className="subject-progress-list card">
                        {subjects.length > 0 ? (
                            subjects.map(subject => {
                                const subSessions = sessions.filter(s => s.subject_id === subject.id || s.subject_name === subject.name);
                                const subDone = subSessions.filter(s => s.status === 'done').length;
                                const subTotal = subSessions.length;
                                const subPercent = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

                                return (
                                    <div key={subject.id} className="subject-progress-row">
                                        <div className="sub-head">
                                            <span className="sub-name">{subject.name}</span>
                                            <span className="sub-stats">{subDone}/{subTotal}</span>
                                        </div>
                                        <div className="mini-bar">
                                            <div
                                                className="mini-bar-fill"
                                                style={{ width: `${subPercent}%`, backgroundColor: subject.color }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="hint">Ajoute des matières pour suivre ta progression.</p>
                        )}
                    </div>

                    <button
                        onClick={handleGeneratePlanning}
                        className="btn-primary-v2 generate-btn-v2"
                        disabled={generating}
                    >
                        {generating ? 'Génération...' : '✨ Régénérer mon planning'}
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <SessionDetailModal
                    session={selectedSession}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={handleUpdateSession}
                />
            )}
        </div>
    );
};

export default Dashboard;

