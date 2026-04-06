"""
routes/documents.py — PDF document management routes
Handles uploading PDF files and listing them per subject.

Routes (prefix: /api/documents):
  GET    /<subject_id>   — list all PDFs for a subject
  POST   /upload         — upload a new PDF (multipart/form-data)
  DELETE /<doc_id>       — delete a PDF and its file
"""
import os
import uuid
from flask import Blueprint, request, jsonify, session, current_app
from bson import ObjectId
from datetime import datetime
from werkzeug.utils import secure_filename

from db import get_db

documents_bp = Blueprint('documents', __name__)

# Only allow PDF uploads
ALLOWED_EXTENSIONS = {'pdf'}


def allowed_file(filename):
    """Return True if the file has a .pdf extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def serialize_doc(doc):
    """Convert MongoDB document record to JSON-safe dict."""
    return {
        'id':            str(doc['_id']),
        'user_id':       str(doc['user_id']),
        'subject_id':    str(doc['subject_id']),
        'filename':      doc['filename'],       # stored filename on disk
        'original_name': doc['original_name'], # original filename from user
        'uploaded_at':   doc['uploaded_at'].isoformat(),
    }


# ─────────────────────────────────────────────────────────────
# GET /api/documents/<subject_id>
# ─────────────────────────────────────────────────────────────
@documents_bp.route('/<subject_id>', methods=['GET'])
def get_documents(subject_id):
    """Return all PDF documents for a given subject."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db   = get_db()
    docs = list(db.documents.find(
        {'subject_id': subject_id, 'user_id': ObjectId(user_id)},
        sort=[('uploaded_at', -1)]
    ))

    return jsonify({'documents': [serialize_doc(d) for d in docs]}), 200


# ─────────────────────────────────────────────────────────────
# POST /api/documents/upload
# ─────────────────────────────────────────────────────────────
@documents_bp.route('/upload', methods=['POST'])
def upload_document():
    """
    Upload a PDF file for a subject.
    Expects multipart/form-data with fields: file, subject_id
    Saves the file to server/uploads/ with a unique filename.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file       = request.files['file']
    subject_id = request.form.get('subject_id', '')

    if not subject_id:
        return jsonify({'error': 'subject_id is required'}), 400

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    # Generate a unique filename to prevent collisions
    original_name = secure_filename(file.filename)
    unique_name   = f"{uuid.uuid4().hex}_{original_name}"
    upload_folder = current_app.config['UPLOAD_FOLDER']
    save_path     = os.path.join(upload_folder, unique_name)

    file.save(save_path)

    # Save metadata to MongoDB
    db  = get_db()
    doc = {
        'user_id':       ObjectId(user_id),
        'subject_id':    subject_id,
        'filename':      unique_name,    # stored on disk as this name
        'original_name': original_name, # shown to the user
        'uploaded_at':   datetime.utcnow(),
    }
    result = db.documents.insert_one(doc)
    doc['_id'] = result.inserted_id

    return jsonify({'message': 'File uploaded', 'document': serialize_doc(doc)}), 201


# ─────────────────────────────────────────────────────────────
# DELETE /api/documents/<doc_id>
# ─────────────────────────────────────────────────────────────
@documents_bp.route('/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete a document record and remove the file from disk."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db  = get_db()
    doc = db.documents.find_one(
        {'_id': ObjectId(doc_id), 'user_id': ObjectId(user_id)}
    )

    if not doc:
        return jsonify({'error': 'Document not found or not yours'}), 404

    # Remove the file from disk
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path     = os.path.join(upload_folder, doc['filename'])
    if os.path.exists(file_path):
        os.remove(file_path)

    db.documents.delete_one({'_id': ObjectId(doc_id)})
    return jsonify({'message': 'Document deleted'}), 200


# ─────────────────────────────────────────────────────────────
# GET /api/documents/download/<doc_id>
# ─────────────────────────────────────────────────────────────
@documents_bp.route('/download/<doc_id>', methods=['GET'])
def download_document(doc_id):
    """Download a PDF file by its ID."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    db  = get_db()
    doc = db.documents.find_one(
        {'_id': ObjectId(doc_id), 'user_id': ObjectId(user_id)}
    )

    if not doc:
        return jsonify({'error': 'Document not found or not yours'}), 404

    from flask import send_from_directory
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, doc['filename'], as_attachment=True, download_name=doc['original_name'])
