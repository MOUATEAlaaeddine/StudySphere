"""
config.py — Load environment variables from .env file
All configuration values used by the Flask app come from here.
"""
import os
from dotenv import load_dotenv

# Load .env file from the same directory as this file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# MongoDB connection string (MongoDB Atlas)
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/studysphere')

# Flask secret key (used to sign session cookies)
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# GitHub token for GPT-4o via GitHub Models API
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '')

# Folder where uploaded PDFs will be saved (relative to server/)
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')

# Max upload size in bytes (default: 16 MB)
MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
