const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

// Track requests so users cannot accidentally start duplicate operations.
let activeRequests = 0;

function updateButtons() {
  const busy = activeRequests > 0;
  loadButton.disabled = busy;
  submitButton.disabled = busy;

  notesList.querySelectorAll(".delete-btn").forEach((button) => {
    button.disabled = busy;
  });
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function startRequest() {
  activeRequests += 1;
  updateButtons();
}

function finishRequest() {
  activeRequests = Math.max(0, activeRequests - 1);
  updateButtons();
}

// Reusable request function: sends the request and rejects unsuccessful responses.
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`The server returned status ${response.status}.`);
  }

  // DELETE responses may have no body.
  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  const data = await response.json();
  return { data, status: response.status };
}

function showEmptyState() {
  const emptyItem = document.createElement("li");
  emptyItem.className = "empty-state";
  emptyItem.textContent = "No notes to display yet.";
  notesList.replaceChildren(emptyItem);
}

function renderNote(note, position = "bottom") {
  const item = document.createElement("li");
  item.className = "note-item";
  item.dataset.id = String(note.id);

  const heading = document.createElement("h3");
  heading.textContent = note.title || "Untitled note";

  const body = document.createElement("p");
  body.textContent = note.body || "No body provided.";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteNote(note.id, item));

  item.append(heading, body, deleteButton);

  if (position === "top") {
    notesList.prepend(item);
  } else {
    notesList.append(item);
  }

  updateButtons();
}

// Task 1: GET the latest 10 practice posts.
async function loadNotes() {
  startRequest();
  setStatus("Loading notes...");

  try {
    const result = await request(`${API_URL}?_limit=10`);
    const notes = result.data;

    notesList.replaceChildren();

    if (notes.length === 0) {
      showEmptyState();
      setStatus("No notes were found.", "success");
      return;
    }

    notes.forEach((note) => renderNote(note));
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    setStatus(
      "Sorry, we couldn't load your notes. Check your connection and try again.",
      "error"
    );
    console.error("Load notes failed:", error);
  } finally {
    finishRequest();
  }
}

// Task 2: POST a new practice post.
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    setStatus("Please enter a title before creating your note.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  startRequest();
  setStatus("Creating your note...");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    // JSONPlaceholder simulates creation; it does not persist this new post.
    const newNote = result.data;

    if (notesList.querySelector(".empty-state")) {
      notesList.replaceChildren();
    }

    renderNote(newNote, "top");
    setStatus(
      `Note created (status ${result.status}, id ${newNote.id}).`,
      "success"
    );
    noteForm.reset();
  } catch (error) {
    setStatus(
      "Sorry, your note couldn't be created. Please try again.",
      "error"
    );
    console.error("Create note failed:", error);
  } finally {
    finishRequest();
  }
}

// Task 3: DELETE a post. JSONPlaceholder simulates deletion but does not
// permanently change its stored collection, so the removal is local to this page.
async function deleteNote(id, item) {
  startRequest();
  setStatus("Deleting note...");

  try {
    await request(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    item.remove();

    if (notesList.querySelectorAll(".note-item").length === 0) {
      showEmptyState();
    }

    setStatus(`Note ${id} deleted from this page.`, "success");
  } catch (error) {
    setStatus(
      "Sorry, this note couldn't be deleted. Please try again.",
      "error"
    );
    console.error("Delete note failed:", error);
  } finally {
    finishRequest();
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

// Display a helpful initial state.
showEmptyState();