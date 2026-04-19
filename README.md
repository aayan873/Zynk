# Zynk

Zynk is a classroom collaboration platform with:
- Role-based auth (`Teacher` / `Student`)
- Classroom management (create, enroll, update, delete)
- Announcements, classroom chat, and resource uploads
- Scheduled and instant live sessions
- Real-time meeting features over Socket.IO + Mediasoup (hand raise, participant updates, host controls)

## Monorepo Structure

```
apps/
  backend/   Express + MongoDB + Socket.IO + Mediasoup
  frontend/  React + Vite + Tailwind
```

## Tech Stack

- Frontend: React, Vite, React Router, Axios, TailwindCSS, Socket.IO client
- Backend: Node.js, Express, Mongoose, JWT, Socket.IO, Mediasoup
- Infra/Services: MongoDB Atlas, Redis, Cloudinary

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Redis instance
- Cloudinary account (for classroom resource uploads)

## Setup

Install dependencies app-by-app:

```bash
cd apps/backend
npm install

cd ../frontend
npm install
```

## Environment Variables

Create `apps/backend/.env`:

```env
# Core
APP_PORT=5000
ATLAS_URI=mongodb+srv://...
JWT_SECRET=replace_with_secure_secret
FRONTEND_URL=http://localhost:5173

# Optional HTTPS for backend server
HTTPS_CERT_FILE=
HTTPS_KEY_FILE=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary (use URL OR individual keys)
CLOUDINARY_URL=
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=

# Mediasoup networking
ANNOUNCED_IP=127.0.0.1
BASE_PORT=40000
PORT_RANGE_SIZE=100
```

Create `apps/frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_CHAT_SECRET=replace_with_shared_secret

# Optional HTTPS for Vite dev server
VITE_SSL_CERT_FILE=
VITE_SSL_KEY_FILE=
```

## Run Locally

Start backend:

```bash
cd apps/backend
npm start
```

Start frontend (new terminal):

```bash
cd apps/frontend
npm run dev
```

Open `http://localhost:5173`.

## API Surface (High-level)

Base routes exposed by backend:
- `/api/auth` (`signup`, `login`, `validate`)
- `/api/profiles` (create/get/update current profile)
- `/api/classrooms` (CRUD, enroll, chat, resources)
- `/api/meets` (schedule, upcoming, history, instant room lifecycle)
- `/api/announcements` (classroom announcements)

## Real-time Features

Socket namespaces/events are handled in backend socket modules:
- SFU meeting transport/produce/consume lifecycle
- Room admission and participant updates
- Chat and classroom chat events
- Poll events

## Notes

- Frontend defaults to `http://localhost:5000`; keep `APP_PORT` aligned to avoid proxy/socket mismatch.
- `apps/backend/utils/auth.utils.js` and `apps/backend/config/mediasoup.config.js` are currently empty in this repo snapshot.

## License

This repository includes a `LICENSE` file at project root.
