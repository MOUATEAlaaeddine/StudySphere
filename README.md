# StudySphere 🎓

StudySphere is a premium, full-stack web application designed to help university students organize their exam revision. It features smart planning, secure document management, real-time collaboration, and an AI-powered assistant.

## ✨ Features

-   🔐 **Secure Auth**: Session-based navigation with hashed passwords.
-   📅 **Smart Planning**: Auto-generates a 2-hour revision block every 2 days for every upcoming exam.
-   📚 **Subject Hubs**: Organize your courses by theme and color.
-   💬 **Real-time Chat**: Discussion rooms for every subject using Socket.IO.
-   📄 **PDF Management**: Upload and manage your course materials directly in the app.
-   🤖 **AI Assistant**: Ask questions directly about your uploaded PDFs using the Hugging Face Inference API.

## 🛠️ Tech Stack

-   **Frontend**: React 18, Vite, React Router 6, Axios, Socket.IO Client.
-   **Backend**: Python 3.10+, Flask, Flask-SocketIO, Flask-CORS, PyMongo.
-   **Database**: MongoDB Atlas.
-   **AI**: Hugging Face (Model: `deepset/roberta-base-squad2`).
-   **Styling**: Premium Vanilla CSS with Google Fonts (Outfit).

---

## 🚀 Getting Started

### 1. Prerequisites
-   Python 3.10+
-   Node.js 18+
-   MongoDB (Local Community Server or Atlas Cluster)

### 2. Backend Setup
```bash
cd server
# Copy .env and fill in your MONGO_URI and HUGGINGFACE_API_KEY
# (Note: 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 is already set)
pip3 install -r requirements.txt
python3 app.py
```
*Backend runs on: http://localhost:5001*

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*Frontend runs on: http://localhost:3000*

---

## 📁 Project Structure

```text
StudySphere/
├── client/          ← Vite + React Application
│   ├── src/
│   │   ├── components/  ← Navbar, ProtectedRoutes
│   │   ├── context/     ← AuthState
│   │   ├── pages/       ← Dashboard, Calendar, Chat, etc.
│   │   └── services/    ← API client (Axios)
├── server/          ← Flask Application
│   ├── routes/      ← API Blueprints (Auth, AI, Planning...)
│   ├── uploads/     ← PDF storage (local)
│   ├── app.py       ← Socket.IO + Flask Factory
│   └── db.py        ← MongoDB Connection Singleton
└── docs/            ← Documentation
```

## 🔐 Environment Variables (`server/.env`)

```env
# For Local MongoDB (Compass):
MONGO_URI=mongodb://127.0.0.1:27017/studysphere

# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/studysphere

SECRET_KEY=your_secret_key
HUGGINGFACE_API_KEY=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
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

---

*Built with ❤️ for students by StudySphere Team.*
