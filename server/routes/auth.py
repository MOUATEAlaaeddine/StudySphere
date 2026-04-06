"""
routes/auth.py — Authentication routes
Handles user registration, login, logout, and fetching the current user.
Uses Flask sessions for auth state and werkzeug for password hashing.

Routes:
  POST /api/auth/register   — create a new account
  POST /api/auth/login      — log in with email + password
  POST /api/auth/logout     — clear the session
  GET  /api/auth/me         — return current logged-in user info
"""
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from datetime import datetime

from db import get_db

# Blueprint registered in app.py with prefix /api/auth
auth_bp = Blueprint('auth', __name__)


def serialize_user(user):
    """
    Convert a MongoDB user document to a JSON-safe dict.
    Converts ObjectId → string and excludes the password field.
    """
    return {
        'id':         str(user['_id']),
        'name':       user['name'],
        'email':      user['email'],
        'created_at': user['created_at'].isoformat(),
    }


# ─────────────────────────────────────────────────────────────
# POST /api/auth/register
# ─────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Create a new user account.
    Expects JSON body: { name, email, password }
    Returns 201 + user object on success, 400/409 on error.
    """
    db   = get_db()
    data = request.get_json()

    # ── Validation ─────────────────────────────────────────────
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'name, email, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # ── Check duplicate email ───────────────────────────────────
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'An account with this email already exists'}), 409

    # ── Insert new user ─────────────────────────────────────────
    new_user = {
        'name':       name,
        'email':      email,
        'password':   generate_password_hash(password),  # never store plaintext
        'created_at': datetime.utcnow(),
    }
    result = db.users.insert_one(new_user)
    new_user['_id'] = result.inserted_id

    return jsonify({
        'message': 'Account created successfully',
        'user':    serialize_user(new_user),
    }), 201


# ─────────────────────────────────────────────────────────────
# POST /api/auth/login
# ─────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Log in with email + password.
    Expects JSON body: { email, password }
    On success: saves user_id in Flask session, returns user object.
    """
    db   = get_db()
    data = request.get_json()

    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    # ── Look up the user ────────────────────────────────────────
    user = db.users.find_one({'email': email})

    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # ── Save user_id in session ─────────────────────────────────
    session['user_id'] = str(user['_id'])

    return jsonify({
        'message': 'Logged in successfully',
        'user':    serialize_user(user),
    }), 200


# ─────────────────────────────────────────────────────────────
# POST /api/auth/logout
# ─────────────────────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Clear the Flask session, effectively logging the user out.
    """
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


# ─────────────────────────────────────────────────────────────
# GET /api/auth/me
# ─────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
def me():
    """
    Return the currently logged-in user's info.
    Reads user_id from the session and fetches from MongoDB.
    Returns 401 if no session exists.
    """
    db      = get_db()
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    user = db.users.find_one({'_id': ObjectId(user_id)})

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': serialize_user(user)}), 200
