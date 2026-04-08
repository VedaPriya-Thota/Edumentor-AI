# 🎓 Edumentor-AI: Virtual Classroom & AI Mentor Platform

## 📌 Overview

**Edumentor-AI** is a full-stack intelligent learning platform designed to bridge the gap between **students and instructors** by combining:

* 🤖 AI-powered mentorship
* 📊 Real-time progress tracking
* 🧑‍🏫 Structured classroom interaction

It transforms traditional passive learning into an **interactive, guided, and accountable classroom experience**.

---

## 🚀 Key Features

### 👨‍🎓 Student Features

* 📚 Enroll in courses
* 🧠 AI-powered doubt solving
* 📝 Attempt quizzes (AI + instructor-created)
* 📊 Track progress (streaks, performance, leaderboard)
* 📅 View daily topics and resources
* 📂 Submit assignments
* 📈 Get personalized study recommendations
* 🏆 Compete in leaderboard rankings

---

### 👨‍🏫 Instructor Features

* 📘 Create and manage courses
* 📢 Post daily topics (notes, PDFs, links)
* 📝 Create assignments with deadlines
* ❓ Create and manage quizzes
* 📊 Track student analytics
* 💬 Interact with students via discussions
* 📌 Monitor engagement and inactivity

---

## 🧩 Classroom Interaction System

This platform introduces a **real classroom-like experience**:

* 🗂️ **Course-based structure**
* 📰 **Daily topic feed (like Google Classroom)**
* 💬 **Threaded discussions under topics**
* 📌 **Assignments & deadlines**
* ⏱️ **Instructor-controlled quizzes**
* ✅ **Daily task checklist**
* 🔔 **Engagement reminders**

---

## 🧠 AI Capabilities

* 🤖 AI-generated quiz questions
* 💡 Smart doubt resolution
* 📉 Weak topic identification
* 📚 Personalized study plans
* 🔔 Smart nudges for inactive students
* ✍️ Auto-evaluation (planned/extendable)

---

## 🏗️ System Architecture

### Frontend

* React (Vite)
* Tailwind CSS
* Component-based UI

### Backend

* FastAPI
* REST APIs
* JWT Authentication

### Database

* SQLite (dev) / scalable to PostgreSQL

---

## 🗄️ Core Modules

* Authentication (JWT-based)
* Course Management
* Topic Feed System
* Assignment System
* Quiz Engine
* Progress Tracking
* Leaderboard System
* AI Integration Layer

---

## 🔌 API Highlights

| Feature     | Endpoint                        |
| ----------- | ------------------------------- |
| Auth        | `/auth/login`, `/auth/register` |
| Courses     | `/courses/`                     |
| Topics      | `/topics/`                      |
| Assignments | `/assignments/`                 |
| Quizzes     | `/quizzes/`                     |
| Doubts (AI) | `/doubt/ask`                    |
| Progress    | `/progress/`                    |

---

## 🖥️ Project Structure

```
Edumentor-AI/
│
├── backend/
│   ├── app/
│   ├── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── package.json
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 🔹 1. Clone Repository

```bash
git clone https://github.com/VedaPriya-Thota/Edumentor-AI.git
cd Edumentor-AI
```

---

### 🔹 2. Backend Setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

### 🔹 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 📊 Progress Tracking System

Tracks:

* Course-wise progress
* Assignment completion
* Quiz performance
* Daily streaks
* Activity insights

---

## 🏆 Leaderboard

* Course-specific rankings
* Based on:

  * Quiz scores
  * Assignment completion
  * Participation

---

## 🔐 Security Notes

* `.env` files are excluded from Git
* API keys should NEVER be committed
* Use environment variables for secrets

---

## 🎯 Future Enhancements

* 📱 Mobile app version
* 🧠 Advanced AI tutor (LLM-based)
* 🎥 Live classroom sessions
* 🧾 Automated grading system
* 📡 Real-time notifications

---

## 🤝 Contribution

Contributions are welcome!
Feel free to fork the repo and submit pull requests.

---

## 📜 License

This project is for educational and research purposes.

---

## 💡 Inspiration

Designed as a hybrid of:

* Google Classroom (structure)
* Discord (interaction)
* Duolingo (engagement)

---
