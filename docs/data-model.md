# QuickNotes Data Model

## 1. Overview

QuickNotes uses a relational SQL database to store users, notes and tags. The design separates these entities to reduce duplication and uses primary and foreign keys to maintain data integrity.

## 2. Entities and columns

### Users

Stores account information for each registered user.

| Column | Type | Key / constraint | Description |
|---|---|---|---|
| id | INTEGER | Primary key | Unique user ID |
| name | VARCHAR(100) | NOT NULL | User's display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | Secure password hash |
| created_at | TIMESTAMP | NOT NULL | Account creation time |

Passwords must be stored as secure hashes, never as plain text.

### Notes

Stores the notes created by users.

| Column | Type | Key / constraint | Description |
|---|---|---|---|
| id | INTEGER | Primary key | Unique note ID |
| user_id | INTEGER | Foreign key, NOT NULL | Owner of the note |
| title | VARCHAR(100) | NOT NULL | Note title |
| body | TEXT | NULL | Optional note content |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |

### Tags

Stores labels that users can apply to their notes.

| Column | Type | Key / constraint | Description |
|---|---|---|---|
| id | INTEGER | Primary key | Unique tag ID |
| user_id | INTEGER | Foreign key, NOT NULL | User who owns the tag |
| name | VARCHAR(50) | NOT NULL | Tag name |
| created_at | TIMESTAMP | NOT NULL | Creation time |

A tag name should be unique per user, so two different users can both create a tag called "Work".

### Note_tags

Connects notes to tags.

| Column | Type | Key / constraint | Description |
|---|---|---|---|
| note_id | INTEGER | Composite primary key, foreign key | Linked note |
| tag_id | INTEGER | Composite primary key, foreign key | Linked tag |

The composite primary key `(note_id, tag_id)` prevents the same tag from being linked to the same note more than once.

## 3. Relationships

- **Users to notes — one-to-many:** One user can own many notes, but each note has one owner.
- **Users to tags — one-to-many:** One user can create many tags, but each tag belongs to one user.
- **Notes to tags — many-to-many:** One note can have many tags, and one tag can be applied to many notes. The `note_tags` junction table represents this relationship.

## 4. SQL table definitions

The following schema uses PostgreSQL-compatible SQL.

```sql
CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL REFERENCES notes(id)
        ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id)
        ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);
```

## 5. Indexes

Primary keys and unique constraints create indexes automatically in PostgreSQL. Additional indexes help the database find frequently requested records efficiently.

```sql
CREATE INDEX idx_notes_user_created
ON notes (user_id, created_at DESC);

CREATE INDEX idx_tags_user
ON tags (user_id);
```

**Why these indexes?**

- `idx_notes_user_created` helps list a user's notes in newest-first order without scanning every user's notes.
- `idx_tags_user` helps retrieve the tags belonging to a user.

Indexes speed up reads but use storage and add work to inserts and updates, so they should support actual query patterns.

## 6. Example SQL queries

### Query 1: List a user's notes

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 7
ORDER BY created_at DESC
LIMIT 20;
```

This retrieves the latest 20 notes belonging to user 7.

### Query 2: Find notes with a particular title

```sql
SELECT id, title, body
FROM notes
WHERE user_id = 7
  AND title = 'Study plan';
```

The ownership condition ensures the query only returns notes belonging to the requested user.

### Query 3: JOIN notes to their tags

```sql
SELECT
    n.id AS note_id,
    n.title,
    t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = 7
  AND t.user_id = 7
ORDER BY n.id;
```

This query joins three tables to retrieve a user's notes alongside their tag names. Both ownership conditions help prevent accidentally mixing users' data.

### Query 4: Count notes per user

```sql
SELECT
    u.id,
    u.name,
    COUNT(n.id) AS total_notes
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.name
ORDER BY total_notes DESC;
```

The `LEFT JOIN` includes users who have not created any notes.

## 7. SQL versus NoSQL

I would choose a relational SQL database such as PostgreSQL for QuickNotes. The application has clear relationships between users, notes and tags, and SQL supports foreign keys, constraints, joins and transactions that help preserve data consistency. A NoSQL database could be useful for particular high-volume or flexible data workloads, but the structured relationships in this application make SQL a sensible default. Indexing, caching, read replicas and database monitoring can help PostgreSQL scale as usage grows.

## 8. Data integrity and security

- Validate titles in the API before saving them.
- Enforce ownership checks in the backend for every note and tag operation.
- Use parameterised queries rather than concatenating user input into SQL.
- Store password hashes, not plaintext passwords.
- Use transactions when creating or changing notes and their tag relationships.
- Use database backups and test restoration procedures.
- Apply access controls so users cannot retrieve other users' private notes.