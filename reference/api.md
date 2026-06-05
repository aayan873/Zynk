# API Reference Specifications: Zynk Edu

This document details the REST API endpoints, request/response models, and contract standards for **Zynk Edu**.

---

## 1. Global API Standards

### 1.1 HTTP Headers
* `Content-Type: application/json`
* `Authorization: Bearer <Token>` (JWT required for all endpoints under `/api` except basic login/signup)

### 1.2 Response Envelope formats

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description message",
  "error": "Optional system error detail strings"
}
```

---

## 2. Authentication API (`/api/auth`)

### `POST /api/auth/signup`
Creates a new user account.
* **Payload**:
  ```json
  {
    "username": "student1",
    "email": "student1@institution.edu",
    "password": "strongPassword123",
    "role": "Student",
    "institution": "Tech Institute"
  }
  ```
* **Response**: HTTP 201 Success containing the generated User object.

### `POST /api/auth/login`
Authenticates a user and returns a JSON Web Token (JWT).
* **Payload**:
  ```json
  {
    "email": "student1@institution.edu",
    "password": "strongPassword123"
  }
  ```
* **Response**: HTTP 200 Success containing the `token` and `user` profile flags.

---

## 3. Profiles API (`/api/profiles`)

### `POST /api/profiles/setup`
Completes profile metadata onboarding.
* **Payload (Student)**:
  ```json
  {
    "fullName": "Alice Smith",
    "rollNumber": "CS-2026-089",
    "programme": "B.Tech",
    "branch": "Computer Science",
    "semester": "5",
    "batchYear": "2022-2026"
  }
  ```
* **Payload (Teacher)**:
  ```json
  {
    "fullName": "Dr. Sarah Jenkins",
    "department": "Computer Science",
    "designation": "Associate Professor",
    "employeeId": "EMP-90812",
    "bio": "Researching distributed systems and WebRTC algorithms."
  }
  ```
* **Response**: HTTP 200 Success saving details and setting `profileCompleted = true` on the User schema.

---

## 4. Classrooms API (`/api/classrooms`)

### `GET /api/classrooms`
Fetches all classrooms the active user is associated with.
* Teachers get classrooms they teach.
* Students get classrooms they have joined or classes matching their smart eligibility metadata.

### `POST /api/classrooms` (Teacher Only)
Creates a classroom.
* **Payload**:
  ```json
  {
    "name": "Data Structures CS301",
    "description": "Fundamental algorithms and structures",
    "programmes": ["B.Tech"],
    "semester": "3",
    "branches": ["Computer Science", "Information Technology"],
    "inviteCode": "DS-301"
  }
  ```

### `POST /api/classrooms/:id/enroll` (Student Only)
Enrolls a student if they meet eligibility guidelines.

### `POST /api/classrooms/:id/resources` (Teacher Only)
Uploads classroom materials via Multipart Form Data.
* **Payload**: `file` (Binary payload processed and forwarded to Cloudinary).

### `GET /api/classrooms/:id/resources/:resourceId/download`
Fetches resource info and downloads.

---

## 5. Live Sessions & Meetings API (`/api/meets`)

### `POST /api/meets/schedule` (Teacher Only)
Schedules a future live WebRTC session.
* **Payload**:
  ```json
  {
    "title": "Lecture 12: Graphs & Traversals",
    "classroom": "classroom_object_id",
    "scheduledFor": "2026-06-10T10:00:00Z",
    "scheduledEndTime": "2026-06-10T12:00:00Z"
  }
  ```
* **Response**: HTTP 201 Success returning `roomId` (e.g. `abc-defg-hij`).

### `POST /api/meets/create`
Creates an unscheduled, instant WebRTC session.

### `GET /api/meets/upcoming/all`
Fetches today's upcoming meetings across all classrooms associated with the active student or teacher.

### `GET /api/meets/:roomId/end` (Host Only)
Sets the meeting status to ended, logging timestamps.
