"""
routes/ai.py — AI assistant route
Uses GPT-4o via GitHub Models API (OpenAI-compatible endpoint).
Supports two modes:
  1. 'qa'        — Ask a specific question about the document
  2. 'summarize' — Summarize the document
"""
import os
import requests
from flask import Blueprint, request, jsonify, session, current_app
from bson import ObjectId
from openai import OpenAI

import config
from db import get_db

ai_bp = Blueprint('ai', __name__)

# GitHub Models endpoint — OpenAI-compatible
GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com"
GPT_MODEL = "gpt-4o"


def get_openai_client():
    """Return an OpenAI client pointed at the GitHub Models endpoint."""
    return OpenAI(
        base_url=GITHUB_MODELS_BASE_URL,
        api_key=config.GITHUB_TOKEN,
    )


def extract_text_from_pdf(file_path):
    """Extract and clean text from a PDF using pdfplumber."""
    import pdfplumber
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"pdfplumber error: {e}")
    # Collapse all whitespace into single spaces
    return ' '.join(text.split())


def call_qa(context, question):
    """
    Ask GPT-4o a specific question about the document context.
    Returns (answer, error).
    """
    client = get_openai_client()

    system_prompt = (
        "You are a helpful study assistant. "
        "Answer the user's question based strictly on the provided document. "
        "Respond in the same language as the document. "
        "Be detailed and educational."
    )

    user_message = (
        f"Document:\n{context[:6000]}\n\n"
        f"Question: {question}\n\n"
        f"Detailed Answer:"
    )

    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        answer = response.choices[0].message.content.strip()
        return answer, None
    except Exception as e:
        return None, f"GPT-4o error: {str(e)}"


def call_summarize(context):
    """
    Ask GPT-4o to produce a structured summary of the document.
    Returns (summary, error).
    """
    client = get_openai_client()

    system_prompt = (
        "You are a helpful study assistant. "
        "Produce a clear, structured summary of the provided document. "
        "Use bullet points and headings where appropriate. "
        "Respond in the same language as the document."
    )

    user_message = (
        f"Please summarize the following document:\n\n{context[:6000]}"
    )

    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=700,
            temperature=0.3,
        )
        summary = response.choices[0].message.content.strip()
        return summary, None
    except Exception as e:
        return None, f"GPT-4o error: {str(e)}"


def call_tasks(context):
    """
    Generate a structured study plan from document content.
    Returns (tasks_object, error).
    """
    client = get_openai_client()

    system_prompt = (
        "You are a professional study coach. "
        "Generate a structured 2-hour revision session plan based on the document. "
        "Format your response as a JSON object with: "
        "'method' (string), 'tasks' (list of 5 strings), 'tips' (list of 3 strings). "
        "Respond in the same language as the document."
    )

    user_message = (
        "Based on this course document, generate a structured study plan for a 2-hour revision session. "
        f"Document Content:\n{context[:6000]}"
    )

    try:
        import json
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            response_format={"type": "json_object"},
            max_tokens=800,
            temperature=0.4,
        )
        content = json.loads(response.choices[0].message.content)
        return content, None
    except Exception as e:
        return None, f"GPT-4o error: {str(e)}"


@ai_bp.route('/ask', methods=['POST'])
def ask_question():
    """
    POST /api/ai/ask
    Body: { document_id, mode, question }
    mode = 'qa', 'summarize', or 'tasks'
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data     = request.get_json()
    doc_id   = data.get('document_id', '').strip()
    mode     = data.get('mode', 'qa')
    question = data.get('question', '').strip()

    # --- Validation ---
    if not doc_id:
        return jsonify({'error': 'document_id is required'}), 400

    if mode not in ('qa', 'summarize', 'tasks'):
        return jsonify({'error': 'mode must be qa, summarize or tasks'}), 400

    if mode == 'qa' and not question:
        return jsonify({'error': 'question is required for QA mode'}), 400

    # Guide user to the right mode if they type summarize keywords
    summarize_keywords = ['summarize', 'summary', 'resume', 'résume',
                          'generate summary', 'what is this about',
                          'explain this document']
    if mode == 'qa' and any(kw in question.lower() for kw in summarize_keywords):
        return jsonify({
            'error': 'It looks like you want a summary. '
                     'Please switch to "Summarize Document" mode above.'
        }), 400

    if not config.GITHUB_TOKEN:
        return jsonify({'error': 'GitHub token not configured on server'}), 500

    # --- Load document ---
    print(f"DEBUG AI: Loading document {doc_id} in mode {mode}")
    try:
        doc_oid = ObjectId(doc_id)
    except Exception:
        print(f"DEBUG AI: Invalid Document ID format: {doc_id}")
        return jsonify({'error': 'Invalid document ID format'}), 400

    db  = get_db()
    doc = db.documents.find_one({'_id': doc_oid})
    if not doc:
        print(f"DEBUG AI: Document {doc_id} not found in DB")
        return jsonify({'error': 'Document not found'}), 404

    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path     = os.path.join(upload_folder, doc['filename'])
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404

    # --- Extract text ---
    context = extract_text_from_pdf(file_path)
    if not context or len(context) < 50:
        return jsonify({'error': 'Could not extract enough text from this PDF.'}), 422

    # --- Call GPT-4o ---
    try:
        if mode == 'summarize':
            answer, error = call_summarize(context)
            return jsonify({'answer': answer}), 200
        elif mode == 'tasks':
            plan, error = call_tasks(context)
            if error:
                return jsonify({'error': error}), 503
            return jsonify({'plan': plan}), 200
        else:
            answer, error = call_qa(context, question)
            if error:
                return jsonify({'error': error}), 503
            return jsonify({'answer': answer}), 200

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
