import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SessionDetailModal from '../components/SessionDetailModal';

/**
 * Calendar.jsx — Weekly Revision Planner
 * Features:
 *  - Weekly view (Mon to Sun) with Navigation (Prev/Next)
 *  - Sessions shown with Subject Colors
 *  - Timezone-safe date comparison (Local ISO)
 *  - Modal to add new exams + Immediate Refresh
 */
const Calendar = () => {
    const [sessions, setSessions] = useState([]);
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newExam, setNewExam] = useState({ subject: '', exam_date: '', description: '' });
    const [selectedSession, setSelectedSession] = useState(null);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

    // Week navigation state (0 = current week, -1 = last week, 1 = next week)
    const [weekOffset, setWeekOffset] = useState(0);
    const [expandedDays, setExpandedDays] = useState({}); // {dateStr: boolean}

    useEffect(() => {
        fetchCalendarData();
    }, []);

    const fetchCalendarData = async () => {
        try {
            setLoading(true);
            const [sessionsRes, examsRes, subjectsRes] = await Promise.all([
                api.get('/planning/'),
                api.get('/exams/'),
                api.get('/subjects/'),
            ]);
            setSessions(sessionsRes.sessions || []);
            setExams(examsRes.exams || []);
            setSubjects(subjectsRes.subjects || []);
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSessionModal = (session) => {
        setSelectedSession(session);
        setIsSessionModalOpen(true);
    };

    const handleUpdateSession = (updatedSession) => {
        setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
        setSelectedSession(updatedSession);
    };

    const handleAddExam = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/exams/', newExam);
            setExams([...exams, res.exam]);
            setShowModal(false);
            setNewExam({ subject: '', exam_date: '', description: '' });

            if (window.confirm('Exam added! Do you want to sub-generate your planning to include this?')) {
                const planRes = await api.post('/planning/generate');
                setSessions(planRes.sessions);
            }
        } catch (err) {
            alert(err.error || 'Failed to add exam');
        }
    };

    // ── Helper: Get YYYY-MM-DD in LOCAL time ────────────────────
    const getLocalDateString = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // ── Helper: Get days of the week based on offset ─────────────
    const getWeekDays = (offset) => {
        const now = new Date();
        now.setDate(now.getDate() + (offset * 7)); // Shift by weeks

        const startOfWeek = new Date(now);
        const day = now.getDay(); // 0 is Sun, 1 is Mon
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = getWeekDays(weekOffset);
    const todayStr = getLocalDateString(new Date());

    if (loading) return <div className="loading-screen">Loading calendar...</div>;

    return (
        <div className="calendar-page">
            <header className="page-header calendar-nav-header">
                <div className="header-left">
                    <h1>Planning de révision</h1>
                    <div className="week-nav-controls">
                        <button className="btn-nav" onClick={() => setWeekOffset(prev => prev - 1)}>← Previous</button>
                        <span className="current-week-label">
                            {weekOffset === 0 ? "Cette Semaine" : `Semaine ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
                        </span>
                        <button className="btn-nav" onClick={() => setWeekOffset(prev => prev + 1)}>Next →</button>
                        {weekOffset !== 0 && <button className="btn-text" onClick={() => setWeekOffset(0)}>Aujourd'hui</button>}
                    </div>
                </div>
                <button className="btn-primary add-exam-btn" onClick={() => setShowModal(true)}>
                    + Add New Exam
                </button>
            </header>

            <div className="calendar-grid">
                {weekDays.map((date, idx) => {
                    const dateStr = getLocalDateString(date);
                    const daysSessions = sessions.filter(s => s.date.startsWith(dateStr));
                    const daysExams = exams.filter(e => e.exam_date.startsWith(dateStr));

                    return (
                        <div key={idx} className={`calendar-day ${dateStr === todayStr ? 'today' : ''} ${date < new Date(todayStr) ? 'past' : ''}`}>
                            <div className="day-header">
                                <span className="day-name">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                                <span className="day-number">{date.getDate()}</span>
                            </div>

                            <div className="day-content">
                                {/* Exams Section */}
                                {daysExams.map(exam => (
                                    <div key={exam.id} className="calendar-item exam-item" title={exam.description}>
                                        <span className="item-icon">🚨</span>
                                        <strong>{exam.subject}</strong>
                                    </div>
                                ))}

                                {/* Sessions Section */}
                                {(() => {
                                    const isExpanded = expandedDays[dateStr];
                                    const visibleSessions = isExpanded ? daysSessions : daysSessions.slice(0, 3);
                                    const remainingCount = daysSessions.length - 3;

                                    return (
                                        <>
                                            {visibleSessions.map(session => {
                                                const subject = subjects.find(s => s.id === session.subject_id || s.name === session.subject_name);
                                                const themeColor = subject ? subject.color : '#4f46e5';

                                                return (
                                                    <div
                                                        key={session.id}
                                                        className={`calendar-item session-item-v2 ${session.status}`}
                                                        onClick={() => handleOpenSessionModal(session)}
                                                        style={{ borderLeft: `4px solid ${themeColor}` }}
                                                    >
                                                        <div className="session-card-top">
                                                            <span className="session-subject-name">{session.subject_name}</span>
                                                            <div className={`status-dot ${session.status}`}></div>
                                                        </div>
                                                        <div className="session-card-bottom">
                                                            <span className="session-duration-tag">⏳ {session.duration_hours}h</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {remainingCount > 0 && !isExpanded && (
                                                <button
                                                    className="show-more-btn"
                                                    onClick={() => setExpandedDays({ ...expandedDays, [dateStr]: true })}
                                                >
                                                    + {remainingCount} de plus
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}

                                {daysSessions.length === 0 && daysExams.length === 0 && (
                                    <div className="empty-day">Chill Day ☕</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal: Add Exam */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="card modal-content">
                        <h2>Add New Exam</h2>
                        <form onSubmit={handleAddExam}>
                            <div className="form-group">
                                <label>Subject</label>
                                <select
                                    value={newExam.subject}
                                    onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select a subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Exam Date</label>
                                <input
                                    type="date"
                                    value={newExam.exam_date}
                                    onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Topics / Description (optional)</label>
                                <textarea
                                    value={newExam.description}
                                    onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                                    placeholder="e.g. Chapters 1-5, Multiple choice..."
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Exam</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Session Detail Modal */}
            {isSessionModalOpen && (
                <SessionDetailModal
                    session={selectedSession}
                    onClose={() => setIsSessionModalOpen(false)}
                    onUpdate={handleUpdateSession}
                />
            )}
        </div>
    );
};

export default Calendar;
