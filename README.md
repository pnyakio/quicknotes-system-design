# QuickNotes System Design

## Project Overview

QuickNotes is a browser-based notes application designed to demonstrate how a front end communicates with a REST API and how a real notes service could scale to support one million registered users.

The API client uses the JSONPlaceholder practice API to load, create and delete sample posts. The accompanying design documents describe the proposed production API, relational data model and scalable system architecture.

## Features

- Load up to 10 notes from a remote API.
- Create notes with a required title and optional body.
- Delete notes from the displayed list.
- Display loading, success, error and empty states.
- Validate titles and enforce a 100-character maximum.
- Disable action buttons while requests are running.
- Display user-provided text safely using `textContent`.
- Document the production API, database schema and architecture.

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API and asynchronous JavaScript
- JSONPlaceholder REST API
- PostgreSQL for the proposed production database
- Git and GitHub
- Visual Studio Code and Live Server

## Project Structure

```text id="vub3ak"
quicknotes-system-design/
├── index.html
├── style.css
├── api.js
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to Run the API Client

### Requirements

- A modern web browser.
- Visual Studio Code.
- The Live Server extension for VS Code.
- An internet connection to reach JSONPlaceholder.

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/quicknotes-system-design.git
   ```

2. Open the project folder in Visual Studio Code.
3. Install the Live Server extension if it is not already installed.
4. Right-click `index.html` and select **Open with Live Server**.
5. Click **Load notes** to fetch the first 10 sample posts.
6. Use the form to create a note or select **Delete** to remove a displayed note.

Replace `YOUR-USERNAME` in the clone command with your GitHub username.

### API behaviour

The client sends requests to:

`https://jsonplaceholder.typicode.com/posts`

- **GET:** Loads up to 10 sample posts.
- **POST:** Sends a new post and displays the simulated response.
- **DELETE:** Sends a delete request and removes the displayed note after success.

**Important:** JSONPlaceholder is a testing API. It simulates creating and deleting posts but does not permanently persist those changes. Refreshing or reloading the original collection may bring back deleted sample posts, and newly created posts may disappear.

The production API described in the design documents has not been implemented by this front-end exercise.

## Design Documents

- [API Design](docs/api-design.md) — REST endpoints, request and response examples, authentication and error handling.
- [Data Model](docs/data-model.md) — Users, notes, tags, relationships, SQL schema, queries and indexes.
- [System Architecture](docs/architecture.md) — Requirements, traffic estimates, architecture diagram, request flows, trade-offs and reliability.

## What I Learned

1. **Working with APIs:** How to use `fetch()`, HTTP methods, JSON request bodies and asynchronous JavaScript to communicate with a remote service.
2. **Error handling and validation:** How to handle unsuccessful requests, show useful status messages, validate form input and disable buttons while requests are running.
3. **Safe DOM updates:** Why user-provided text should be inserted using `textContent` rather than interpreted as HTML.
4. **REST API design:** How to organise resources into endpoints and use HTTP status codes consistently.
5. **Relational database design:** How primary keys, foreign keys, indexes and JOIN queries support reliable data storage.
6. **System architecture and scaling:** How load balancers, multiple application servers, caches, read replicas, queues and workers address different performance and reliability challenges.
7. **Git and GitHub:** How to maintain meaningful commits and push work to a public repository.

## Future Improvements

- Connect the client to a real backend API and persistent database.
- Add user registration, authentication and authorisation.
- Support editing notes, searching and pagination.
- Add automated tests and improve accessibility.
- Deploy the production service with monitoring, backups and high availability.

## Author

Created as part of a software engineering learning assignment focused on API integration and system design.