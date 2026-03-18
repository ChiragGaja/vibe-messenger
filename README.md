# Vibe Messenger (Unified Edition) 🚀

Vibe is a modern, real-time chat application built for speed, security, and a premium user experience. This version features a **unified deployment setup** where the Express backend serves the React frontend, allowing for a single-server deployment.

---

## 📁 Project Structure

- **`/`**: Root directory containing workspace scripts.
- **`/server`**: Express.js backend with Socket.io, PostgreSQL (Neon), and Cloudinary integration.
- **`/client`**: React frontend built with Vite, Tailwind CSS, Framer Motion, and Lucide React.
- **`/client/dist`**: The compiled production build of the frontend (served by the backend).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Cloudinary Account

### 1. Installation
Install dependencies for both client and server:
```bash
npm run install:all
```

### 2. Environment Setup
Create a `.env` file in the `/server` directory:
```env
PORT=5000
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### 3. Running the App (Unified Mode)
To build the frontend and start the production-ready server:
```bash
npm run build   # Builds the React dist
npm start       # Starts the unified Express server on port 5000
```
Your app will be available at **`http://localhost:5000`**.

### 4. Development Mode
To run both parts separately with Hot Module Replacement (HMR):
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

---

## 🔒 Security & Privacy
- **Hardened CORS:** Strict origin matching for production.
- **Rate Limiting:** Protects against brute-force and DDoS.
- **Secure Error Handling:** Prevents internal system leakage.
- **Legal Compliance:** Built-in Privacy Policy and Terms of Service.

---

## 📱 PWA Support
Vibe is a Progressive Web App. You can "Add to Home Screen" on supported browsers for a native app-like experience.

---

© 2026 Vibe Messenger. All rights reserved.
