# Thoughtflows HRMS & CRM · MERN Stack Setup

A full-stack **MERN** (MongoDB, Express, React + Vite, Node.js) internal management portal with **Tailwind CSS**, designed for **Thoughtflows Medical Coding Academy** ("Eight teams across twelve branches, working as one system — guiding students from first call to first paycheck").

---

## 🌟 Key Features

- **Frontend (Client)**:
  - **React 18** powered by **Vite** for sub-millisecond Hot Module Replacement (HMR).
  - **Tailwind CSS** with customized deep teal gradient styling, floating staff node animations, and glassmorphic UI components.
  - Interactive constellation canvas with flowing wireframes mirroring the portal UI.
  - Interactive **Eight Departments** explorer modal with live API data.
  - Interactive **Operations Dashboard** featuring the 12 branches and student career CRM stages (*First Call* $\to$ *AAPC Certified* $\to$ *Placement* $\to$ *First Paycheck*).
  - Staff Single Sign-On (SSO) authentication modal.

- **Backend (Server)**:
  - **Node.js** & **Express.js** REST API with modular architecture.
  - **Mongoose** database models for `User`, `Department`, `Branch`, and `StudentLead`.
  - Built-in graceful fallback mode: if local MongoDB is not yet running, the server automatically provides fallback data so all frontend features work immediately.
  - Pre-configured CORS, Morgan logging, JWT scaffolding, and error handlers.

---

## 📁 Project Structure

```
thoughtflows-hrms-crm/
├── client/                     # Frontend (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Navbar, PortalHero, ConstellationCanvas, FloatingStaffDots, Modals
│   │   ├── App.jsx             # Main layout & modal state
│   │   ├── index.css           # Tailwind directives & glass utilities
│   │   └── main.jsx
│   ├── tailwind.config.js      # Custom theme colors & animations
│   ├── vite.config.js          # Vite config with /api proxy to localhost:5000
│   └── package.json
├── server/                     # Backend (Node.js + Express + Mongoose)
│   ├── src/
│   │   ├── config/             # Resilient MongoDB connection
│   │   ├── models/             # Mongoose schemas (Department, Branch, User, StudentLead)
│   │   ├── routes/             # REST API endpoints (/api/health, /api/departments, /api/stats, /api/leads/pipeline)
│   │   └── server.js           # Express app entry point
│   ├── .env                    # Local environment variables
│   ├── .env.example            # Environment template
│   └── package.json
├── package.json                # Root package with concurrent run scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
Run from the root directory:
```bash
npm run install:all
```
*(Or install in root, server, and client directories separately: `npm install`, `cd server && npm install`, `cd ../client && npm install`)*

### 2. Configure Environment Variables (Optional)
The server already includes a default `.env` file pointing to `http://localhost:5001` and `mongodb://127.0.0.1:27017/thoughtflows_db`.
Edit `server/.env` if you want to point to a remote MongoDB Atlas cluster:
```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/thoughtflows_db
JWT_SECRET=thoughtflows_super_secret_jwt_key_2026
```

### 3. Run Development Server (Concurrent)
From the root directory, start both frontend and backend in one command:
```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5001](http://localhost:5001)
- **API Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status and database connectivity check |
| `GET` | `/api/stats` | Academy-wide HRMS & CRM statistics |
| `GET` | `/api/departments` | Details on the 8 specialized teams & heads |
| `GET` | `/api/branches` | Locations and student capacity across the 12 branches |
| `GET` | `/api/leads/pipeline` | Full student career progression pipeline counts |
| `POST` | `/api/auth/login` | Staff authentication endpoint |
