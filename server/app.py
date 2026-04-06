"""
app.py — Flask application factory
Creates the Flask app, registers all route blueprints,
sets up Flask-SocketIO for real-time chat, and Flask-CORS
so the React frontend can talk to the backend.
"""
import os
from flask import Flask
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from datetime import datetime

import config
from bson import ObjectId
from db import get_db

# ── Create SocketIO instance (accessible to routes) ──────────────────────────
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def create_app():
    """
    Application factory:
    1. Creates the Flask instance
    2. Applies configuration from config.py
    3. Registers all blueprints (route modules)
    4. Initialises SocketIO and CORS
    Returns the configured app.
    """
    app = Flask(__name__)

    # ── Configuration ─────────────────────────────────────────────────────────
    app.secret_key = config.SECRET_KEY
    app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH

    # ── Session cookie security — required for multi-browser isolation ─────────
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE']   = False  # set True in production (HTTPS)

    # Ensure the uploads folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # ── CORS — allow React dev server (port 3000) ─────────────────────────────
    CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

    # ── Register route blueprints ─────────────────────────────────────────────
    from routes.auth import auth_bp
    from routes.exams import exams_bp
    from routes.subjects import subjects_bp
    from routes.planning import planning_bp
    from routes.chat import chat_bp
    from routes.documents import documents_bp
    from routes.ai import ai_bp

    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(exams_bp,     url_prefix='/api/exams')
    app.register_blueprint(subjects_bp,  url_prefix='/api/subjects')
    app.register_blueprint(planning_bp,  url_prefix='/api/planning')
    app.register_blueprint(chat_bp,      url_prefix='/api/chat')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(ai_bp,        url_prefix='/api/ai')

    # ── Attach SocketIO to the app ────────────────────────────────────────────
    socketio.init_app(app)

    return app


# ─────────────────────────────────────────────────────────────────────────────
# Socket.IO Event Handlers
# ─────────────────────────────────────────────────────────────────────────────

@socketio.on('join_room')
def handle_join_room(data):
    """
    Client emits 'join_room' with { subject_id } when they open the Chat page.
    We verify the subject belongs to the requesting user before joining the room,
    so User B cannot eavesdrop on User A's real-time chat.
    """
    from flask import request as flask_request
    from flask import session as flask_session
    subject_id = data.get('subject_id')
    user_id    = flask_session.get('user_id')

    if not user_id:
        return  # reject unauthenticated
    
    # Always join personal user room for dashboard updates
    join_room(str(user_id))

    if subject_id:
        db      = get_db()
        subject = db.subjects.find_one({
            '_id':     ObjectId(subject_id),
            'user_id': ObjectId(user_id),
        })

        if subject:
            join_room(subject_id)  # join subject room for chat


@socketio.on('send_message')
def handle_send_message(data):
    """
    Client emits 'send_message' with:
      { subject_id, content, user_id, user_name }
    We:
      1. Save the message to MongoDB.
      2. Broadcast 'new_message' to everyone in that room.
    """
    db = get_db()
    subject_id = data.get('subject_id')
    user_id    = data.get('user_id')
    user_name  = data.get('user_name')
    content    = data.get('content', '').strip()

    if not subject_id or not content:
        return  # ignore empty/invalid events

    # Build the message document
    message = {
        'subject_id': subject_id,
        'user_id':    ObjectId(user_id) if user_id else None,
        'user_name':  user_name,
        'content':    content,
        'sent_at':    datetime.utcnow(),
    }

    # Save to MongoDB
    db.messages.insert_one(message)

    # Broadcast to all clients in this subject's room
    emit('new_message', {
        'user_name': user_name,
        'content':   content,
        'sent_at':   message['sent_at'].isoformat(),
    }, room=subject_id)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app = create_app()
    # Use threading for async support on this environment
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
