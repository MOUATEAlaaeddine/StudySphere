import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

/**
 * SubjectDetail.jsx — Subject Resources & Hub
 */
const SubjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [subject, setSubject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subjectsRes, docsRes, examsRes] = await Promise.all([
                api.get('/subjects/'),
                api.get(`/documents/${id}`),
                api.get('/exams/'),
            ]);

            const currentSubject = subjectsRes.subjects.find(s => s.id === id);
            setSubject(currentSubject);
            setDocuments(docsRes.documents || []);

            // Filter exams for ONLY this subject name
            const subjectExams = examsRes.exams.filter(e => e.subject === currentSubject?.name);
            setExams(subjectExams);

        } catch (err) {
            console.error('Error fetching subject details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', id);

        try {
            setUploading(true);
            const res = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDocuments([res.document, ...documents]);
            setFile(null);
            e.target.reset();
        } catch (err) {
            alert(err.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm('Delete this document?')) return;
        try {
            await api.delete(`/documents/${docId}`);
            setDocuments(documents.filter(d => d.id !== docId));
        } catch (err) {
            alert('Failed to delete document');
        }
    };

    if (loading) return <div className="loading-screen">Loading subject resources...</div>;
    if (!subject) return <div className="loading-screen">Subject not found.</div>;

    return (
        <div className="subject-detail-page">
            <header className="page-header" style={{ borderBottom: `4px solid ${subject.color}` }}>
                <div className="header-title">
                    <Link to="/subjects" className="back-link">← Back to Subjects</Link>
                    <h1>{subject.name}</h1>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => navigate('/calendar')}>
                        📅 View Calendar
                    </button>
                    <button className="btn-primary" onClick={() => navigate(`/chat/${id}`)}>
                        💬 Go to Chat
                    </button>
                    <button className="btn-primary" onClick={() => navigate(`/ai/${id}`)} style={{ background: 'var(--primary-gradient)' }}>
                        🤖 Ask AI
                    </button>
                </div>
            </header>

            <div className="detail-grid">
                {/* Information Column */}
                <div className="detail-left-col">
                    {/* Exam Tracking */}
                    <div className="card info-card">
                        <h3>🚩 Upcoming Exams</h3>
                        <div className="exams-mini-list">
                            {exams.length > 0 ? (
                                exams.map(exam => (
                                    <div key={exam.id} className="mini-exam-item">
                                        <span className="exam-date-badge">
                                            {new Date(exam.exam_date).toLocaleDateString()}
                                        </span>
                                        <div className="exam-details">
                                            <strong>{exam.subject}</strong>
                                            <p>{exam.description || 'No description'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No exams scheduled for this subject.</p>
                            )}
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="card upload-card">
                        <h3>📖 Upload Materials</h3>
                        <p className="hint">Extract text for AI Assistant (PDF only)</p>
                        <form onSubmit={handleUpload} className="upload-form">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                required
                            />
                            <button type="submit" className="btn-primary" disabled={uploading} style={{ backgroundColor: subject.color }}>
                                {uploading ? 'Uploading...' : 'Upload PDF'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Documents Column */}
                <div className="detail-right-col">
                    <div className="card documents-card">
                        <h3>📂 Documents ({documents.length})</h3>
                        <div className="docs-list">
                            {documents.length > 0 ? (
                                documents.map(doc => (
                                    <div key={doc.id} className="doc-item">
                                        <div className="doc-info">
                                            <span className="doc-icon">📄</span>
                                            <span className="doc-name">{doc.original_name}</span>
                                        </div>
                                        <button
                                            className="delete-doc-btn"
                                            onClick={() => handleDeleteDoc(doc.id)}
                                            title="Delete document"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No files yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubjectDetail;
