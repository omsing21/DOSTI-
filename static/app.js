const state = {
  profile: null,
  posts: [],
  recommendations: [],
  matched: [],
  events: [],
  bert: null,
  databaseStats: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatTime(seconds) {
  const diff = Math.max(1, Math.floor((Date.now() / 1000 - seconds) / 60));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function pixelAvatar(user, size = "") {
  const initials = escapeHtml(user.avatar || user.name?.slice(0, 2) || "D");
  return `<div class="pixel-avatar ${size}"><span>${initials}</span><i></i><b></b></div>`;
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#appScreen").classList.remove("hidden");
}

function setView(viewId) {
  $$(".nav-btn, .view").forEach((item) => item.classList.remove("active"));
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add("active");
  document.querySelector(`#${viewId}`)?.classList.add("active");
}

function renderAll() {
  renderMiniProfile();
  renderProfileForm();
  renderProfileCard();
  renderRecommendations();
  renderMatched();
  renderEvents();
  renderFeed();
  renderBert();
}

function renderMiniProfile() {
  const user = state.profile;
  $("#miniProfile").innerHTML = `
    ${pixelAvatar(user)}
    <h2>${escapeHtml(user.name)}</h2>
    <p>${escapeHtml(user.locality)}, ${escapeHtml(user.city)}</p>
    <div class="chip-row">${user.interests.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  `;
  $("#aiBadge").textContent = state.bert?.source || "BERT ready";
  $("#dbStats").textContent = `${state.databaseStats.users} users | ${state.databaseStats.events} events | ${state.databaseStats.posts} posts`;
}

function renderProfileForm() {
  const user = state.profile;
  $("#profileName").value = user.name;
  $("#profileAvatar").value = user.avatar;
  $("#profileLocality").value = user.locality;
  $("#profileInterests").value = user.interests.join(", ");
  $("#profileHobbies").value = user.hobbies.join(", ");
  $("#profileBio").value = user.bio;
}

function renderProfileCard() {
  const user = state.profile;
  $("#profileCard").innerHTML = `
    ${pixelAvatar(user, "large")}
    <div>
      <h3>${escapeHtml(user.name)}</h3>
      <p>${escapeHtml(user.email)}</p>
      <p>${escapeHtml(user.college)}</p>
      <p>${escapeHtml(user.locality)}, ${escapeHtml(user.city)}</p>
      <p class="bio-line">${escapeHtml(user.bio)}</p>
      <h4>Interests</h4>
      <div class="chip-row">${user.interests.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      <h4>Hobbies</h4>
      <div class="chip-row">${user.hobbies.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
  `;
}

function matchCard(item, includeButton) {
  const user = item.user;
  const shared = item.sharedInterests.length
    ? item.sharedInterests.map((interest) => `<span>${escapeHtml(interest)}</span>`).join("")
    : "<span>BERT semantic overlap</span>";
  return `
    <article class="friend-card">
      <div class="friend-top">
        ${pixelAvatar(user)}
        <div>
          <h3>${escapeHtml(user.name)}</h3>
          <p>${escapeHtml(user.locality)}, ${escapeHtml(user.city)}</p>
        </div>
        <strong>${Math.round(item.score * 100)}%</strong>
      </div>
      <p>${escapeHtml(user.bio)}</p>
      <div class="meter"><span style="width:${Math.round(item.score * 100)}%"></span></div>
      <div class="score-grid">
        <span>BERT ${Math.round(item.semanticScore * 100)}%</span>
        <span>Locality ${Math.round(item.locationScore * 100)}%</span>
      </div>
      <div class="chip-row">${shared}</div>
      <p class="explain-line">${escapeHtml(item.explanation)}</p>
      ${includeButton ? `<button data-match="${escapeHtml(user.id)}">Make Friend</button>` : `<button class="ghost-btn">Text ${escapeHtml(user.name.split(" ")[0])}</button>`}
    </article>
  `;
}

function renderRecommendations() {
  $("#discoverList").innerHTML = state.recommendations.map((item) => matchCard(item, true)).join("");
  $$("[data-match]").forEach((button) => {
    button.addEventListener("click", async () => {
      const data = await fetchJson("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: button.dataset.match }),
      });
      state.matched = data.matched;
      const recData = await fetchJson("/api/recommendations");
      state.recommendations = recData.items;
      renderRecommendations();
      renderMatched();
      setView("matchedView");
    });
  });
}

function renderMatched() {
  $("#matchedList").innerHTML = state.matched.length
    ? state.matched.map((item) => matchCard(item, false)).join("")
    : `<div class="empty-state">No matches yet. Go make a friend from the discovery screen.</div>`;
}

function renderEvents() {
  $("#eventList").innerHTML = state.events.map((event) => `
    <article class="event-card">
      <div>
        <span class="event-time">${escapeHtml(event.time)}</span>
        <h3>${escapeHtml(event.title)}</h3>
        <p>Hosted by ${escapeHtml(event.host)} at ${escapeHtml(event.locality)}</p>
      </div>
      <p>${escapeHtml(event.summary)}</p>
      <div class="chip-row">${event.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <p class="attendees">${event.attendees.length} attending: ${escapeHtml(event.attendees.slice(0, 4).join(", "))}</p>
      <form class="message-form" data-event="${escapeHtml(event.id)}">
        <input placeholder="Text the host to join..." />
        <button type="submit">Send</button>
      </form>
    </article>
  `).join("");

  $$(".message-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = form.querySelector("input");
      const data = await fetchJson("/api/event-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: form.dataset.event, message: input.value }),
      });
      state.events = state.events.map((item) => item.id === data.event.id ? data.event : item);
      renderEvents();
    });
  });
}

function renderFeed() {
  $("#feedList").innerHTML = state.posts.map((post) => `
    <article class="feed-card">
      <div class="feed-head">
        <strong>${escapeHtml(post.author)}</strong>
        <span>${formatTime(post.createdAt)}</span>
      </div>
      <p>${escapeHtml(post.text)}</p>
      <div class="chip-row">
        <span>${escapeHtml(post.analysis.label)} ${Math.round(post.analysis.score * 100)}%</span>
        <span>${escapeHtml(post.analysis.source)}</span>
        ${post.analysis.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderBert() {
  $("#formula").textContent = state.bert.formula;
  $("#bertSteps").innerHTML = state.bert.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await fetchJson("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: $("#loginName").value, email: $("#loginEmail").value }),
  });
  await loadBootstrap();
  showApp();
});

$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await fetchJson("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: $("#profileName").value,
      avatar: $("#profileAvatar").value,
      locality: $("#profileLocality").value,
      interests: splitCsv($("#profileInterests").value),
      hobbies: splitCsv($("#profileHobbies").value),
      bio: $("#profileBio").value,
    }),
  });
  state.profile = data.profile;
  state.recommendations = data.recommendations;
  renderAll();
  setView("discoverView");
});

$("#eventForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await fetchJson("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: $("#eventTitle").value,
      time: $("#eventTime").value,
      locality: $("#eventLocality").value,
      tags: splitCsv($("#eventTags").value),
      summary: $("#eventSummary").value,
    }),
  });
  state.events.unshift(data.event);
  event.target.reset();
  renderEvents();
});

$("#postText").addEventListener("input", () => {
  $("#counter").textContent = `${$("#postText").value.length}/280`;
});

$("#analyzeBtn").addEventListener("click", async () => {
  const text = $("#postText").value.trim();
  if (!text) return;
  const data = await fetchJson("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  $("#postInsight").textContent = `${data.analysis.label} with ${Math.round(data.analysis.score * 100)}% confidence via ${data.analysis.source}.`;
});

$("#postForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await fetchJson("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: $("#postText").value }),
  });
  state.posts.unshift(data.post);
  $("#postText").value = "";
  $("#counter").textContent = "0/280";
  renderFeed();
});

$$(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

async function loadBootstrap() {
  const data = await fetchJson("/api/bootstrap");
  state.profile = data.profile;
  state.posts = data.posts;
  state.recommendations = data.recommendations;
  state.matched = data.matched;
  state.events = data.events;
  state.bert = data.bert;
  state.databaseStats = data.databaseStats;
  renderAll();
}

loadBootstrap();
