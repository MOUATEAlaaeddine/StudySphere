import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * SessionDetailModal.jsx — Interactive Detail View for a Session
 * Features:
 *  - Display Study Method, Objectives, and Tips
 *  - Checklist for Objectives with Auto-Complete
 *  - Status cycle (Todo -> In Progress -> Done)
 *  - "Get away from phone" banner
 *  - GPT-4o Task Generation (if PDF exists)
 *  - Link to subject PDFs
 */
const SessionDetailModal = ({ session, onClose, onUpdate }) => {
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (session?.subject_id) {
            fetchDocs();
        }
    }, [session?.subject_id]);

    const fetchDocs = async () => {
        try {
            setLoadingDocs(true);
            const res = await api.get(`/documents/${session.subject_id}`);
            setDocs(res.documents || []);
        } catch (err) {
            console.error('Error fetching docs:', err);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleStatusCycle = async () => {
        const statuses = ['todo', 'in_progress', 'done'];
        const currentIndex = statuses.indexOf(session.status || 'todo');
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];
        await updateSession({ status: nextStatus });
    };

    const markComplete = async () => {
        await updateSession({ status: 'done' });
    };

    const updateSession = async (updates) => {
        try {
            setUpdating(true);
            // If status is becoming 'done', ensure is_done is true
            if (updates.status === 'done') updates.is_done = true;

            const res = await api.patch(`/planning/${session.id}`, updates);
            onUpdate(res.session);
        } catch (err) {
            alert('Failed to update session');
        } finally {
            setUpdating(false);
        }
    };

    const toggleObjective = async (index) => {
        const newObjectives = [...session.key_objectives];
        newObjectives[index].done = !newObjectives[index].done;

        // Check if all objectives are now done
        const allDone = newObjectives.every(obj => obj.done);
        const updates = { key_objectives: newObjectives };

        if (allDone && session.status !== 'done') {
            updates.status = 'done';
            updates.is_done = true;
        }

        await updateSession(updates);
    };

    const generateAiTasks = async (docId) => {
        try {
            setGenerating(true);
            const res = await api.post('/ai/ask', {
                document_id: docId,
                mode: 'tasks'
            });

            if (res.plan) {
                const updates = {
                    study_method: res.plan.method,
                    key_objectives: res.plan.tasks.map(t => ({ text: t, done: False })),
                    revision_tips: res.plan.tips,
                    is_ai_generated: true
                };
                await updateSession(updates);
            }
        } catch (err) {
            alert('Failed to generate AI tasks: ' + (err.error || err.message));
        } finally {
            setGenerating(false);
        }
    };

    if (!session) return null;

    // Helper for status label
    const getStatusLabel = (s) => {
        if (s === 'todo') return 'À faire';
        if (s === 'in_progress') return 'En cours';
        return 'Terminé';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="card modal-content session-detail-modal" onClick={e => e.stopPropagation()}>
                {/* Phone Reminder Banner */}
                <div className="phone-reminder-banner">
                    📵 <span>Laisse ton téléphone dans une autre pièce — Focus maximum !</span>
                </div>

                <header className="modal-header-detail">
                    <div className="modal-title-group">
                        <div className="title-row">
                            <h2>{session.subject_name}</h2>
                            <span className={`status-badge-chip ${session.status}`}>
                                {getStatusLabel(session.status)}
                            </span>
                        </div>
                        <p className="modal-meta-text">
                            📅 {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • ⏳ {session.duration_hours}h
                        </p>
                    </div>
                    <button className="close-x-btn" onClick={onClose}>&times;</button>
                </header>

                <div className="modal-scroll-body">
                    <section className="modal-detail-section">
                        <div className="section-title-row">
                            <h3>💡 Méthode d'étude</h3>
                            {docs.length > 0 && !session.is_ai_generated && (
                                <button
                                    className="btn-ai-sparkle"
                                    onClick={() => generateAiTasks(docs[0].id)}
                                    disabled={generating}
                                >
                                    {generating ? '⌛...' : '✨ Optimiser avec l\'IA'}
                                </button>
                            )}
                        </div>
                        <p className="method-text">{session.study_method || "Générez un plan d'étude pour commencer."}</p>
                    </section>

                    <section className="modal-detail-section">
                        <h3>🎯 Checklist de révision</h3>
                        <div className="objectives-list">
                            {session.key_objectives?.length > 0 ? (
                                session.key_objectives.map((obj, i) => (
                                    <div key={i} className="objective-row">
                                        <div className="pretty-checkbox" onClick={() => toggleObjective(i)}>
                                            <input
                                                type="checkbox"
                                                readOnly
                                                checked={obj.done}
                                            />
                                            <span className="checkmark"></span>
                                        </div>
                                        <label className={obj.done ? 'done' : ''} onClick={() => toggleObjective(i)}>
                                            {obj.text}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-mini">Aucun objectif défini.</p>
                            )}
                        </div>
                    </section>

                    <section className="modal-detail-section">
                        <h3>📌 Conseils Pratiques</h3>
                        <ul className="tips-bullet-list">
                            {session.revision_tips?.map((tip, i) => (
                                <li key={i}>{tip}</li>
                            ))}
                        </ul>
                    </section>

                    {docs.length > 0 && (
                        <section className="modal-detail-section">
                            <h3>📂 Supports de cours liés</h3>
                            <div className="docs-link-grid">
                                {docs.map(doc => (
                                    <a
                                        key={doc.id}
                                        href={`http://127.0.0.1:5001/api/documents/download/${doc.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="doc-mini-card"
                                    >
                                        <span className="doc-icon-small">📄</span>
                                        <div className="doc-info-mini">
                                            <span className="doc-name-small">{doc.original_name}</span>
                                            <span className="doc-action-label">Télécharger PDF</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <footer className="modal-footer-status-v2">
                    <button
                        className={`btn-cycle-status ${session.status}`}
                        onClick={handleStatusCycle}
                        disabled={updating}
                    >
                        Statut: {getStatusLabel(session.status)} (Cliquer pour changer)
                    </button>

                    {session.status !== 'done' && (
                        <button
                            className="btn-complete-session"
                            onClick={markComplete}
                            disabled={updating}
                        >
                            ✓ Terminer la session
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default SessionDetailModal;

