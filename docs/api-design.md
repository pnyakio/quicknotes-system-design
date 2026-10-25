# QuickNotes API Design

## 1. Overview

The QuickNotes API allows authenticated users to create, view, update, organise and delete their notes. It follows REST principles and exchanges JSON data over HTTPS.

**Base URL:** `https://api.quicknotes.example/v1`

The example domain is a placeholder for the future production API.

### Authentication

Clients send a valid access token in the header:

`Authorization: Bearer <access_token>`

### Common conventions

- Request and response bodies use JSON.
- Note IDs are unique identifiers.
- Dates use ISO 8601 format in UTC.
- Users can access only notes they are authorised to manage.
- Successful requests return an appropriate HTTP status code.

## 2. REST endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/v1/auth/register` | Register a new user | 201 Created |
| POST | `/v1/auth/login` | Authenticate a user | 200 OK |
| GET | `/v1/notes` | List the current user's notes | 200 OK |
| POST | `/v1/notes` | Create a note | 201 Created |
| GET | `/v1/notes/{noteId}` | Retrieve one note | 200 OK |
| PATCH | `/v1/notes/{noteId}` | Update selected note fields | 200 OK |
| DELETE | `/v1/notes/{noteId}` | Delete a note | 204 No Content |
| GET | `/v1/tags` | List the current user's tags | 200 OK |

### Listing and pagination

`GET /v1/notes` supports optional query parameters:

- `page`: page number, starting at 1.
- `limit`: number of notes per page, with a maximum of 100.
- `search`: search note titles and bodies.
- `tagId`: filter notes by tag.

Example:

`GET /v1/notes?page=1&limit=20`

## 3. Create a note

### Request

`POST /v1/notes`

Headers:

`Content-Type: application/json`

`Authorization: Bearer <access_token>`

Request body:

```json
{
  "title": "My first note",
  "body": "Ideas for the QuickNotes project",
  "tagIds": [2, 4]
}
```

The title is required and must contain between 1 and 100 characters after trimming whitespace. The body is optional. Every supplied tag must belong to the authenticated user.

### Successful response

Status: `201 Created`

```json
{
  "data": {
    "id": 101,
    "userId": 7,
    "title": "My first note",
    "body": "Ideas for the QuickNotes project",
    "tags": [
      { "id": 2, "name": "Projects" },
      { "id": 4, "name": "Ideas" }
    ],
    "createdAt": "2026-10-25T10:30:00Z",
    "updatedAt": "2026-10-25T10:30:00Z"
  }
}
```

The server generates the note ID and timestamps.

## 4. List notes

### Request

`GET /v1/notes?page=1&limit=2`

### Successful response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "userId": 7,
      "title": "My first note",
      "body": "Ideas for the QuickNotes project",
      "createdAt": "2026-10-25T10:30:00Z",
      "updatedAt": "2026-10-25T10:30:00Z"
    },
    {
      "id": 102,
      "userId": 7,
      "title": "Study plan",
      "body": "Review API design",
      "createdAt": "2026-10-25T11:00:00Z",
      "updatedAt": "2026-10-25T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "totalItems": 15,
    "totalPages": 8
  }
}
```

## 5. Error status codes

| Status | Name | Meaning |
|---|---|---|
| 400 | Bad Request | Invalid input or malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated user lacks permission |
| 404 | Not Found | Resource does not exist or is not accessible |
| 409 | Conflict | Duplicate resource or conflicting operation |
| 422 | Unprocessable Entity | Input fails validation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server-side failure |
| 503 | Service Unavailable | Service temporarily unavailable |

### Example error response

Status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ],
    "requestId": "req_abc123"
  }
}
```

The `requestId` helps the support and engineering teams trace errors in server logs.

## 6. Security and reliability

- Require HTTPS for all API traffic.
- Authenticate protected endpoints.
- Verify note ownership before reading, updating or deleting a note.
- Validate and limit incoming request sizes.
- Use parameterised SQL queries to reduce SQL injection risks.
- Apply rate limiting to protect against abusive traffic.
- Log errors without exposing passwords, tokens or other secrets.
- Use pagination so clients do not need to load every note at once.

## 7. Design decisions

REST endpoints use nouns for resources and HTTP methods for actions. `GET` reads data, `POST` creates resources, `PATCH` updates selected fields, and `DELETE` removes resources.

The API returns standard HTTP statuses so clients can distinguish successful operations, client errors and server failures. Pagination, authentication and ownership checks support a service designed for many users.