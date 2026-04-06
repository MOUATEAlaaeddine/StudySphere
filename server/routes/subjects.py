"""
routes/subjects.py — Subject management routes
Each subject belongs to a user and has a name + hex color for the UI.

Routes (prefix: /api/subjects):
  GET    /               — list all subjects for current user
  POST   /               — create a new subject
  DELETE /<subject_id>   — delete a subject
"""
from flask import Blueprint, request, jsonify, session
from bson import ObjectId
from datetime import datetime

from db import get_db

subjects_bp = Blueprint('subjects', __name__)


def serialize_subject(subject):
    """Convert MongoDB subject document to JSON-safe dict."""
    return {
        'id':         str(subject['_id']),
        'user_id':    str(subject['user_id']),
        'name':       subject['name'],
        'color':      subject['color'],
        'created_at': subject['created_at'].isoformat(),
    }


# ─────────────────────────────────────────────────────────────
# GET /api/subjects/
# ─────────────────────────────────────────────────────────────
@subjects_bp.route('/', methods=['GET'])
def get_subjects():
    """Return all subjects for the logged-in user."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db       = get_db()
    subjects = list(db.subjects.find(
        {'user_id': ObjectId(user_id)},
        sort=[('created_at', 1)]
    ))

    return jsonify({'subjects': [serialize_subject(s) for s in subjects]}), 200


# ─────────────────────────────────────────────────────────────
# POST /api/subjects/
# ─────────────────────────────────────────────────────────────
@subjects_bp.route('/', methods=['POST'])
def create_subject():
    """
    Create a new subject.
    Expects JSON: { name, color }  — color is a hex string e.g. "#4f46e5"
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db   = get_db()
    data = request.get_json()

    name  = data.get('name', '').strip()
    color = data.get('color', '#6366f1').strip()

    if not name:
        return jsonify({'error': 'name is required'}), 400

    subject = {
        'user_id':    ObjectId(user_id),
        'name':       name,
        'color':      color,
        'created_at': datetime.utcnow(),
    }
    result = db.subjects.insert_one(subject)
    subject['_id'] = result.inserted_id

    return jsonify({'message': 'Subject created', 'subject': serialize_subject(subject)}), 201


# ─────────────────────────────────────────────────────────────
# DELETE /api/subjects/<subject_id>
# ─────────────────────────────────────────────────────────────
@subjects_bp.route('/<subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    """
    Delete a subject and its related documents and messages.
    Only the owner can delete.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db     = get_db()
    result = db.subjects.delete_one(
        {'_id': ObjectId(subject_id), 'user_id': ObjectId(user_id)}
    )

    if result.deleted_count == 0:
        return jsonify({'error': 'Subject not found or not yours'}), 404

    # Cascade: clean up related documents and messages
    db.documents.delete_many({'subject_id': subject_id})
    db.messages.delete_many({'subject_id': subject_id})

    return jsonify({'message': 'Subject deleted'}), 200
