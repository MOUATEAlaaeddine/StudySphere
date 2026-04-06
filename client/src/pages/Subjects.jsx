import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * Subjects.jsx — Subject Management Page
 * Features:
 *  - List of all subjects as cards
 *  - Color coding for each subject
 *  - Form to add new subjects
 *  - Navigation to SubjectDetail
 */
const Subjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', color: '#4f46e5' });

    const navigate = useNavigate();

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const res = await api.get('/subjects/');
            setSubjects(res.subjects || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/subjects/', newSubject);
            setSubjects([...subjects, res.subject]);
            setShowModal(false);
            setNewSubject({ name: '', color: '#4f46e5' });
        } catch (err) {
            alert(err.error || 'Failed to add subject');
        }
    };

    if (loading) return <div className="loading-screen">Loading subjects...</div>;

    return (
        <div className="subjects-page">
            <header className="page-header">
                <h1>Your Subjects</h1>
                <button className="btn-primary add-subject-btn" onClick={() => setShowModal(true)}>
                    + New Subject
                </button>
            </header>

            <div className="subjects-grid">
                {subjects.map(subject => (
                    <div
                        key={subject.id}
                        className="card subject-card"
                        onClick={() => navigate(`/subjects/${subject.id}`)}
                        style={{ borderTop: `6px solid ${subject.color}` }}
                    >
                        <div className="subject-icon" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                            📚
                        </div>
                        <h3>{subject.name}</h3>
                        <p className="subject-meta">Click to view course PDFs & Chat</p>
                    </div>
                ))}

                {subjects.length === 0 && (
                    <div className="empty-state-container card">
                        <p>You haven't added any subjects yet.</p>
                        <p className="hint">Add your university courses here to start organizing your revision!</p>
                    </div>
                )}
            </div>

            {/* Add Subject Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="card modal-content">
                        <h2>Add New Subject</h2>
                        <form onSubmit={handleAddSubject}>
                            <div className="form-group">
                                <label>Subject Name</label>
                                <input
                                    type="text"
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    placeholder="e.g. Data Science"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Theme Color</label>
                                <div className="color-picker-container">
                                    <input
                                        type="color"
                                        value={newSubject.color}
                                        onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                                    />
                                    <span>Pick a color for your dashboard and calendar</span>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subjects;
