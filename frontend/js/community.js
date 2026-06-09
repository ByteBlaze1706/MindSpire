// frontend/js/community.js
const API_COMMUNITY = "http://localhost:8080/api/community";
const API_AUTH = "http://localhost:8080/api/auth";

let currentCategory = "all";
let currentFeedType = "recent"; // "recent" or "trending"
let activeCommentsPostId = null;

// Auth Guard & Dev Mode Setup
let profile = JSON.parse(sessionStorage.getItem("profile"));
if (!profile && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  profile = {
    id: "44444444-4444-4444-4444-444444444444",
    email: "student1@columbia.edu",
    role: "student",
    institutionId: "e5f6a7b8-1111-1111-1111-111111111111",
    subdomain: "columbia"
  };
  sessionStorage.setItem("profile", JSON.stringify(profile));
}

if (!profile) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    loadFeed();
  }
});

// Switch feed type
function setFeedType(type) {
  currentFeedType = type;
  document.getElementById("feed-recent-btn").classList.toggle("active", type === "recent");
  document.getElementById("feed-trending-btn").classList.toggle("active", type === "trending");
  document.getElementById("feed-type-desc").innerText = type === "recent" 
    ? "Showing posts ordered by latest publication" 
    : "Showing posts ranked by custom engagement trends";
  loadFeed();
}

// Category filter
function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-cat") === cat);
  });
  loadFeed();
}

// Load Posts Feed
async function loadFeed() {
  const loading = document.getElementById("feed-loading");
  const empty = document.getElementById("feed-empty");
  const container = document.getElementById("posts-container");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  container.innerHTML = "";

  try {
    let url = currentFeedType === "trending" 
      ? `${API_COMMUNITY}/trending`
      : `${API_COMMUNITY}/posts?category=${encodeURIComponent(currentCategory)}`;

    const res = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load community posts.");
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    renderFeed(data);
  } catch (err) {
    loading.classList.add("d-none");
    container.innerHTML = `<div class="text-center text-danger text-xs py-5">Error: ${err.message}</div>`;
  }
}

// Render feed list
function renderFeed(posts) {
  const container = document.getElementById("posts-container");
  container.innerHTML = "";

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card d-flex flex-column gap-3";
    
    const date = new Date(post.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const reactionCounts = post.reactionCounts || {};
    const supportVal = reactionCounts["support"] || 0;
    const helpfulVal = reactionCounts["helpful"] || 0;
    const relatableVal = reactionCounts["relatable"] || 0;
    const encourageVal = reactionCounts["encouraging"] || 0;

    const activeSupport = post.userReaction === 'support' ? 'active' : '';
    const activeHelpful = post.userReaction === 'helpful' ? 'active' : '';
    const activeRelatable = post.userReaction === 'relatable' ? 'active' : '';
    const activeEncourage = post.userReaction === 'encouraging' ? 'active' : '';

    card.innerHTML = `
      <div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge badge-wellness" style="background-color: var(--primary-color); color: var(--white);">${post.category}</span>
          <span class="text-xs text-muted">${date}</span>
        </div>
        <h3 class="h6 text-dark font-semibold mb-2" style="font-size: 15px;">${post.title}</h3>
        <p class="text-sm text-dark mb-0 leading-relaxed" style="white-space: pre-wrap;">${post.content}</p>
      </div>

      <div class="d-flex justify-content-between align-items-center border-top pt-3 mt-2 flex-wrap gap-2">
        <div class="d-flex gap-1.5 flex-wrap">
          <button onclick="toggleReaction('${post.id}', 'support')" class="reaction-pill ${activeSupport}">💚 Support (${supportVal})</button>
          <button onclick="toggleReaction('${post.id}', 'helpful')" class="reaction-pill ${activeHelpful}">💡 Helpful (${helpfulVal})</button>
          <button onclick="toggleReaction('${post.id}', 'relatable')" class="reaction-pill ${activeRelatable}">🤝 Relatable (${relatableVal})</button>
          <button onclick="toggleReaction('${post.id}', 'encouraging')" class="reaction-pill ${activeEncourage}">✨ Encouraging (${encourageVal})</button>
        </div>

        <div class="d-flex gap-3 align-items-center">
          <button onclick="toggleComments('${post.id}')" class="btn btn-link text-xs p-0 text-decoration-none" style="color: var(--primary-color); font-weight: 500;">
            💬 Comments (${post.commentCount})
          </button>
          <button onclick="reportContent('${post.id}', 'post')" class="btn btn-link text-danger text-xs p-0 text-decoration-none" style="font-size: 10px;">
            ⚠️ Report
          </button>
        </div>
      </div>

      <!-- Collapsible comments thread -->
      <div id="comments-section-${post.id}" class="d-none border-top pt-3 mt-2">
        <div id="comments-list-${post.id}" class="d-flex flex-column gap-2 mb-3"></div>
        
        <form onsubmit="submitComment(event, '${post.id}')" class="d-flex gap-2 align-items-center">
          <input type="text" id="comment-input-${post.id}" required class="form-control form-control-sm rounded-3 text-xs" placeholder="Write a supportive reply..." />
          <button type="submit" class="btn btn-primary-wellness btn-sm rounded-3 text-xs px-3">Reply</button>
        </form>
      </div>
    `;

    container.appendChild(card);
  });
}

// Submit Post
async function submitPost(e) {
  e.preventDefault();
  const alertDiv = document.getElementById("post-alert");
  alertDiv.classList.add("d-none");

  const title = document.getElementById("post-title").value.trim();
  const content = document.getElementById("post-content").value.trim();
  const cat = document.getElementById("post-category").value;
  const isAnon = document.getElementById("post-anonymous").checked;
  const btn = document.getElementById("submit-post-btn");

  if (!title || !content) return;

  btn.disabled = true;
  btn.innerText = "Publishing...";

  try {
    const res = await fetch(`${API_COMMUNITY}/posts/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, content, category: cat, isAnonymous: isAnon
      }),
      credentials: "include"
    });

    const data = await res.json();

    if (res.status === 451) {
      // Distress warning detected, trigger emergency modal
      new bootstrap.Modal(document.getElementById('crisisHelplineModal')).show();
      document.getElementById("post-title").value = "";
      document.getElementById("post-content").value = "";
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || "Failed to publish post.");
    }

    // Success
    document.getElementById("post-title").value = "";
    document.getElementById("post-content").value = "";
    loadFeed();
  } catch (err) {
    alertDiv.innerText = err.message;
    alertDiv.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.innerText = "Publish Post";
  }
}

// Toggle comments panel
async function toggleComments(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  if (!section.classList.contains("d-none")) {
    section.classList.add("d-none");
    return;
  }

  section.classList.remove("d-none");
  loadComments(postId);
}

// Load Comments
async function loadComments(postId) {
  const container = document.getElementById(`comments-list-${postId}`);
  container.innerHTML = "<div class='text-center py-3 text-muted text-xs'>Loading replies...</div>";

  try {
    const res = await fetch(`${API_COMMUNITY}/posts/${postId}/comments`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Could not load comments.");
    const comments = await res.json();

    container.innerHTML = "";
    if (comments.length === 0) {
      container.innerHTML = "<div class='text-center py-2 text-muted text-xs'>No replies yet. Share some support!</div>";
      return;
    }

    // Map parent to child tree (support simple 1-level stepper nest)
    const parents = comments.filter(c => !c.parentId);
    const children = comments.filter(c => c.parentId);

    parents.forEach(parent => {
      const pDiv = document.createElement("div");
      pDiv.className = "comment-card";
      pDiv.innerHTML = `
        <div class="d-flex justify-content-between text-muted" style="font-size: 10px;">
          <strong>🎭 ${parent.authorPseudonym}</strong>
          <span>${new Date(parent.createdAt).toLocaleTimeString()}</span>
        </div>
        <p class="text-xs text-dark mt-1 mb-1">${parent.content}</p>
        <div class="d-flex justify-content-end gap-2">
          <button onclick="setCommentParent('${postId}', '${parent.id}', '${parent.authorPseudonym}')" class="btn btn-link text-xs p-0 text-decoration-none" style="font-size: 10px; color: var(--primary-color);">Reply</button>
          <button onclick="reportContent('${parent.id}', 'comment')" class="btn btn-link text-danger text-xs p-0 text-decoration-none" style="font-size: 9px;">Report</button>
        </div>
      `;
      container.appendChild(pDiv);

      // Append replies nested
      const replies = children.filter(c => c.parentId === parent.id);
      replies.forEach(reply => {
        const rDiv = document.createElement("div");
        rDiv.className = "comment-reply-card";
        rDiv.innerHTML = `
          <div class="d-flex justify-content-between text-muted" style="font-size: 10px;">
            <strong>🎭 ${reply.authorPseudonym}</strong>
            <span>${new Date(reply.createdAt).toLocaleTimeString()}</span>
          </div>
          <p class="text-xs text-dark mt-1 mb-1">${reply.content}</p>
          <div class="d-flex justify-content-end">
            <button onclick="reportContent('${reply.id}', 'comment')" class="btn btn-link text-danger text-xs p-0 text-decoration-none" style="font-size: 9px;">Report</button>
          </div>
        `;
        container.appendChild(rDiv);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class='text-center text-danger text-xs py-2'>Error loading comments.</div>`;
  }
}

// Preset parent comments for nested threads
function setCommentParent(postId, parentId, authorName) {
  const input = document.getElementById(`comment-input-${postId}`);
  input.value = `@${authorName} `;
  input.focus();
  // Store parentId mapping in input attribute
  input.setAttribute("data-parent-id", parentId);
}

// Submit Comment reply
async function submitComment(e, postId) {
  e.preventDefault();
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  const parentId = input.getAttribute("data-parent-id") || null;

  if (!content) return;

  try {
    const res = await fetch(`${API_COMMUNITY}/posts/${postId}/comments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content,
        parentId: parentId,
        isAnonymous: true
      }),
      credentials: "include"
    });

    const data = await res.json();

    if (res.status === 451) {
      new bootstrap.Modal(document.getElementById('crisisHelplineModal')).show();
      input.value = "";
      return;
    }

    if (!res.ok) throw new Error(data.error || "Failed to submit comment.");

    input.value = "";
    input.removeAttribute("data-parent-id");
    loadComments(postId);
  } catch (err) {
    alert(err.message);
  }
}

// Toggle custom reactions
async function toggleReaction(postId, type) {
  try {
    const res = await fetch(`${API_COMMUNITY}/posts/${postId}/react?type=${type}`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed");
    
    // Reload feed
    loadFeed();
  } catch (err) {
    console.error("Reaction toggle failed.");
  }
}

// Report content
async function reportContent(id, targetType) {
  const reason = prompt("State your reason for flagging this content:");
  if (!reason || !reason.trim()) return;

  try {
    const url = targetType === 'post' 
      ? `${API_COMMUNITY}/posts/${id}/report`
      : `${API_COMMUNITY}/comments/${id}/report`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason }),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Report failed.");
    alert("This content has been reported for moderator review. Thank you for keeping our community safe.");
  } catch (err) {
    alert(err.message);
  }
}

// Logout handler
async function logout() {
  try {
    await fetch(`${API_AUTH}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (e) {}
  sessionStorage.clear();
  window.location.href = "login.html";
}
