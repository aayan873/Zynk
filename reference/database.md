# Database Schema & Data Models Specification: Zynk Edu

This document details the MongoDB schema definitions, field validations, and relational mappings for **Zynk Edu** using Mongoose.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--|| STUDENT : "linked profile (if student)"
    USER ||--|| TEACHER : "linked profile (if teacher)"
    CLASSROOM }o--o{ TEACHER : "taught by"
    CLASSROOM }o--o{ STUDENT : "enrolled by"
    CLASSROOM ||--o{ ANNOUNCEMENT : "contains"
    CLASSROOM ||--o{ RESOURCE : "has library"
    CLASSROOM ||--o{ CLASSROOM_MESSAGE : "has chat history"
    CLASSROOM ||--o{ MEETING : "schedules"
    MEETING ||--o{ POLL : "contains"

    USER {
        ObjectId id PK
        string username
        string email
        string passwordHash
        string role "Admin | Teacher | Student"
        string institution
        boolean profileCompleted
    }
    STUDENT {
        ObjectId id PK
        ObjectId user FK
        string fullName
        string rollNumber
        string programme
        string branch
        string semester
        string batchYear
    }
    TEACHER {
        ObjectId id PK
        ObjectId user FK
        string fullName
        string department
        string designation
        string employeeId
        string bio
    }
    CLASSROOM {
        ObjectId id PK
        string name
        string description
        string institute
        string programmes
        string semester
        string branches
        ObjectIdArray teachers FK
        ObjectIdArray students FK
        ObjectIdArray announcements FK
        ObjectIdArray resources FK
        string inviteCode
        boolean isActive
        boolean isChatEnabled
    }
    MEETING {
        ObjectId id PK
        string roomId
        string hostId FK
        string type "MEET"
        string title
        ObjectId classroom FK
        date scheduledFor
        date scheduledEndTime
        date startedAt
        date endedAt
        stringArray participants
        stringArray blacklistedParticipants
    }
    RESOURCE {
        ObjectId id PK
        string title
        string fileUrl
        string fileType
        ObjectId uploadedBy FK
        ObjectId classroom FK
    }
    ANNOUNCEMENT {
        ObjectId id PK
        string content
        ObjectId classroom FK
        ObjectId teacher FK
    }
```

---

## 2. Model Definitions & Schemas

### 2.1 `User` Schema
* Represents authentication details.
* `email`: String (Unique, Indexed, Matches Regex).
* `password`: String (Hashed).
* `role`: String (Enum: `Admin`, `Teacher`, `Student`).
* `institution`: String (Required).
* `profileCompleted`: Boolean (Default: `false`).

### 2.2 `Student` Schema
* Contains metadata used by the smart eligibility system.
* `user`: ObjectId (Ref `User`, Unique).
* `fullName`: String (Required).
* `rollNumber`: String (Required).
* `programme`: String (Required).
* `branch`: String (Required).
* `semester`: String (Required).
* `batchYear`: String (Required).

### 2.3 `Teacher` Schema
* `user`: ObjectId (Ref `User`, Unique).
* `fullName`: String (Required).
* `department`: String (Required).
* `designation`: String (Required).
* `employeeId`: String (Optional).
* `bio`: String (Optional).

### 2.4 `Classroom` Schema
* `name`: String (Required).
* `description`: String.
* `institute`: String (Required, maps to user's institution).
* `programmes`: Array of Strings (Eligibility criteria).
* `semester`: String (Eligibility criteria).
* `branches`: Array of Strings (Eligibility criteria).
* `teachers`: Array of ObjectIds (Ref `Teacher`).
* `students`: Array of ObjectIds (Ref `Student`).
* `resources`: Array of ObjectIds (Ref `Resource`).
* `inviteCode`: String (Unique, Sparse).
* `isActive`: Boolean (Default `true`).
* `isChatEnabled`: Boolean (Default `true`).

### 2.5 `Meeting` Schema
* Represents active or scheduled video calls.
* `roomId`: String (Required, Unique, e.g., `xxx-yyyy-zzz`).
* `hostId`: String (Ref `Teacher` / Host user).
* `type`: String (Enum: `MEET`, Default `MEET`).
* `title`: String (Required).
* `classroom`: ObjectId (Ref `Classroom`).
* `scheduledFor`: Date.
* `scheduledEndTime`: Date.
* `startedAt`: Date (Default: `Date.now`).
* `endedAt`: Date (Nullable, set when ended).
* `participants`: Array of Strings (Socket or User IDs).
* `blacklistedParticipants`: Array of Strings.

### 2.6 `Resource` Schema
* `title`: String (Required).
* `fileUrl`: String (Required).
* `fileType`: String (Required).
* `uploadedBy`: ObjectId (Ref `User`).
* `classroom`: ObjectId (Ref `Classroom`).

---

## 3. Database Indexes & Optimizations

1. **User Index**: `email` field is indexed uniquely.
2. **Invite Code Index**: Sparse unique index on `inviteCode` to allow custom codes but ignore nulls.
3. **Classroom Search Index**: Compounds on `{ institute: 1, programmes: 1, semester: 1, branches: 1 }` to optimize smart eligibility checking in MongoDB queries.
4. **Active Meeting Index**: Index on `roomId` and compound index on `{ classroom: 1, endedAt: 1 }` to fetch current active meetings fast.
