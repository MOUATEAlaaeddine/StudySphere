"""
routes/exams.py — Exam CRUD routes
Manages exam entries for the logged-in user.

Routes (prefix: /api/exams):
  GET    /              — list all exams for current user
  POST   /              — create a new exam
  PUT    /<exam_id>     — update an exam
  DELETE /<exam_id>     — delete an exam
"""
from flask import Blueprint, request, jsonify, session
from bson import ObjectId
from datetime import datetime

from db import get_db

exams_bp = Blueprint('exams', __name__)


def require_auth():
    """Return the user_id from session, or None if not logged in."""
    return session.get('user_id')


def serialize_exam(exam):
    """Convert MongoDB exam document to JSON-safe dict."""
    return {
        'id':          str(exam['_id']),
        'user_id':     str(exam['user_id']),
        'subject':     exam['subject'],
        'exam_date':   exam['exam_date'].isoformat(),
        'description': exam.get('description', ''),
        'created_at':  exam['created_at'].isoformat(),
    }


# ─────────────────────────────────────────────────────────────
# GET /api/exams/
# ─────────────────────────────────────────────────────────────
@exams_bp.route('/', methods=['GET'])
def get_exams():
    """Return all exams for the logged-in user, sorted by exam_date."""
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db    = get_db()
    exams = list(db.exams.find(
        {'user_id': ObjectId(user_id)},
        sort=[('exam_date', 1)]   # ascending — closest first
    ))

    return jsonify({'exams': [serialize_exam(e) for e in exams]}), 200


# ─────────────────────────────────────────────────────────────
# POST /api/exams/
# ─────────────────────────────────────────────────────────────
@exams_bp.route('/', methods=['POST'])
def create_exam():
    """
    Create a new exam entry.
    Expects JSON: { subject, exam_date (ISO string), description }
    """
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db   = get_db()
    data = request.get_json()

    subject     = data.get('subject', '').strip()
    exam_date   = data.get('exam_date', '')
    description = data.get('description', '').strip()

    if not subject or not exam_date:
        return jsonify({'error': 'subject and exam_date are required'}), 400

    # Parse ISO date string → datetime object
    try:
        exam_date_dt = datetime.fromisoformat(exam_date.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid exam_date format. Use ISO 8601.'}), 400

    exam = {
        'user_id':     ObjectId(user_id),
        'subject':     subject,
        'exam_date':   exam_date_dt,
        'description': description,
        'created_at':  datetime.utcnow(),
    }
    result = db.exams.insert_one(exam)
    exam['_id'] = result.inserted_id

    return jsonify({'message': 'Exam created', 'exam': serialize_exam(exam)}), 201


# ─────────────────────────────────────────────────────────────
# PUT /api/exams/<exam_id>
# ─────────────────────────────────────────────────────────────
@exams_bp.route('/<exam_id>', methods=['PUT'])
def update_exam(exam_id):
    """Update an existing exam (only the owner can update)."""
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db   = get_db()
    data = request.get_json()

    subject     = data.get('subject', '').strip()
    exam_date   = data.get('exam_date', '')
    description = data.get('description', '').strip()

    updates = {}
    if subject:
        updates['subject'] = subject
    if exam_date:
        try:
            updates['exam_date'] = datetime.fromisoformat(exam_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid exam_date format'}), 400
    if description is not None:
        updates['description'] = description

    result = db.exams.update_one(
        {'_id': ObjectId(exam_id), 'user_id': ObjectId(user_id)},
        {'$set': updates}
    )

    if result.matched_count == 0:
        return jsonify({'error': 'Exam not found or not yours'}), 404

    updated = db.exams.find_one({'_id': ObjectId(exam_id)})
    return jsonify({'message': 'Exam updated', 'exam': serialize_exam(updated)}), 200


# ─────────────────────────────────────────────────────────────
# DELETE /api/exams/<exam_id>
# ─────────────────────────────────────────────────────────────
@exams_bp.route('/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    """Delete an exam (only the owner can delete)."""
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db     = get_db()
    result = db.exams.delete_one(
        {'_id': ObjectId(exam_id), 'user_id': ObjectId(user_id)}
    )

    if result.deleted_count == 0:
        return jsonify({'error': 'Exam not found or not yours'}), 404

    return jsonify({'message': 'Exam deleted'}), 200
