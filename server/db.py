"""
db.py — MongoDB connection singleton
Connects to MongoDB Atlas once and reuses the connection
across all route modules. Call get_db() anywhere to get
the database handle.
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import config

# Module-level singleton — created once on first import
_client = None
_db = None


def get_db():
    """
    Returns the MongoDB database handle.
    Creates the connection on first call, then reuses it.
    The database name 'studysphere' is taken from the MONGO_URI.
    """
    global _client, _db

    if _db is None:
        # Create the MongoClient using the URI from config
        _client = MongoClient(config.MONGO_URI)

        # The database name is embedded in the URI path (/studysphere)
        # but we also specify it explicitly for clarity
        _db = _client.get_database('studysphere')

    return _db


def test_connection():
    """
    Ping the MongoDB server to confirm the connection works.
    Returns True if successful, raises an exception otherwise.
    Used only for the startup health check.
    """
    db = get_db()
    # The 'ping' command is lightweight — just checks connectivity
    db.client.admin.command('ping')
    return True
