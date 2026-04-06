import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Chat.jsx — Real-time Subject Chatroom
 * Features:
 *  - Connects to Socket.IO server on mount
 *  - Joins a private room for the specific subject
 *  - Fetches last 50 messages for context
 *  - Real-time message broadcasting and receiving
 *  - Auto-scrolls to newest message
 */
const Chat = () => {
    const { subject_id } = useParams();
    const { user } = useAuth();

    const [subject, setSubject] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // ── 1. Load Subject & History ──────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Get subject name
                const subjectsRes = await api.get('/subjects/');
                const currentSubject = subjectsRes.subjects.find(s => s.id === subject_id);
                setSubject(currentSubject);

                // Get message history
                const chatRes = await api.get(`/chat/${subject_id}`);
                setMessages(chatRes.messages || []);
            } catch (err) {
                console.error('Error fetching chat data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [subject_id]);

    // ── 2. Socket.IO Connection ──────────────────────────────────────────
    useEffect(() => {
        // Initialize socket connection
        // In production, this would be the backend URL. 
        // In dev, Vite proxy handles /socket.io
        socketRef.current = io();

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to Chat Server');
            // Join the subject-specific room
            socket.emit('join_room', { subject_id });
        });

        // Listen for new messages from the server
        socket.on('new_message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => {
            socket.disconnect();
        };
    }, [subject_id]);

    // ── 3. Auto-scroll to bottom ──────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !socketRef.current) return;

        const messageData = {
            subject_id,
            content: input.trim(),
            user_id: user.id,
            user_name: user.name
        };

        // Emit event to server
        socketRef.current.emit('send_message', messageData);

        // Clear input
        setInput('');
    };

    if (loading) return <div className="loading-screen">Entering chatroom...</div>;
    if (!subject) return <div className="loading-screen">Room not found.</div>;

    return (
        <div className="chat-page">
            <header className="page-header chat-header">
                <div className="header-title">
                    <Link to={`/subjects/${subject_id}`} className="back-link">← Back to {subject.name}</Link>
                    <h1>{subject.name} Discussion 💬</h1>
                </div>
                <div className="online-indicator">
                    <span className="dot"></span> Real-time Active
                </div>
            </header>

            <div className="card chat-container">
                <div className="messages-list">
                    {messages.length > 0 ? (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`message-item ${msg.user_name === user.name ? 'own-message' : ''}`}
                            >
                                <div className="message-bubble">
                                    <div className="message-meta">
                                        <span className="msg-user">{msg.user_name}</span>
                                        <span className="msg-time">
                                            {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="msg-content">{msg.content}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-chat">
                            <p>No messages yet. Be the first to say hi!</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="btn-primary send-btn">Send</button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
