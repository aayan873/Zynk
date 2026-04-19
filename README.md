# Zynk

Zynk is a classroom and live-meeting platform that combines role-based academic workflows with real-time communication. The stack covers classroom management, scheduled and ad hoc meetings, persistent classroom chat, in-meeting chat and polls, file sharing, and a Mediasoup-based SFU for WebRTC video.

## Stack

- Backend: Node.js, Express 5, MongoDB with Mongoose, Socket.IO 4, Mediasoup 3, Redis via `ioredis`, Cloudinary
- Frontend: React 19, Vite, Tailwind CSS 4, `mediasoup-client`
- Auth and security: JWT auth, bcrypt password hashing, CryptoJS AES for classroom chat payload encryption

## Core Capabilities

- Teacher and student authentication with role-aware profile flows
- Classroom creation, enrollment, resources, announcements, and persistent chat
- Instant and scheduled meetings tied to classrooms
- Real-time meeting admission, permissions, hand raise, chat, and polls
- SFU-based multiparty video using Mediasoup
- Cloudinary-backed resource uploads and backend-proxied downloads

## Repository Layout

```text
apps/
├── backend/
│   ├── index.js
│   ├── server.js
│   ├── db.connect.js
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── sfu/
│   ├── sockets/
│   └── utils/
└── frontend/
    ├── public/
    └── src/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        └── utils/
```

## Architecture Overview

### Backend Boot Flow

`apps/backend/index.js` is the main entrypoint:

1. Loads environment variables.
2. Connects to MongoDB.
3. Starts the Express server.
4. Creates an HTTP or HTTPS server depending on TLS env vars.
5. Attaches Socket.IO with shared CORS configuration.
6. Applies socket authentication middleware to every handshake.
7. Registers REST middleware and route modules.
8. Spawns Mediasoup workers and activates the SFU layer.

### High-Level Runtime Model

- Express handles REST APIs for auth, profiles, classrooms, announcements, meetings, resources, and classroom chat history.
- Socket.IO handles live collaboration events on the default namespace.
- Mediasoup handles media routing for audio, video, and screen share.
- MongoDB stores durable domain data.
- Redis mirrors room and peer presence but is not the system of record.
- Cloudinary stores uploaded classroom files.

## Data Model

### User

Main identity record with `email`, `fullName`, `password`, `role`, `institution`, `profileCompleted`, and `isVerified`.

Institution is derived from the email domain during signup.

### Teacher

Teacher profile linked one-to-one with `User`.

### Student

Student profile is auto-created from structured email input and stores programme, branch, semester, and batch year metadata.

### Classroom

Represents an academic group with teacher assignments, student membership, demographic eligibility filters, announcements, resources, invite code, chat toggle state, and soft-delete via `isActive`.

### Announcement

Stores classroom-scoped announcement content authored by a user.

### ClassroomMessage

Persistent classroom chat message with AES-encrypted content, replies, mentions, and reactions.

### Resource

Uploaded classroom asset stored in Cloudinary and linked to a classroom.

### Meeting

Tracks room metadata, host, schedule, participants, blacklist, and meeting lifecycle.

### Poll

Stores live poll configuration, votes, correct answer, status, and timer metadata.

## REST API Summary

### Auth

Base path: `/api/auth`

- `POST /signup`: Create user, and auto-create student profile when applicable
- `POST /login`: Return access and refresh JWTs
- `GET /validate`: Validate current access token

### Profiles

Base path: `/api/profiles`

- `POST /`: Create teacher profile
- `GET /`: Fetch current user profile
- `PATCH /`: Update profile and sync key fields back to `User`

### Classrooms

Base path: `/api/classrooms`

- `GET /`: List classrooms visible to the authenticated user
- `POST /`: Create classroom as teacher
- `GET /:id`: Get one classroom with role-aware access control
- `PATCH /:id`: Update classroom metadata
- `DELETE /:id`: Soft-delete classroom
- `POST /:id/enroll`: Enroll eligible student
- `POST /:id/resources`: Upload resource
- `DELETE /:id/resources/:resourceId`: Delete resource and Cloudinary asset
- `GET /:id/resources/:resourceId/download`: Proxy-download a resource
- `GET /:id/messages`: Fetch paginated classroom chat history
- `POST /:id/messages`: Create classroom chat message
- `POST /:id/messages/:msgId/react`: Toggle reaction on message
- `PATCH /:id/chat/toggle`: Enable or disable classroom chat

### Announcements

Base path: `/api/announcements`

- `GET /:classroomId`: List announcements
- `POST /:classroomId`: Create announcement as teacher

### Meets

Base path: `/api/meets`

- `POST /create`: Create instant meeting
- `POST /schedule`: Schedule classroom meeting
- `PATCH /schedule/:id`: Update scheduled meeting
- `DELETE /schedule/:id`: Cancel scheduled meeting
- `GET /upcoming/all`: List upcoming meetings for the current user
- `GET /upcoming/:classroomId`: List classroom-specific upcoming meetings
- `GET /history`: List past meetings
- `GET /:roomId`: Fetch public room metadata for joining
- `GET /:roomId/end`: End meeting as host

## Authentication and Authorization

- JWT payload includes `id`, `email`, and `role`.
- Access tokens expire in 1 day.
- Refresh tokens expire in 7 days.
- `requireAuth` validates bearer tokens and attaches the authenticated user.
- `isTeacher` restricts teacher-only routes.
- Classroom-level authorization is rechecked inside controllers.
- Socket.IO uses a dedicated handshake auth middleware to validate the same JWT.

### Important Behavior

The backend invalidates tokens issued before the current server boot time. This forces users to log in again after every backend restart.

## Real-Time Layer

All Socket.IO handlers are mounted on the default namespace.

### SFU Signaling

`apps/backend/sockets/sfu.socket.js` handles:

- room join and leave
- transport creation and DTLS connection
- producer creation, pause, resume, and close
- consumer creation and resume
- meeting end and participant removal
- hand raise state

The server emits router RTP capabilities, existing producer lists, producer lifecycle events, participant updates, and meeting lifecycle events.

### Meeting Admission and Permissions

`apps/backend/sockets/room.socket.js` handles:

- lobby join requests
- host approval and rejection
- mic, camera, and screen-share permission grants and revocations

### In-Meeting Chat

`apps/backend/sockets/chat.socket.js` provides ephemeral room chat kept only in memory.

### Polls

`apps/backend/sockets/poll.socket.js` handles active poll state, vote submission, host-triggered end, and timer-based auto-end.

### Classroom Chat Rooms

`apps/backend/sockets/classroomChat.socket.js` only manages Socket.IO room membership. Message persistence lives in REST controllers, which then broadcast updates back to subscribed clients.

## SFU and Mediasoup Design

### Worker Pool

- One Mediasoup worker is created per CPU core.
- Workers receive dedicated RTC port ranges.
- Worker selection is round-robin.
- Dead workers are automatically restarted.

### Router Configuration

Each meeting room gets one Mediasoup router. The configured codecs are:

- audio: Opus, 48 kHz, 2 channels
- video: VP8, 90 kHz

Simulcast and SVC are not enabled in the current design.

### Room State

Room state is maintained in memory inside the room manager:

- router
- peers
- chat enabled flag
- in-memory meeting chat messages
- active poll id

Peer state tracks transports, producers, consumers, join time, hand raise state, and media permissions.

### Redis Usage

Redis mirrors room and peer presence:

- `room:{roomID}`
- `room:{roomID}:peers`
- `peer:{socketId}`

Redis is not the source of truth, and no TTL is currently applied to these keys.

## Classroom Chat Encryption

Persistent classroom chat uses client-side AES encryption:

- plaintext is encrypted in the frontend before submission
- ciphertext is stored in MongoDB
- decryption happens in the frontend when messages are rendered

The effective key is derived from `VITE_CHAT_SECRET` and the classroom id.

### Security Note

This is not strong end-to-end encryption in the cryptographic sense because the frontend secret is bundled into the client application. It protects stored messages from being plain text on the server, but it does not protect against a client that can inspect the shipped bundle.

## File Storage

Cloudinary handles classroom resource storage.

### Upload Flow

1. Client submits multipart form data.
2. Multer with Cloudinary storage uploads the file.
3. Backend stores the resulting secure URL in the `Resource` document.

Supported types include PDF, JPG, JPEG, PNG, and PPTX.

### Download Flow

Downloads are proxied through the backend so authorization is enforced before the file is streamed to the client with an attachment filename.

### Deletion Flow

Resource deletion also attempts Cloudinary cleanup, including a fallback retry using the asset path with extension when needed.

## Frontend Architecture

### State Management

The frontend uses:

- `AuthContext` for auth state and socket lifecycle
- local component state for feature data
- `useSFU` for Mediasoup client state and media orchestration

There is no Redux or Zustand layer.

### Routing

Main route structure:

- `/` redirects to `/home`
- `/home`
- `/login`
- `/signup`
- `/dashboard`
- `/profile-setup`
- `/profile`
- `/classroom/:id`
- `/room/:roomId`
- `/logout`
- `/unauthorized`

Protected routes validate the token with the backend and force logout if validation fails.

### Socket Lifecycle

The frontend creates a shared Socket.IO client singleton with `autoConnect: false`. The socket connects when auth state gains a token and disconnects when auth is cleared.

### Axios Interceptor

An axios interceptor injects `Authorization: Bearer <token>` from local storage into outgoing API requests.

## Key User Flows

### Signup and Profile Completion

- Students are auto-profiled during signup.
- Teachers complete a separate profile setup flow after initial registration.

### Joining a Meeting

1. Load room metadata.
2. Acquire local media.
3. Enter directly if host or returning participant, otherwise wait in lobby.
4. On approval, join the SFU room.
5. Load router RTP capabilities into the Mediasoup device.
6. Create send transport and publish local tracks.
7. Consume existing remote producers.

### Classroom Page

The classroom page loads classroom metadata and presents tabs for:

- stream
- resources
- announcements
- people
- chat

### Persistent Classroom Chat

1. Join the classroom Socket.IO room.
2. Fetch encrypted history over REST.
3. Decrypt locally for display.
4. Encrypt outbound messages before POST.
5. Receive real-time broadcasts and decrypt them client-side.

## Environment Variables

The backend requires the following configuration:

| Variable | Purpose |
| --- | --- |
| `ATLAS_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `APP_PORT` | Server listen port |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `FRONTEND_URL` | Frontend origin for CORS |
| `HTTPS_CERT_FILE` | Optional TLS cert path |
| `HTTPS_KEY_FILE` | Optional TLS key path |
| `CLOUDINARY_URL` or `CLOUDINARY_*` | Cloudinary credentials |
| `BASE_PORT` | Base Mediasoup RTC port |
| `PORT_RANGE_SIZE` | Port block size per worker |
| `ANNOUNCED_IP` | ICE candidate announced IP |

The frontend also depends on a classroom chat secret:

| Variable | Purpose |
| --- | --- |
| `VITE_CHAT_SECRET` | Base secret used in classroom message encryption |

## Local Development

This repo is organized as separate frontend and backend apps. At a minimum you need:

- Node.js
- MongoDB or MongoDB Atlas
- Redis
- Cloudinary credentials
- Optional TLS certs for local secure WebRTC testing

Typical development flow:

1. Install dependencies for each app.
2. Configure backend and frontend environment variables.
3. Start Redis.
4. Start the backend.
5. Start the frontend Vite dev server.

If you plan to test WebRTC on non-localhost environments, configure HTTPS and `ANNOUNCED_IP` correctly.
<!-- 
## Current Limitations

- No horizontal scaling for Socket.IO or Mediasoup room state
- Refresh tokens are issued but not used in a refresh endpoint
- Redis keys have no TTL and can become stale after crashes
- Mediasoup codec config is effectively hard-coded
- No simulcast or SVC for adaptive large-room video
- Classroom chat encryption is not true E2E encryption
- Announcement deletion is not implemented
- Large rooms are limited by one router on one worker
- Webinar and whiteboard socket modules are placeholders
- Email verification is not implemented
- Duplicate error-handler middleware exists
- Poll vote submission may race against poll end timing
- Meeting schema only supports `MEET` even though webinar concepts appear elsewhere

## Suggested Next Improvements

- Add refresh-token rotation and a `/refresh` endpoint
- Introduce Redis TTL or startup reconciliation for stale presence keys
- Move Mediasoup codec and transport config into a dedicated config module
- Add Socket.IO Redis adapter and sticky-session support for multi-instance deployment
- Implement stronger message key management if true E2E guarantees are required
- Add missing moderation and deletion flows for announcements and other content

## Notes

This README is based on the repository architecture reference supplied for this project and is intended to serve as the main technical overview for the monorepo. -->