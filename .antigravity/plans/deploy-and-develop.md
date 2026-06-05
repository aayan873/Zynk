# Feature Plan: deploy-and-develop

> [!NOTE]
> This plan has been generated through parallel codebase analysis and is optimized for one-pass execution success.
> **Priority**: Deploy first → Fix remaining issues → Then decide next feature sprint.

---

## Feature Overview & Business Value

Zynk Edu is a fully functional live-classroom platform with a working backend (Node.js + Mediasoup SFU), a React/Vite frontend, and MongoDB Atlas as the data layer. The platform currently runs only in a local/LAN development setup (using a LAN IP and self-signed certs). The immediate goal is to:

1. **Deploy to Oracle Cloud Free Tier** (ARM Ampere A1 VM — 4 OCPUs, 24 GB RAM) using Docker Compose + Nginx.
2. **Acquire a domain** (DuckDNS — free dynamic DNS) and wire up Let's Encrypt SSL for WebRTC compliance.
3. **Complete the ANTIGRAVITY.md** workspace context file so the AI assistant has full project awareness.
4. **Fix all remaining development gaps** (Classwork/Assignments, Grading, Attendance duration tracking).

---

## Architectural Design & Scope

- **Feature Type**: Infrastructure / Deployment + Feature Completion
- **Complexity**: High
- **Systems Affected**: 
  - `apps/backend` — Dockerfile, env, Nginx proxy target
  - `apps/frontend` — Dockerfile, Nginx static server, env
  - Root — `docker-compose.yml`, `nginx/nginx.conf`
  - `ANTIGRAVITY.md` — Project context file
  - Oracle Cloud Infrastructure — VCN Security Lists, OS Firewall
- **Dependencies**:
  - Docker & Docker Compose (installed on Oracle VM)
  - Nginx (via Docker image)
  - Certbot / Let's Encrypt (via `snap certbot` + `certbot-dns-duckdns` plugin)
  - DuckDNS domain (free at duckdns.org)

---

## Critical Notes & Oracle Cloud Gotchas

> [!WARNING]
> **ARM64 Architecture**: Oracle's Ampere A1 is `linux/arm64`. Mediasoup compiles a native C++ worker binary. Always build Docker images **directly on the ARM server** (`docker compose build`) — never push `amd64` images from your Mac and expect them to run.

> [!IMPORTANT]
> **Double Firewall on OCI**: Oracle Cloud has TWO firewall layers. You MUST open ports in BOTH:
> 1. **OCI Console → VCN Security List** (cloud-level ingress rules)
> 2. **iptables on the VM itself** (OS-level — Ubuntu 22.04 uses `iptables`/`nf_tables`)

> [!NOTE]
> **Domain Strategy**: Use **DuckDNS** (free dynamic DNS). Your URL will be `zynkedu.duckdns.org` (or any available subdomain). For production later, purchase a `.com` domain via Namecheap (~$10/yr) and point it to the same Oracle IP.

---

## Context References

### Mandatory Codebase Files to Read Before Executing

| File | Why |
|------|-----|
| `apps/backend/server.js` | Understands `HTTPS_CERT_FILE`/`HTTPS_KEY_FILE` env vars, port binding, CORS |
| `apps/backend/.env` | Current env var names: `APP_PORT`, `ANNOUNCED_IP`, `FRONTEND_URL` |
| `apps/backend/sfu/workerPool.js` | Mediasoup worker startup — RTC port env var names |
| `apps/backend/sfu/roomManager.js` | Transport config — `announcedIp` must use the public server IP |
| `apps/frontend/vite.config.js` | Proxy config, SSL loading — understand what production replaces |
| `apps/frontend/.env` | `VITE_BACKEND_URL`, `VITE_SSL_*` vars |
| `reference/architecture.md` | Full architectural map for ANTIGRAVITY.md completion |

### New Files to Create

| Path | Purpose |
|------|---------|
| `apps/backend/Dockerfile` | Docker build for Node.js backend + Mediasoup |
| `apps/frontend/Dockerfile` | Multi-stage: Vite build → Nginx static server |
| `apps/frontend/nginx-frontend.conf` | SPA routing config for frontend Nginx container |
| `docker-compose.yml` (project root) | Orchestrates backend, frontend, nginx containers |
| `nginx/nginx.conf` | Nginx: SSL termination, `/api` + `/socket.io` proxy to backend |
| `apps/backend/.env.production` | Production env template (NOT committed to git) |
| `ANTIGRAVITY.md` | Fill in the currently empty template |

---

## Step-by-Step Tasks

Execute all tasks in strict linear order. Every task is atomic.

---

### Phase 0: Local File Preparation (Done on your Mac)

#### Task 0.1: UPDATE `ANTIGRAVITY.md`
- **IMPLEMENT**: Fill in the currently blank template with:
  - **Project Overview**: Zynk Edu — live-first classroom LMS with Mediasoup SFU WebRTC, smart eligibility engine, and real-time collaboration.
  - **Tech Stack table**: React 19 + Vite 8, TailwindCSS v4, Node.js + Express 5, Mediasoup v3, Socket.io v4, MongoDB + Mongoose, Cloudinary, Docker + Nginx.
  - **Commands**: `cd apps/backend && node index.js` (dev), `cd apps/frontend && npm run dev` (dev), `docker compose up --build -d` (production).
  - **Project Structure**: Mirror the structure from `reference/architecture.md`.
  - **Architecture section**: 4-layer arch (REST API → Socket.io signalling → Mediasoup SFU → MongoDB + Cloudinary).
  - **Key Files**: `server.js`, `sfu/workerPool.js`, `sockets/sfu.socket.js`, `Room.jsx`, `socket.js`.
- **VALIDATION**: `grep -c "{" ANTIGRAVITY.md` should return `0` (no unreplaced placeholders).

---

#### Task 0.2: CREATE `apps/backend/Dockerfile`
- **IMPLEMENT**:
  ```dockerfile
  FROM node:22-slim
  WORKDIR /app
  COPY package*.json ./
  # Mediasoup requires python3, make, g++ to compile its C++ worker
  RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
  RUN npm ci --omit=dev
  COPY . .
  EXPOSE 5002
  CMD ["node", "index.js"]
  ```
- **GOTCHAS**: 
  - Use `node:22-slim` (not Alpine) — Mediasoup's C++ worker requires glibc; Alpine uses musl and will break.
  - Do NOT use multi-stage — mediasoup compiles native binaries during `npm ci` and they must be present at runtime.
  - The `certs/` folder is NOT baked into the image — mounted as a Docker volume at runtime from `/etc/letsencrypt`.
  - Build must happen ON the Oracle ARM server, not on your Mac (ARM64 vs AMD64 architecture mismatch).
- **VALIDATION**: `docker build -t zynk-backend ./apps/backend` completes without errors.

---

#### Task 0.3: CREATE `apps/frontend/Dockerfile`
- **IMPLEMENT**:
  ```dockerfile
  # Stage 1: Build the Vite/React app
  FROM node:22-slim AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  ARG VITE_BACKEND_URL
  ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
  RUN npm run build

  # Stage 2: Serve static build with Nginx
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```
- **GOTCHAS**: `VITE_BACKEND_URL` is injected at BUILD TIME via Docker `ARG` — this must be set to the public domain URL when running `docker compose build`.
- **VALIDATION**: `docker build --build-arg VITE_BACKEND_URL=https://zynkedu.duckdns.org -t zynk-frontend ./apps/frontend` completes without errors.

---

#### Task 0.4: CREATE `apps/frontend/nginx-frontend.conf`
- **IMPLEMENT**:
  ```nginx
  server {
      listen 80;
      root /usr/share/nginx/html;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```
- **CRITICAL**: The `try_files ... /index.html` directive ensures React Router deep routes (e.g., `/dashboard`, `/classroom/xyz`) load the app instead of returning 404.
- **VALIDATION**: After deployment, navigate directly to `https://zynkedu.duckdns.org/dashboard` — should load the React app.

---

#### Task 0.5: CREATE `nginx/nginx.conf` (Root-level Nginx reverse proxy)
- **IMPLEMENT**:
  ```nginx
  events {}

  http {
      # Redirect HTTP to HTTPS
      server {
          listen 80;
          server_name zynkedu.duckdns.org;
          return 301 https://$host$request_uri;
      }

      server {
          listen 443 ssl;
          server_name zynkedu.duckdns.org;

          ssl_certificate /etc/letsencrypt/live/zynkedu.duckdns.org/fullchain.pem;
          ssl_certificate_key /etc/letsencrypt/live/zynkedu.duckdns.org/privkey.pem;
          ssl_protocols TLSv1.2 TLSv1.3;
          ssl_ciphers HIGH:!aNULL:!MD5;

          # Frontend SPA
          location / {
              proxy_pass http://frontend:80;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
          }

          # REST API
          location /api/ {
              # backend uses host network — connect via 127.0.0.1
              proxy_pass http://127.0.0.1:5002;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }

          # Socket.io (WebSocket upgrade required)
          location /socket.io/ {
              proxy_pass http://127.0.0.1:5002;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection "upgrade";
              proxy_set_header Host $host;
          }
      }
  }
  ```
- **GOTCHAS**:
  - Backend uses `network_mode: host` (see Task 0.6) — so Nginx must proxy to `127.0.0.1:5002`, NOT `backend:5002` (Docker service DNS won't resolve for host-network containers from bridge-network containers).
  - Socket.io REQUIRES `Upgrade` + `Connection "upgrade"` headers — missing these causes WebSocket fallback to long-polling, breaking real-time events.
- **VALIDATION**: `docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t` — outputs `syntax is ok`.

---

#### Task 0.6: CREATE `docker-compose.yml` (project root)
- **IMPLEMENT**:
  ```yaml
  version: '3.9'

  services:
    backend:
      build:
        context: ./apps/backend
        dockerfile: Dockerfile
      container_name: zynk-backend
      restart: unless-stopped
      env_file:
        - ./apps/backend/.env.production
      volumes:
        - /etc/letsencrypt:/etc/letsencrypt:ro
      network_mode: host
      # REASON: Mediasoup SFU uses direct UDP media ports (40000-49999).
      # Docker's bridge NAT breaks WebRTC UDP traversal.
      # host network mode bypasses Docker NAT so media flows directly.

    frontend:
      build:
        context: ./apps/frontend
        dockerfile: Dockerfile
        args:
          VITE_BACKEND_URL: https://zynkedu.duckdns.org
      container_name: zynk-frontend
      restart: unless-stopped
      networks:
        - zynk-net

    nginx:
      image: nginx:alpine
      container_name: zynk-nginx
      restart: unless-stopped
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        - /etc/letsencrypt:/etc/letsencrypt:ro
      networks:
        - zynk-net
      depends_on:
        - frontend

  networks:
    zynk-net:
      driver: bridge
  ```
- **VALIDATION**: `docker compose config` — should parse without errors.

---

#### Task 0.7: CREATE `apps/backend/.env.production` (Template — NOT committed)
- **IMPLEMENT**:
  ```ini
  APP_PORT=5002
  NODE_ENV=production

  ATLAS_URI=mongodb+srv://mars:YOUR_PASSWORD@cluster0.fdsomx2.mongodb.net/zynk?appName=Cluster0
  JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET

  # Let's Encrypt certs (mounted from host via Docker volume)
  HTTPS_CERT_FILE=/etc/letsencrypt/live/zynkedu.duckdns.org/fullchain.pem
  HTTPS_KEY_FILE=/etc/letsencrypt/live/zynkedu.duckdns.org/privkey.pem

  # Mediasoup — REPLACE with actual Oracle public IP
  ANNOUNCED_IP=YOUR_ORACLE_PUBLIC_IP
  BASE_PORT=40000
  PORT_RANGE_SIZE=9999

  # CORS
  FRONTEND_URL=https://zynkedu.duckdns.org

  # Cloudinary
  CLOUDINARY_CLOUD_NAME=deoxaneqw
  CLOUDINARY_API_KEY=591493331457798
  CLOUDINARY_API_SECRET=YOUR_SECRET
  CLOUDINARY_URL=cloudinary://591493331457798:YOUR_SECRET@deoxaneqw
  ```
- **IMPLEMENT**: Add `.env.production` to `.gitignore`:
  ```
  apps/backend/.env.production
  apps/backend/.env
  ```
- **VALIDATION**: `grep ".env.production" .gitignore` returns a match.

---

#### Task 0.8: Commit & Push to Git
- **IMPLEMENT**:
  ```bash
  cd /path/to/zynk/Zynk
  git add apps/backend/Dockerfile apps/frontend/Dockerfile apps/frontend/nginx-frontend.conf nginx/nginx.conf docker-compose.yml ANTIGRAVITY.md
  git commit -m "feat: add Docker + Nginx deployment configuration"
  git push origin main
  ```
- **VALIDATION**: `git log --oneline -1` shows the new commit.

---

### Phase 1: Oracle Cloud VM Setup (Done via SSH on the server)

#### Task 1.1: Provision Oracle Cloud VM
- **IMPLEMENT** (Manual — OCI Console):
  1. Log in → **Compute → Instances → Create Instance**
  2. **Name**: `zynk-edu-server`
  3. **Image**: `Ubuntu 22.04` (Canonical)
  4. **Shape**: `VM.Standard.A1.Flex` → **4 OCPUs, 24 GB RAM** (Always Free)
  5. **Boot Volume**: 100 GB
  6. **SSH Keys**: Upload your `~/.ssh/id_rsa.pub`
  7. **Create** → Wait for status `RUNNING`
  8. **Note the Public IP address**
- **GOTCHA**: If you see "Out of capacity" for A1 Flex, keep retrying (sometimes every few hours). Alternatively, try a different **Availability Domain** in the same region.
- **VALIDATION**: `ssh ubuntu@YOUR_PUBLIC_IP` connects successfully.

---

#### Task 1.2: Open OCI VCN Security List (Cloud Firewall)
- **IMPLEMENT** (Manual — OCI Console):
  1. **Networking → Virtual Cloud Networks → your VCN → Subnets → Default Subnet → Default Security List**
  2. **Add Ingress Rules**:

  | Source CIDR | IP Protocol | Destination Port Range | Description |
  |-------------|-------------|----------------------|-------------|
  | `0.0.0.0/0` | TCP | `22` | SSH |
  | `0.0.0.0/0` | TCP | `80` | HTTP (Nginx redirect) |
  | `0.0.0.0/0` | TCP | `443` | HTTPS (Nginx + WSS) |
  | `0.0.0.0/0` | UDP | `40000-49999` | Mediasoup WebRTC Media |
  | `0.0.0.0/0` | TCP | `40000-49999` | Mediasoup WebRTC TCP fallback |

- **VALIDATION**: `nmap -p 443 YOUR_PUBLIC_IP` from your Mac — shows `filtered` (expected before Nginx runs) but NOT `closed`.

---

#### Task 1.3: Configure OS-Level Firewall (iptables on VM)
- **IMPLEMENT** (SSH into VM):
  ```bash
  sudo apt update && sudo apt upgrade -y

  # Open required ports in iptables
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 40000:49999 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 40000:49999 -j ACCEPT

  # Persist rules across reboots
  sudo apt install -y iptables-persistent
  sudo netfilter-persistent save
  ```
- **VALIDATION**: `sudo iptables -L INPUT -n | grep 443` — shows the ACCEPT rule.

---

#### Task 1.4: Install Docker & Docker Compose on VM
- **IMPLEMENT** (SSH into VM):
  ```bash
  # Install Docker
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh

  # Add current user to docker group
  sudo usermod -aG docker ubuntu
  newgrp docker

  # Verify
  docker --version
  docker compose version
  ```
- **VALIDATION**: `docker run --rm hello-world` prints "Hello from Docker!".

---

#### Task 1.5: Set Up DuckDNS Domain & Let's Encrypt SSL
- **IMPLEMENT**:
  1. **Register DuckDNS domain**:
     - Go to [duckdns.org](https://www.duckdns.org) → Log in → Create subdomain `zynkedu`
     - Set the IP to your **Oracle Cloud Public IP**
     - Copy your **DuckDNS Token**
  
  2. **Install Certbot with DuckDNS plugin** (on the VM):
  ```bash
  sudo snap install --classic certbot
  sudo ln -s /snap/bin/certbot /usr/bin/certbot
  sudo snap set certbot trust-plugin-with-root=ok
  sudo snap install certbot-dns-duckdns

  # Create credentials file
  sudo mkdir -p /etc/letsencrypt
  echo "dns_duckdns_token=YOUR_DUCKDNS_TOKEN" | sudo tee /etc/letsencrypt/duckdns.ini
  sudo chmod 600 /etc/letsencrypt/duckdns.ini

  # Request certificate
  sudo certbot certonly \
    --authenticator dns-duckdns \
    --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini \
    -d zynkedu.duckdns.org \
    --non-interactive \
    --agree-tos \
    --email YOUR_EMAIL@example.com
  ```
  
  3. **Verify certs exist**:
  ```bash
  ls /etc/letsencrypt/live/zynkedu.duckdns.org/
  # Should show: cert.pem  chain.pem  fullchain.pem  privkey.pem
  ```

- **VALIDATION**: `sudo certbot renew --dry-run` completes with "All simulated renewals succeeded".

---

#### Task 1.6: Clone Repo & Deploy on VM
- **IMPLEMENT**:
  ```bash
  # Clone the repository
  git clone YOUR_REPO_URL ~/zynk
  cd ~/zynk/Zynk

  # Create the production env file with real values
  cp apps/backend/.env.production apps/backend/.env.production.local
  nano apps/backend/.env.production.local
  # Edit: ANNOUNCED_IP=YOUR_ORACLE_PUBLIC_IP, ATLAS_URI, JWT_SECRET, CLOUDINARY secrets

  # Update docker-compose.yml env_file path if needed, then build
  docker compose up --build -d

  # Monitor startup
  docker compose logs -f
  ```
- **VALIDATION**:
  - `docker compose ps` — all 3 services (`zynk-backend`, `zynk-frontend`, `zynk-nginx`) show `Up`
  - `curl -sk https://zynkedu.duckdns.org` returns HTML (login page)
  - `curl -s https://zynkedu.duckdns.org/api/auth/check` returns a JSON response

---

#### Task 1.7: Full End-to-End WebRTC Validation
- **IMPLEMENT** (Manual testing from two real devices on different networks):
  1. Open `https://zynkedu.duckdns.org` on Device A (Teacher) and Device B (Student)
  2. Register and log in on each device
  3. Teacher: Create classroom → Schedule meeting → Start meeting
  4. Student: Join meeting
  5. Confirm A/V streams appear in both directions
- **VALIDATION**:
  - Video tiles visible for both participants
  - Audio audible
  - No `ICE connection failed` errors in browser DevTools console
  - Browser DevTools → WebRTC internals (`chrome://webrtc-internals`) shows active ICE pairs

---

### Phase 2: Complete Remaining Development Features

> [!IMPORTANT]
> Begin this phase only AFTER production deployment is verified and stable.

#### Task 2.1: Complete Attendance Duration Tracking
- **IMPLEMENT** (in `apps/backend/sockets/room.socket.js`):
  - Maintain a server-side `Map<socketId, { userId, meetingId, joinTime }>` in-memory store.
  - On `join-room` socket event: record `joinTime = Date.now()`.
  - On `socket.on('disconnect')` or `leave-room` event: compute `durationMs = Date.now() - joinTime`.
  - Calculate attendance percentage: `durationMs / (meeting.scheduledEndTime - meeting.scheduledFor) * 100`.
  - Status rules: ≥60% → `Attended`, 1-59% → `Partial`, 0% → `Absent`.
  - **CREATE** `apps/backend/models/attendance.model.js` with fields: `meeting` (ref Meeting), `student` (ref Student), `joinTime` (Date), `leaveTime` (Date), `durationMinutes` (Number), `status` (Enum: Attended/Partial/Absent).
- **PATTERN**: Mirror socket event structure from `apps/backend/sockets/room.socket.js`.
- **VALIDATION**: Join meeting for 30 seconds → Leave → Query MongoDB `db.attendances.findOne({})` — record present with correct duration.

---

#### Task 2.2: Build Classwork & Assignments Module
- **IMPLEMENT**:
  - **CREATE** `apps/backend/models/assignment.model.js`: `title`, `description`, `classroom` (ref), `teacher` (ref), `dueDate`, `maxPoints`, `attachmentUrl`.
  - **CREATE** `apps/backend/models/submission.model.js`: `assignment` (ref), `student` (ref), `fileUrl`, `textAnswer`, `status` (Enum: Assigned/Submitted/Late/Graded), `grade`, `feedback`, `submittedAt`, `gradedAt`.
  - **CREATE** `apps/backend/controllers/assignment.controller.js`: CRUD for assignments, plus `submitAssignment`, `getSubmissions` (teacher), `getMySubmission` (student).
  - **CREATE** `apps/backend/routes/assignment.routes.js`: protected routes.
  - **Register** in `apps/backend/server.js`: `app.use('/api/assignments', assignmentRoutes)`.
  - **CREATE** `apps/frontend/src/components/ClassroomAssignments.jsx`: assignment list, creation form (teacher view), submission card with file upload (student view).
- **PATTERN**: Mirror `apps/backend/controllers/resource.controller.js` for Cloudinary file upload; mirror `ClassroomResources.jsx` for the list component pattern.
- **VALIDATION**: Teacher creates assignment → Student sees it → Student submits file → Submission record in MongoDB with `status: 'Submitted'`.

---

#### Task 2.3: Build Grading & Gradebook
- **IMPLEMENT**:
  - **UPDATE** `submission.model.js`: confirm `grade`, `feedback`, `gradedAt`, `returnedAt` fields exist.
  - **CREATE** `apps/frontend/src/components/Gradebook.jsx`: spreadsheet table (students as rows, assignments as columns), each cell shows grade or "—", clicking opens inline grade entry, "Return Grade" button.
  - **ADD** `gradeSubmission` to `assignment.controller.js`: `PATCH /api/assignments/submissions/:submissionId/grade` — teacher sets `grade`, `feedback`, `status = 'Graded'`, `gradedAt = now`.
  - **ADD** `exportGradebook` endpoint: `GET /api/classrooms/:classroomId/gradebook/export` — returns CSV.
- **VALIDATION**: Teacher grades → Grade appears in gradebook grid → CSV export downloads file with correct data.

---

#### Task 2.4: Build Admin Panel (Foundation)
- **IMPLEMENT**:
  - **CREATE** `apps/backend/middleware/isAdmin.js`: checks `req.user.role === 'Admin'`, returns 403 if not.
  - **CREATE** `apps/backend/routes/admin.routes.js`: `GET /api/admin/teachers/pending`, `PATCH /api/admin/teachers/:id/approve`.
  - **Register** in `server.js`: `app.use('/api/admin', adminRoutes)`.
  - **CREATE** `apps/frontend/src/pages/AdminDashboard.jsx`: lists pending teachers with Approve/Deny buttons.
  - **UPDATE** `apps/frontend/src/Router.jsx`: add `/admin` route, protected by `role === 'Admin'` check.
- **PATTERN**: Mirror `isAdmin` from the auth middleware in `apps/backend/middleware/`.
- **VALIDATION**: Admin user visits `/admin` → Sees pending teachers → Approves one → Teacher `approved` field set to `true` in DB.

---

### Phase 3: Ops & Polish

#### Task 3.1: SSL Auto-Renewal with Nginx Reload Hook
- **IMPLEMENT** (on VM):
  ```bash
  # Create post-renewal hook to reload Nginx
  sudo mkdir -p /etc/letsencrypt/renewal-hooks/post
  cat << 'EOF' | sudo tee /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
  #!/bin/bash
  docker exec zynk-nginx nginx -s reload
  EOF
  sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

  # Certbot's snap timer auto-renews — verify it's active:
  sudo systemctl status snap.certbot.renew.timer
  ```
- **VALIDATION**: `sudo certbot renew --dry-run` — "All simulated renewals succeeded".

---

#### Task 3.2: DuckDNS IP Auto-Update Cron
- **IMPLEMENT** (on VM — in case Oracle assigns a new IP after a stop/start):
  ```bash
  # Add cron to update DuckDNS every 5 minutes
  (crontab -l 2>/dev/null; echo "*/5 * * * * curl -s 'https://www.duckdns.org/update?domains=zynkedu&token=YOUR_TOKEN&ip=' > /tmp/duckdns.log") | crontab -
  ```
- **VALIDATION**: `crontab -l` shows the DuckDNS update job.

---

#### Task 3.3: Verify Docker Auto-Restart on VM Reboot
- **IMPLEMENT** (Verify the setting is already in docker-compose.yml):
  ```bash
  # Test full reboot recovery
  sudo reboot
  # Wait ~60 seconds, then SSH back:
  docker compose ps  # All containers should be 'Up'
  ```
- **VALIDATION**: All three containers (`zynk-backend`, `zynk-frontend`, `zynk-nginx`) are `Up` after reboot.

---

## Deployment Architecture

```
Internet
   │
   │  zynkedu.duckdns.org → Oracle Public IP (A Record)
   │
   ▼
┌─────────────────────────────────────────┐
│         Oracle Cloud VM                  │
│  (ARM Ampere A1 — 4 OCPU, 24 GB RAM)    │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  zynk-nginx (bridge network)       │  │
│  │  Nginx:alpine                      │  │
│  │  Ports: 80, 443                    │  │
│  │  - SSL termination (Let's Encrypt) │  │
│  │  - /         → frontend:80         │  │
│  │  - /api/     → 127.0.0.1:5002     │  │
│  │  - /socket.io→ 127.0.0.1:5002     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  zynk-frontend (bridge network)    │  │
│  │  Nginx:alpine serving React dist   │  │
│  │  Port: 80 (internal bridge only)   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  zynk-backend (host network)       │  │
│  │  Node.js + Express + Socket.io     │  │
│  │  + Mediasoup SFU Workers           │  │
│  │  Port 5002 (REST + WS)             │  │
│  │  Ports 40000-49999 UDP/TCP (Media) │  │
│  └────────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
         │                    │
  MongoDB Atlas          Cloudinary CDN
  (cloud DB)            (file storage)
```

---

## Test & Manual Validation Checklist

### Automated Validation Commands
```bash
# Nginx config syntax check (run on VM)
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# Check all Docker containers
docker compose ps

# Check Mediasoup workers started
docker compose logs backend | grep -i "mediasoup"

# Verify SSL cert
curl -v https://zynkedu.duckdns.org 2>&1 | grep "SSL certificate verify"

# Frontend lint
cd apps/frontend && npm run lint

# Docker compose config parse
docker compose config
```

### Manual Validation Steps

1. `https://zynkedu.duckdns.org` loads → browser shows green padlock (no SSL warnings)
2. Register new Teacher account → Complete profile → Dashboard loads
3. Register new Student account → Complete profile → Eligible classroom appears in Discover
4. Teacher creates classroom → Student joins it
5. Teacher schedules and starts a meeting → Student joins → Both see video tiles
6. Chat messages in meeting appear in real-time for both sides
7. Poll created by teacher → Student votes → Live result updates
8. Resource uploaded → Download link appears and file opens correctly
9. After deployment: Assignment created → Submitted → Grade entered → Gradebook shows it

### Acceptance Criteria Checklist

- [ ] HTTPS active with valid Let's Encrypt cert on DuckDNS domain
- [ ] All Docker containers restart automatically on VM reboot
- [ ] Login, Registration, Profile Setup work end-to-end
- [ ] Smart Eligibility matching surfaces correct classrooms
- [ ] Live video (Mediasoup WebRTC) works between 2 devices on separate networks
- [ ] Socket.io real-time events (chat, polls, announcements) work in production
- [ ] Cloudinary resource uploads and downloads work
- [ ] SSL auto-renewal configured and `--dry-run` passes
- [ ] `ANTIGRAVITY.md` fully filled in with no `{placeholder}` entries
- [ ] Attendance duration tracking records to MongoDB
- [ ] Assignment creation and file submission work
- [ ] Gradebook displays grades and CSV export works
- [ ] Admin panel lists and approves pending teachers
