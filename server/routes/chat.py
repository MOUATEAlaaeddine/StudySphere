"""
routes/chat.py — Chat message retrieval route
Real-time messaging is handled by Socket.IO in app.py.
This route only handles fetching message history.

Routes (prefix: /api/chat):
  GET  /<subject_id>  — return the last 50 messages for a subject
                        (only if the subject belongs to the logged-in user)
"""
from flask import Blueprint, jsonify, session
from bson import ObjectId

from db import get_db

chat_bp = Blueprint('chat', __name__)


# ─────────────────────────────────────────────────────────────
# GET /api/chat/<subject_id>
# ─────────────────────────────────────────────────────────────
@chat_bp.route('/<subject_id>', methods=['GET'])
def get_messages(subject_id):
    """
    Return the last 50 messages for a given subject, oldest first.
    Verifies the subject belongs to the requesting user before returning
    any data — prevents cross-user data leakage.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db = get_db()

    # ── Ownership check: subject must belong to this user ────
    try:
        subject = db.subjects.find_one({
            '_id':     ObjectId(subject_id),
            'user_id': ObjectId(user_id),
        })
    except Exception:
        return jsonify({'error': 'Invalid subject ID'}), 400

    if not subject:
        return jsonify({'error': 'Subject not found or not yours'}), 403

    # Fetch 50 most recent messages, then reverse so oldest is first
    messages = list(db.messages.find(
        {'subject_id': subject_id},
        sort=[('sent_at', -1)],
        limit=50
    ))
    messages.reverse()

    serialized = []
    for m in messages:
        serialized.append({
            'id':        str(m['_id']),
            'user_id':   str(m.get('user_id', '')),
            'user_name': m['user_name'],
            'content':   m['content'],
            'sent_at':   m['sent_at'].isoformat(),
        })

    return jsonify({'messages': serialized}), 200

