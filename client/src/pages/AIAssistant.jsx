import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

/**
 * AIAssistant.jsx — Document-based AI Hub
 */
const AIAssistant = () => {
    const { subject_id } = useParams();

    const [subject, setSubject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [mode, setMode] = useState('qa'); // 'qa' or 'summarize'
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        fetchData();
    }, [subject_id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('Fetching AI Hub Data for Subject ID:', subject_id);

            const [subjectsRes, docsRes] = await Promise.all([
                api.get('/subjects/'),
                api.get(`/documents/${subject_id}`)
            ]);

            console.log('Subjects Response:', subjectsRes);
            console.log('Documents Response:', docsRes);

            const allSubjects = subjectsRes.subjects || [];
            const currentSubject = allSubjects.find(s => s.id === subject_id);
            console.log('Matched Subject:', currentSubject);
            setSubject(currentSubject);

            const docs = docsRes.documents || [];
            console.log('Found Documents:', docs.length);
            setDocuments(docs);

            if (docs.length > 0) {
                console.log('Initial Selected Doc:', docs[0].id);
                setSelectedDocId(docs[0].id);
            }
        } catch (err) {
            console.error('Error fetching AI Assistant data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = async (e) => {
        e.preventDefault();

        console.log('AI Ask Triggered - Current State:');
        console.log('Mode:', mode);
        console.log('Subject ID:', subject_id);
        console.log('Selected Doc ID:', selectedDocId);
        console.log('Question:', question);

        if (!selectedDocId) {
            alert('Please select a document first.');
            return;
        }
        if (mode === 'qa' && !question.trim()) {
            alert('Please enter a question.');
            return;
        }

        try {
            setAsking(true);
            setAnswer('');

            // Final check to ensure we aren't sending the subject_id as the document_id
            if (selectedDocId === subject_id) {
                console.warn('CRITICAL: selectedDocId is identical to subject_id. This is likely an error in document selection logic.');
            }

            const res = await api.post('/ai/ask', {
                mode: mode,
                question: mode === 'qa' ? question.trim() : '',
                document_id: selectedDocId
            });
            setAnswer(res.answer);
        } catch (err) {
            console.error('AI Request Failed:', err);
            alert(err.error || 'AI Service Error. Check if you selected a valid document.');
        } finally {
            setAsking(false);
        }
    };

    if (loading) return (
        <div className="loading-screen">
            Preparing AI Hub...
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Loading Subject: {subject_id}</p>
        </div>
    );

    if (!subject) return (
        <div className="loading-screen">
            <h2>Subject Not Found ❌</h2>
            <p>We couldn't find subject ID: {subject_id}</p>
            <p style={{ fontSize: '0.8rem' }}>Check your Subjects list or try refreshing.</p>
            <Link to="/subjects" className="btn-secondary" style={{ marginTop: '1rem' }}>Back to Subjects</Link>
        </div>
    );

    return (
        <div className="ai-page">
            <header className="page-header">
                <div className="header-title">
                    <Link to={`/subjects/${subject_id}`} className="back-link">← Back to {subject.name}</Link>
                    <h1>AI Study Hub 🤖</h1>
                </div>
            </header>

            <div className="card ai-card">
                <div className="ai-mode-selector">
                    <button
                        className={`mode-btn ${mode === 'qa' ? 'active' : ''}`}
                        onClick={() => setMode('qa')}
                    >
                        🎯 Ask a Question
                    </button>
                    <button
                        className={`mode-btn ${mode === 'summarize' ? 'active' : ''}`}
                        onClick={() => setMode('summarize')}
                    >
                        📝 Summarize Document
                    </button>
                </div>

                <form onSubmit={handleAsk} className="ai-form">
                    <div className="form-group">
                        <label>Select Document</label>
                        <select
                            value={selectedDocId}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                            required
                        >
                            {documents.length > 0 ? (
                                documents.map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.original_name}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No documents uploaded yet</option>
                            )}
                        </select>
                    </div>

                    {mode === 'qa' && (
                        <div className="form-group">
                            <label>Your Question</label>
                            <textarea
                                placeholder="e.g. What is the definition of SQL injection?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                required
                                rows="3"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={asking || documents.length === 0}
                        style={{ background: 'var(--primary-gradient)', marginTop: '1rem' }}
                    >
                        {asking ? 'AI is processing...' : (mode === 'qa' ? 'Find Answer' : 'Generate Summary')}
                    </button>
                </form>

                {answer && (
                    <div className="answer-section">
                        <div className="answer-bubble">
                            <h4>✨ {mode === 'qa' ? 'AI Answer:' : 'AI Summary:'}</h4>
                            <p>{answer}</p>
                        </div>
                    </div>
                )}

                {asking && (
                    <div className="answer-section">
                        <div className="loading-indicator">
                            {mode === 'qa' ? 'Searching document...' : 'Generative Summary in progress...'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAssistant;
