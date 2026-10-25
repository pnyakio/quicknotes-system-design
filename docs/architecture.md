# QuickNotes System Architecture

## 1. Overview

QuickNotes is evolving from a browser-only application into an online service designed to support one million registered users. The architecture separates the client, application servers, caching, database storage and background processing so each layer can scale independently.

The API client currently uses JSONPlaceholder for practice. This document describes the proposed production architecture for the real QuickNotes service.

## 2. Functional requirements

The system must allow users to:

1. Register and sign in securely.
2. Create notes with a required title and optional body.
3. View, search and paginate through their own notes.
4. Update and delete their notes.
5. Create tags and associate tags with notes.
6. Access the service from a web browser.
7. Receive clear loading, success and error feedback.

## 3. Non-functional requirements

- **Scalability:** Add application servers as traffic increases.
- **Availability:** Avoid depending on a single application server or database instance.
- **Performance:** Use caching and a CDN to reduce unnecessary requests and latency.
- **Security:** Use HTTPS, authentication, authorisation, input validation and encrypted secrets.
- **Reliability:** Use durable database storage, backups, monitoring and retryable background jobs.
- **Consistency:** Preserve relationships and ownership rules in the database.
- **Maintainability:** Separate the client, API, data layer and background workers.
- **Recoverability:** Define recovery procedures and regularly test database restoration.

Availability and performance targets should be agreed upon and measured before production launch.

## 4. Load estimates for one million users

### Assumptions

These are illustrative planning assumptions, not measured production traffic.

- Registered users: 1,000,000.
- Daily active users: 10% of registered users = 100,000.
- Each active user reads 50 note or feed pages per day.
- Each active user creates 2 notes per day.
- Each new note stores an average of 10 KB of text and metadata.
- One day contains 86,400 seconds.
- Peak traffic is five times average traffic.
- Each day's new notes are retained for a year.
- Storage calculations exclude indexes, backups, replicas, logs and other overhead.

### Reads per second

Daily reads:

100,000 active users × 50 reads = 5,000,000 reads/day.

Average read rate:

5,000,000 ÷ 86,400 ≈ 57.9 reads/second.

Estimated peak read rate:

57.9 × 5 ≈ 289 reads/second.

### Writes per second

Daily writes:

100,000 active users × 2 notes = 200,000 writes/day.

Average write rate:

200,000 ÷ 86,400 ≈ 2.3 writes/second.

Estimated peak write rate:

2.3 × 5 ≈ 11.6 writes/second.

These estimates count note creation only. Updates, deletes, tag changes and authentication-related traffic are excluded.

### Storage per year

Assuming 10 KB of stored text and metadata per note:

200,000 notes/day × 10 KB = 2 GB/day.

Annual storage:

2 GB/day × 365 = approximately 730 GB/year.

This is raw logical storage for new notes. Actual provisioned capacity must account for indexes, replicas, backups, growth and operational overhead.

## 5. Architecture diagram

```text
                         USERS
                           |
                           v
                    +-------------+
                    | Web Client  |
                    +-------------+
                           |
                           v
                    +-------------+
                    |     DNS     |
                    +-------------+
                           |
                           v
                    +-------------+
                    |     CDN     |
                    +-------------+
                           |
                           v
                    +------------------+
                    | Load Balancer    |
                    +------------------+
                       /           \
                      v             v
               +-------------+ +-------------+
               | App Server 1| | App Server 2|
               +-------------+ +-------------+
                      |             |
                      +------+------+
                             |
                 +-----------+-----------+
                 |                       |
                 v                       v
           +-------------+         +-------------+
           | Cache       |         | Message     |
           | (Redis)     |         | Queue       |
           +-------------+         +-------------+
                 |                       |
                 v                       v
           +-------------+         +-------------+
           | Primary DB  |         | Background  |
           | (PostgreSQL)|         | Worker      |
           +-------------+         +-------------+
                 |
                 v
           +-------------+
           | Read Replica|
           +-------------+
```

The diagram is a logical overview. The application routes reads to the cache and, where appropriate, the read replica; writes go to the primary database. The queue carries asynchronous jobs to workers.

## 6. Components and the problems they solve

| Component | Problem it solves |
|---|---|
| Web client | Gives users an interface to create, read, update and delete notes. |
| DNS | Resolves the service's domain name to its network endpoint. |
| CDN | Caches eligible static assets near users to reduce latency and origin traffic. |
| Load balancer | Distributes requests across healthy application servers. |
| App servers | Execute API logic, validate input, authenticate users and enforce ownership rules. |
| Cache (Redis) | Stores frequently requested data temporarily to reduce database load and response time. |
| Primary database | Stores authoritative note, user, tag and relationship data and handles writes. |
| Read replica | Serves eligible read queries to reduce pressure on the primary database. |
| Message queue | Holds background jobs durably so temporary worker failures do not lose queued work. |
| Background worker | Processes asynchronous tasks, such as notifications or search indexing, outside the request-response path. |

### Additional operational components

- **Monitoring and alerting:** Detect errors, high latency, resource pressure and service outages.
- **Backups and recovery:** Allow data restoration after accidental deletion or infrastructure failure.
- **Secrets management:** Keeps database credentials and API secrets out of source code.

## 7. GET /notes request flow

1. The user opens QuickNotes in a browser.
2. DNS resolves the API domain, and the request travels over HTTPS.
3. The CDN serves eligible cached static files; personalised API responses should not be publicly cached.
4. The load balancer forwards the API request to a healthy application server.
5. The application server validates the access token and confirms the user's permissions.
6. The server checks Redis for a suitable cached result keyed by the user and query parameters.
7. If the cache contains a valid result, the server returns it.
8. On a cache miss, the server queries the read replica when replica lag is acceptable, or the primary database when fresh data is required.
9. The server caches an eligible result with an appropriate expiry and returns JSON with HTTP 200.
10. The client displays the notes and an appropriate success or empty-state message.

Cache entries must be isolated by user and relevant query parameters to prevent one user from seeing another user's notes.

## 8. POST /notes request flow

1. The user submits a note from the browser.
2. The client validates the required title and its 100-character maximum.
3. The client sends an HTTPS POST request with JSON and an access token.
4. DNS resolves the API domain, and the load balancer selects a healthy application server.
5. The application server authenticates the user, validates the request and checks permissions.
6. The application inserts the note into the primary database using a parameterised query or transaction.
7. The database assigns the note ID and timestamps, then confirms the committed write.
8. The application invalidates or updates relevant cache entries so subsequent reads do not show stale data.
9. The application returns HTTP 201 Created with the new note representation.
10. The browser adds the returned note to the list and shows a success message.

If secondary work is needed, such as sending a notification or indexing the note for search, the application can publish a job to the message queue. A worker processes that job independently. The primary database remains the source of truth for the note.

## 9. Trade-offs

### Trade-off 1: Cache speed versus data freshness

Caching reduces database traffic and improves response time, but cached notes may become stale after an update or deletion. Use short, suitable expiry times and invalidate affected cache entries after successful writes. Read-after-write operations can query the primary database when necessary.

### Trade-off 2: Read replicas versus consistency

Read replicas distribute read load, but replication can lag behind the primary database. This may cause a recently created or updated note to be temporarily missing from a read. Route freshness-sensitive reads to the primary and use replicas for reads that can tolerate slight delays.

### Trade-off 3: High availability versus cost

Multiple servers, database replicas, backups and monitoring improve resilience but increase infrastructure costs. Start with a modest redundant deployment and scale capacity according to traffic and service-level targets.

### Trade-off 4: Asynchronous work versus complexity

Queues keep slow background jobs out of the main request path, improving responsiveness. However, workers may process jobs more than once or fail temporarily. Use retry policies, idempotent jobs, monitoring and a dead-letter queue for jobs that repeatedly fail.

## 10. Avoiding single points of failure

- **Application layer:** Run at least two application servers across separate failure domains behind a health-checking load balancer.
- **Load balancer and DNS:** Use managed, redundant services and health-aware routing where available.
- **Database:** Configure a standby or managed high-availability failover mechanism in addition to read replicas; a read replica alone is not a complete failover strategy.
- **Cache:** Use a highly available cache deployment or design the application to continue with slower database reads if the cache is unavailable.
- **Queue and workers:** Use a durable, replicated queue and multiple worker instances with retry and recovery procedures.
- **Storage and recovery:** Use automated backups, appropriate retention, monitoring and regularly tested restoration procedures.
- **Operations:** Monitor service health and test failover and recovery plans before relying on them in production.

Redundancy reduces single points of failure but does not guarantee uninterrupted service. The complete design should be tested under component failures and real traffic.

## 11. Conclusion

QuickNotes can support growth by separating API processing, caching, persistent storage and background jobs. Capacity estimates provide an initial planning baseline, while monitoring and load testing will show when to scale. Security, backups, failover and consistency controls are essential before moving from a practice API to a production service.