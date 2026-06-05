# Testing & Validation Framework Specification: Zynk Edu

This document details the recommended test suites, configurations, testing commands, and verification protocols for **Zynk Edu** as development progresses.

---

## 1. Unit Testing

* **Backend Tooling**: Mocha / Chai or Jest for routing logic and controller handlers.
* **Frontend Tooling**: Vitest + React Testing Library (RTL).
* **Scope**:
  * Testing individual controllers (e.g. metadata checking in classroom creation).
  * Testing utility helper methods (e.g. invite code generator validations).
* **Mocks**:
  * Mock out Mediasoup worker channels (`mediasoup` handles real WebRTC loops and needs to be stubbed for standard units).
  * Mock Cloudinary API file uploading middleware.
  * Stub database connections (using mockgoose or similar in-memory MongoDB tools).

---

## 2. Integration & Socket Testing

* **Tooling**: Supertest (for Express REST requests) + socket.io-client (for real-time signaling loops).
* **Database**: Runs against a clean, localized MongoDB test instance or dynamic memory database.
* **Goals**:
  * Verify full REST requests (e.g. creating classroom -> enrolling student -> verifying enrollment counts).
  * Verify socket signaling channels (e.g. connecting user -> firing join-room event -> listening to host approval callbacks).

---

## 3. End-to-End (E2E) Browser Testing

* **Tooling**: Playwright.
* **Goals**:
  * Simulate a Teacher user scheduling a live class on the dashboard.
  * Simulate a matched Student user discovering the classroom, enrolling, and joining the active Mediasoup audio/video conference room.
  * Verify media feeds and chat message distribution updates.
