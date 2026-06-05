# Product Requirements Document (PRD): Zynk Edu

> [!NOTE]
> **Status**: Development & Deployment Phase | **Version**: 1.2 | **Author**: Antigravity  
> This document serves as the absolute source of truth for the product requirements, engineering specifications, and implementation roadmap of **Zynk Edu**. It tracks implemented components, specifies remaining features, and outlines production deployment configurations.

---

## 1. Executive Summary

### 1.1 Overview
Zynk Edu is a live-first, classroom-grade learning management and real-time collaboration platform. It bridges the gap between generic virtual meeting software and rigid learning management systems (LMS) by centering all classroom activities—such as coursework, assignments, announcements, and materials—around structured live video sessions. 

### 1.2 Value Proposition
* **The Live Session as the Heartbeat**: Classroom activities orbit around live interactive video, capturing real-time student engagement.
* **Smart Eligibility & Discovery**: Replaces manual enrollment codes with an automated matching engine that presents relevant classrooms to students based on their verified institutional metadata.
* **Academic-Specific Collaboration**: Tailors video, chat, whiteboard, and grading interfaces specifically for educational workflows rather than corporate meetings.

### 1.3 MVP Success Statement
The MVP must enable institution admins to onboard, teachers to construct classrooms with eligibility rules and host fully interactive live sessions (with whiteboard, polling, and automated attendance), and matched students to discover, join, and participate in these sessions while tracking their grades and submissions seamlessly.

---

## 2. Product Mission & Principles

* **Live-First Integration**: A live classroom session must never feel like an external link. It must dynamically link with the resources, chat, whiteboard, and attendance databases of the parent classroom.
* **Zero-Friction Discovery**: Students should never have to manually hunt for course links. The platform must automatically surface classes they are eligible to join.
* **Academic Integrity & Control**: Teachers must possess absolute governance over audio/video, chat channels, screen sharing, and enrollment rosters to maintain a focused learning environment.
* **Mobile Equality**: Since many students access classes via mobile devices, core student workflows (joining sessions, participating in polls, submitting assignments) must be as functional on mobile browsers as they are on desktop.

---

## 3. System Architecture & User Flow

### 3.1 Platform User Journey Map

```mermaid
flowchart TD
    A[Unregistered User] -->|Onboard & Specify Role| B{User Role?}
    B -->|Student| C[Provide Eligibility Metadata]
    B -->|Teacher| D[Provide Academic Credentials]
    C -->|Verify Email| E[Student Dashboard]
    D -->|Verify Email & Admin Approval| F[Teacher Dashboard]
    E -->|View Eligible Classes| G[Discover / Join Class]
    F -->|Create Class & Set Rules| H[Classroom Creation]
    H -->|Triggers Match Engine| G
    G -->|Enrolled| I[Classroom Workspace]
    F -->|Schedule Session| J[Live Session Setup]
    I -->|Attend Session / Do Classwork| K[Student Engagement]
    J -->|Host Session| L[Active Classroom]
    L -->|Post-Session Summary| M[Analytics & Grades]
    K -->|Submit Assignment| M
    
    style A fill:#1a1c23,stroke:#ff8c00,stroke-width:2px,color:#fff
    style G fill:#0d2818,stroke:#00ff87,stroke-width:2px,color:#fff
    style L fill:#2b0f10,stroke:#ff3b30,stroke-width:2px,color:#fff
```

### 3.2 Live Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Teacher sets title, time, agenda & resources
    Scheduled --> PreSession: 10 mins before start (Join/Start button active)
    PreSession --> Lobby: Students enter waiting room (if enabled)
    Lobby --> Live: Teacher clicks 'Start Session' & admits students
    state Live {
        [*] --> Presentation
        Presentation --> Whiteboard: Teacher launches canvas
        Presentation --> Polling: Real-time question launched
        Presentation --> BreakoutRooms: Students split into sub-sessions
        BreakoutRooms --> Presentation: Timer expires / Rooms closed
    }
    Live --> PostSession: Teacher clicks 'End Session for All'
    PostSession --> SummaryReady: Processing recording, attendance, and logs
    SummaryReady --> [*]: Stream Card posted automatically
```

---

## 4. MVP Scope & Implementation Status

| System Module | Feature Specification | Development Status |
| :--- | :--- | :--- |
| **Identity & Access** | Email/Password auth; Role selection; Profile setup; Student metadata lock. | **COMPLETED (✅)** |
| **Smart Enrollment** | Metadata eligibility match engine (institute, branch, programme, semester); Discovery tab; Join flow. | **COMPLETED (✅)** |
| **Live Session A/V** | Mediasoup SFU WebRTC media flows; Socket.io signalling; Schedule/create meets. | **COMPLETED (✅)** |
| **Classroom Chat & Feed** | Stream announcements; Real-time socket-based group chats; Comments and emoji reactions. | **COMPLETED (✅)** |
| **Resource Library** | Upload files (via Cloudinary); List resources; Delete & download. | **COMPLETED (✅)** |
| **Interactive Polls** | Live polling via socket connections. | **COMPLETED (✅)** |
| **Classwork & Assignments** | Assignment creation; Rich text instructions; File submission portals. | **REMAINING (🛠️)** |
| **Grading & Gradebook** | Rubric attachment; Spreadsheet grading grid; Draft grading and return mechanisms. | **REMAINING (🛠️)** |
| **Attendance Engine** | Automated time-on-call duration tracking; attendance thresholds; heatmap & manual overrides. | **PARTIAL (⚠️)** *(Meets track join history but duration logic is pending)* |
| **Admin Panels** | Institution config; Approve/deny teachers; Schema builder for custom metadata. | **REMAINING (🛠️)** |
| **Analytics Dashboards** | At-risk student auto-flagging; engagement scores; comparison charts. | **REMAINING (🛠️)** |

---

## 5. Functional Specifications

### 5.1 Onboarding & Identity Flow
* **Status**: **COMPLETED (✅)**
* **Functional Requirements**:
  * Onboarding separates basic user credentials from academic role profiles.
  * Students input Roll Number, Program, Branch, Semester, and Batch Year. These form the basis for metadata-driven discovery.
  * Profile modifications trigger confirmation prompts alerting students of potential enrollment/eligibility changes.

### 5.2 The Smart Eligibility Engine
* **Status**: **COMPLETED (✅)**
* **Functional Requirements**:
  * Evaluates student profile variables against classroom targeting criteria: `{ institute, programmes, semester, branches }`.
  * Classrooms matching student metadata are automatically returned under classroom search queries and surfaced on the Dashboard.
  * Students can instantly enroll in matching classrooms, bypassing manual codes.

### 5.3 Live Session System (Mediasoup SFU)
* **Status**: **COMPLETED (✅)**
* **Functional Requirements**:
  * Real-time audio/video streaming powered by a Mediasoup selective forwarding unit (SFU) running separate worker subprocesses.
  * Direct socket rooms handle room management (joining, leaving, requesting admission, starting meetings, ending meetings).
  * Socket-based chat, announcement creation, and real-time polling are fully integrated.
  * *Next Steps*: Implement breakout rooms and whiteboard canvas SVG drawings in UI.

### 5.4 Resource Library
* **Status**: **COMPLETED (✅)**
* **Functional Requirements**:
  * Resource uploads integrate with Cloudinary remote CDN to host files, returning structured paths.
  * Resources are sorted and listed on the Classroom tab with options for instructors to delete and students to download.
  * *Next Steps*: Implement folder hierarchies, schedule visibility, and resource completion gates.

### 5.5 Classwork & Assignments
* **Status**: **REMAINING (🛠️)**
* **Functional Requirements**:
  * Allow teachers to create assignments under specific topic sections with description text and optional attachment links.
  * Students must have a submission card to upload documents or type answers.
  * Submissions must support state flags: `Assigned`, `Submitted`, `Late`, `Graded`.

### 5.6 Grading & Gradebook
* **Status**: **REMAINING (🛠️)**
* **Functional Requirements**:
  * Establish a spreadsheet-style gradebook displaying students in rows and graded tasks in columns.
  * Support grading templates (Points, Letter Grades, Pass/Fail).
  * Enforce the draft-by-default standard where grades remain hidden until returned by the teacher.

### 5.7 Attendance Engine
* **Status**: **PARTIAL (⚠️)**
* **Functional Requirements**:
  * Currently, the system logs participant joins in the `Meeting` model.
  * *Required Development*: Write background timers or connection interval trackers to calculate total minutes present. If duration is $<60\%$ of total meeting duration, mark status as `Partial`; if $0\%$, `Absent`; else, `Attended`. Provide teacher interface for manual overrides.

---

## 6. Technical Specifications & Tech Stack

### 6.1 Tech Stack Table

| Component | Technology | Target Version | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | React / Next.js / Vite | Vite 5+, React 18 | Fully Configured |
| **Styling** | TailwindCSS & Lucide icons | Tailwind v3 | Fully Configured |
| **Realtime / A/V** | Mediasoup WebRTC / Socket.io | Mediasoup v3, Socket.io v4 | Fully Configured |
| **Database** | MongoDB / Mongoose | MongoDB v6+ | Fully Configured |
| **Storage CDN** | Cloudinary | - | Fully Configured |
| **Deployment Engine** | Docker / Docker Compose | Latest | **IN FOCUS (🚀)** |

---

## 7. Edge Cases & System Rules

| ID | Trigger Condition | Intended System Behavior |
| :--- | :--- | :--- |
| **EC-01** | Student updates profile metadata mid-semester. | Eligibility recalculates. New matching classrooms appear in Discover. Already joined classrooms remain active. |
| **EC-02** | Live session starts but the teacher is absent. | Students in the waiting room see a "Session is delayed" prompt. If 15 minutes pass, students are prompted to leave, and a critical notification is dispatched to the teacher. |
| **EC-03** | Multiple hosts click "Start Session" simultaneously. | The first transaction is registered as the primary host. Subsequent hosts join as co-hosts with full presenter/management capabilities. |
| **EC-04** | A student loses internet connectivity mid-session. | Socket connection monitors drop. If reconnection occurs within 120 seconds, SFU streams resume without full reload or losing waiting room / participant state. |
| **EC-05** | An assignment deadline passes mid-grading. | Student submission gates close (or flag as Late). The teacher's grading flow continues uninterrupted. |
| **EC-06** | A student joins a classroom they were previously banned from. | System checks `blacklistedParticipants` in the classroom record. Access is blocked even if the student uses a valid invite code or matches the eligibility rule. |

---

## 8. Non-Functional Requirements (NFRs)

### 8.1 Performance SLAs
* **Page Load Times**: Dashboard and Stream views must load in under 300ms on desktop and 500ms on mobile.
* **Live Video Latency**: Sub-second latency (under 400ms lag in interactive WebRTC calls, under 800ms in webinar streams).
* **Database Queries**: Smart eligibility checks and classroom index mappings must resolve in less than 150ms.

### 8.2 Security & Compliance
* **Data Encryption**: All traffic must utilize TLS 1.3 encryption. At-rest storage must apply AES-256 standards.
* **Academic Privacy**: Grade sheets and rosters must align with standard student privacy protections.

---

## 9. Production Deployment Specification

As development shifts focus to deployment and final feature implementation, the following specifications must be configured for the production environment.

### 9.1 Network & WebRTC Port Configurations
Mediasoup relies on direct UDP/TCP communication. Traditional port forwarding is insufficient; the firewall and security groups (AWS Security Groups, GCP Firewall, etc.) must open specific port ranges.

```mermaid
graph TD
    Client[WebRTC Client] -->|HTTPS/WSS Port 443| Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy REST/Sockets| Express[Express Server Port 5000]
    Client -->|Direct WebRTC UDP/TCP Ports 40000-49999| Mediasoup[Mediasoup Workers]
```

* **Signalling Ports**:
  * HTTPS: Port `443` (Proxied to Express port `5000` via Nginx reverse proxy).
  * Socket.io: Port `443` (Proxied path `/socket.io`).
* **RTC Media Ports (Mediasoup Workers)**:
  * **Range**: `40000` - `49999` (Configurable in `sfu/config.js` or `.env` via `RTC_MIN_PORT` and `RTC_MAX_PORT`).
  * **Protocol**: **UDP** (primarily for low-latency media) and **TCP** (fallback for networks blocking UDP).
  * **IP Configuration**: In production, `announcedIp` in Mediasoup transport options must be set to the server's public IP address so clients can resolve WebRTC connections.

### 9.2 HTTPS / SSL Certificates
WebRTC is disabled in browsers unless loaded over a secure origin (`https://` or `localhost`).
* **LetsEncrypt Configuration**:
  * Set up Certbot on the server host to request certificates.
  * Point environment variables `HTTPS_CERT_FILE` and `HTTPS_KEY_FILE` to `/etc/letsencrypt/live/yourdomain/fullchain.pem` and `/etc/letsencrypt/live/yourdomain/privkey.pem`.
* **Nginx Configuration**:
  * Handle SSL termination at Nginx.
  * Forward traffic to the backend node application over plain HTTP inside the local network.

### 9.3 Environment Configuration Checklist (`.env`)

```ini
# System Port Configurations
PORT=5000
NODE_ENV=production

# Database & Storage
ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/zynkedub
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SSL Configuration (For local HTTPS testing or node direct binding)
HTTPS_CERT_FILE=/path/to/fullchain.pem
HTTPS_KEY_FILE=/path/to/privkey.pem

# Mediasoup WebRTC Configuration
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=YOUR_PUBLIC_SERVER_IP
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999

# Frontend Details
FRONTEND_URL=https://yourdomain.edu
```

---

## 10. Phased Roadmap

```mermaid
gantt
    title Zynk Edu - Deployment & Feature Rollout Roadmap
    dateFormat  YYYY-MM-DD
    section Deployment Phase
    Server Setup & Docker Config       :active, 2026-06-05, 7d
    Nginx Reverse Proxy & SSL Setup    : 3d
    WebRTC Port Firewall Configuration : 2d
    Production Deployment & Test Run   : 4d
    section Further Development
    Classwork & Assignment Modules    : 2026-06-12, 10d
    Spreadsheet Gradebooks            : 8d
    Detailed Attendance Logs          : 6d
    Admin & Analytics Dashboards      : 12d
```

### Phase 1: Deploy & Secure (Weeks 1-2)
* **Goal**: Establish the core production cluster and ensure WebRTC connectivity.
* [ ] Build multi-stage `Dockerfile` and `docker-compose.yml` configurations.
* [ ] Bind domain and map SSL certificates via LetsEncrypt/Certbot.
* [ ] Configure Nginx reverse proxy with `/socket.io` websocket upgrades.
* [ ] Open firewalls for UDP/TCP ports `40000-49999`.

### Phase 2: Complete Classwork & Assignments (Weeks 3-4)
* **Goal**: Deliver the primary student coursework submission flows.
* [ ] Build Mongoose schemas for Assignments and Submissions.
* [ ] Program CRUD routers and attach frontend Classwork tabs.
* [ ] Connect file uploads via Cloudinary.

### Phase 3: Deliver Grades & Attendance Analytics (Weeks 5-6)
* **Goal**: Establish tracking records for academic metrics.
* [ ] Program spreadsheet-style grade grid in the UI.
* [ ] Write background connection calculators to log actual minutes on call for accurate attendance percentages.
* [ ] Deliver the CSV grade exporting feature.
