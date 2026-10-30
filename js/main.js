// ===== Registration form (register.html) =====
async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById("form-status");

  const payload = {
    full_name: form.full_name.value.trim(),
    grad_year: parseInt(form.grad_year.value, 10),
    email: form.email.value.trim(),
    phone: form.phone.value.trim() || null,
    location: form.location.value.trim() || null,
    profession: form.profession.value.trim() || null,
    skills: form.skills.value.trim() || null,
    bio: form.bio.value.trim() || null,
    approved: false
  };

  const { error } = await supabaseClient.from("members").insert(payload);

  if (error) {
    status.textContent = "Something went wrong: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Thanks! Your registration is pending admin approval.";
    status.className = "form-status success";
    form.reset();
  }
}

// ===== Directory (directory.html) =====
let allMembersCache = [];

async function loadDirectory() {
  const container = document.getElementById("directory-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .eq("approved", true)
    .order("grad_year", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load the directory right now.</p>`;
    return;
  }

  allMembersCache = data;
  populateGradYearFilter(data);
  renderDirectory(data);
}

function populateGradYearFilter(data) {
  const select = document.getElementById("filter-year");
  if (!select) return;
  const years = [...new Set(data.map(m => m.grad_year))].sort((a, b) => b - a);
  select.innerHTML = `<option value="">All years</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function renderDirectory(data) {
  const container = document.getElementById("directory-grid");
  const countEl = document.getElementById("filter-count");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = allMembersCache.length
      ? `<p>No alumni match that search.</p>`
      : `<p>No alumni listed yet — be the first to register!</p>`;
    if (countEl) countEl.textContent = "";
    return;
  }

  container.innerHTML = data.map(m => `
    <div class="card">
      <div class="meta">Class of ${m.grad_year}</div>
      <h3>${escapeHtml(m.full_name)}</h3>
      ${m.profession ? `<p>${escapeHtml(m.profession)}</p>` : ""}
      ${m.location ? `<p class="meta">${escapeHtml(m.location)}</p>` : ""}
      ${m.skills ? `<div class="skill-tags">${m.skills.split(",").map(s => s.trim()).filter(Boolean).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("")}</div>` : ""}
      <a href="mailto:${encodeURIComponent(m.email)}" class="btn btn-outline" style="margin-top:14px; padding:8px 18px; font-size:0.85rem;">Email ${escapeHtml(m.full_name.split(" ")[0])}</a>
    </div>
  `).join("");

  if (countEl) countEl.textContent = `${data.length} alumni found`;
}

function filterDirectory() {
  const query = (document.getElementById("search-directory")?.value || "").toLowerCase().trim();
  const year = document.getElementById("filter-year")?.value || "";

  const filtered = allMembersCache.filter(m => {
    const matchesQuery = !query ||
      m.full_name.toLowerCase().includes(query) ||
      (m.profession && m.profession.toLowerCase().includes(query)) ||
      (m.location && m.location.toLowerCase().includes(query)) ||
      (m.skills && m.skills.toLowerCase().includes(query));
    const matchesYear = !year || String(m.grad_year) === year;
    return matchesQuery && matchesYear;
  });

  renderDirectory(filtered);
}

// ===== Events (events.html + homepage preview) =====
// "Ongoing" = event_date is today or already started (up to 24h ago, so a same-day
// event still shows as ongoing through the day). "Upcoming" = event_date in the future.
let allEventsCache = [];
let currentEventsTab = "ongoing";

function splitEvents(data) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ongoing = [];
  const upcoming = [];
  data.forEach(e => {
    const d = new Date(e.event_date);
    if (d <= now && d >= dayAgo) ongoing.push(e);
    else if (d > now) upcoming.push(e);
  });
  ongoing.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  upcoming.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  return { ongoing, upcoming };
}

function renderEventCards(list) {
  if (!list.length) return null;
  const hasRsvpModal = !!document.getElementById("rsvp-modal");
  return list.map(e => {
    const isPaid = e.ticket_price && e.ticket_price > 0;
    const btnLabel = isPaid
      ? `Buy ticket — ${e.currency || "KES"} ${Number(e.ticket_price).toLocaleString()}`
      : "RSVP";
    return `
    <div class="card">
      <div class="meta">${new Date(e.event_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
      <h3>${escapeHtml(e.title)}</h3>
      ${e.location ? `<p class="meta">${escapeHtml(e.location)}</p>` : ""}
      ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ""}
      ${hasRsvpModal ? `
        <div class="card-footer">
          <span class="rsvp-count" id="rsvp-count-${e.id}">&nbsp;</span>
          <button class="btn btn-outline" style="padding:8px 18px; font-size:0.85rem;" onclick="openRsvpModal('${e.id}', '${escapeHtml(e.title).replace(/'/g, "&#39;")}', ${isPaid ? e.ticket_price : 0}, '${e.currency || "KES"}')">${btnLabel}</button>
        </div>
      ` : ""}
    </div>
  `;
  }).join("");
}

function loadRsvpCounts(list) {
  if (!document.getElementById("rsvp-modal")) return;
  list.forEach(async e => {
    const isPaid = e.ticket_price && e.ticket_price > 0;
    const { data, error } = await supabaseClient.rpc(isPaid ? "get_ticket_count" : "get_rsvp_count", { p_event_id: e.id });
    const el = document.getElementById(`rsvp-count-${e.id}`);
    if (el && !error) el.textContent = isPaid ? `${data} ticket${data === 1 ? "" : "s"} sold` : `${data} going`;
  });
}

function setEventsTab(tab) {
  currentEventsTab = tab;
  document.getElementById("tab-ongoing")?.classList.toggle("active", tab === "ongoing");
  document.getElementById("tab-upcoming")?.classList.toggle("active", tab === "upcoming");
  renderEventsTab();
}

function renderEventsTab() {
  const container = document.getElementById("events-grid");
  if (!container) return;

  const { ongoing, upcoming } = splitEvents(allEventsCache);
  const list = currentEventsTab === "ongoing" ? ongoing : upcoming;

  if (!list.length) {
    container.innerHTML = `<p>No ${currentEventsTab} events right now${currentEventsTab === "ongoing" ? " — check the Upcoming tab" : ""}.</p>`;
    return;
  }
  container.innerHTML = renderEventCards(list);
}

async function loadEvents() {
  const container = document.getElementById("events-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    container.innerHTML = `<p>Couldn't load events right now.</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p>No events scheduled yet — check back soon.</p>`;
    return;
  }

  allEventsCache = data;

  // On the full events.html page the tab buttons exist; default to Ongoing,
  // but fall back to Upcoming automatically if nothing is ongoing right now.
  if (document.getElementById("tab-ongoing")) {
    const { ongoing, upcoming } = splitEvents(data);
    if (!ongoing.length) setEventsTab("upcoming");
    else renderEventsTab();
    loadRsvpCounts([...ongoing, ...upcoming]);
  } else {
    // Homepage preview: no tabs, just show the next few upcoming events.
    const { upcoming } = splitEvents(data);
    const list = upcoming.slice(0, 3);
    container.innerHTML = renderEventCards(list) || `<p>No upcoming events yet — check back soon.</p>`;
    loadRsvpCounts(list);
  }
}

// ===== RSVP / ticket purchase modal =====
function openRsvpModal(eventId, eventTitle, ticketPrice, currency) {
  document.getElementById("rsvp-event-id").value = eventId;
  document.getElementById("rsvp-event-title").textContent = eventTitle;
  document.getElementById("rsvp-status").textContent = "";
  document.getElementById("rsvp-form").reset();
  document.getElementById("rsvp-event-id").value = eventId; // reset() clears hidden inputs too, so set again
  document.getElementById("rsvp-event-price").value = ticketPrice || 0;
  document.getElementById("rsvp-event-currency").value = currency || "KES";

  const isPaid = ticketPrice && ticketPrice > 0;
  const priceNote = document.getElementById("rsvp-price-note");
  document.getElementById("rsvp-modal-heading").textContent = isPaid ? "Buy a ticket" : "RSVP";
  document.getElementById("rsvp-submit-btn").textContent = isPaid
    ? `Pay ${currency || "KES"} ${Number(ticketPrice).toLocaleString()}`
    : "Confirm RSVP";
  if (isPaid) {
    priceNote.textContent = `${currency || "KES"} ${Number(ticketPrice).toLocaleString()} per ticket, paid by card or M-Pesa.`;
    priceNote.style.display = "block";
  } else {
    priceNote.style.display = "none";
  }

  document.getElementById("rsvp-modal").style.display = "flex";
}

async function submitRsvp(event) {
  event.preventDefault();
  const eventId = document.getElementById("rsvp-event-id").value;
  const ticketPrice = parseFloat(document.getElementById("rsvp-event-price").value) || 0;
  const currency = document.getElementById("rsvp-event-currency").value || "KES";
  const full_name = document.getElementById("rsvp-name").value.trim();
  const email = document.getElementById("rsvp-email").value.trim();
  const status = document.getElementById("rsvp-status");

  if (ticketPrice > 0) {
    launchFlutterwave({
      amount: ticketPrice,
      currency,
      email,
      name: full_name,
      title: document.getElementById("rsvp-event-title").textContent,
      txRef: generateTxRef("TICKET"),
      onSuccess: async (data) => {
        const { error } = await supabaseClient
          .from("event_tickets")
          .insert({ event_id: eventId, full_name, email, amount: ticketPrice, currency, payment_reference: data.tx_ref || data.transaction_id || generateTxRef("TICKET") });

        if (error) {
          status.textContent = "Payment went through, but saving your ticket failed — contact us with your payment reference.";
          status.className = "form-status error";
        } else {
          status.textContent = "Payment confirmed — you're in!";
          status.className = "form-status success";
          const countEl = document.getElementById(`rsvp-count-${eventId}`);
          if (countEl) {
            const current = parseInt(countEl.textContent) || 0;
            countEl.textContent = `${current + 1} ticket${current + 1 === 1 ? "" : "s"} sold`;
          }
          setTimeout(() => closeModal("rsvp-modal"), 1500);
        }
      }
    });
    return;
  }

  const { error } = await supabaseClient
    .from("event_rsvps")
    .insert({ event_id: eventId, full_name, email });

  if (error) {
    status.textContent = error.code === "23505"
      ? "You've already RSVP'd with this email."
      : "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "You're on the list!";
    status.className = "form-status success";
    const countEl = document.getElementById(`rsvp-count-${eventId}`);
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = `${current + 1} going`;
    }
    setTimeout(() => closeModal("rsvp-modal"), 1200);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// ===== News (index.html) =====
async function loadAnnouncements() {
  const container = document.getElementById("news-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !data.length) return;

  container.innerHTML = data.map(a => `
    <div class="card">
      <div class="meta">${new Date(a.created_at).toLocaleDateString()}</div>
      <h3>${escapeHtml(a.title)}</h3>
      <p>${escapeHtml(a.body)}</p>
    </div>
  `).join("");
}

// ===== Stats bar (index.html) — live counts, no invented numbers =====
async function loadStats() {
  const container = document.getElementById("stats-bar");
  if (!container) return;

  const [{ data: members }, { data: events }] = await Promise.all([
    supabaseClient.from("members").select("grad_year").eq("approved", true),
    supabaseClient.from("events").select("event_date")
  ]);

  const memberCount = members ? members.length : 0;
  const years = members ? new Set(members.map(m => m.grad_year)) : new Set();
  const upcomingCount = events ? events.filter(e => new Date(e.event_date) > new Date()).length : 0;

  container.innerHTML = `
    <div class="stat">
      <span class="stat-number">${memberCount}</span>
      <span class="stat-label">Registered alumni</span>
    </div>
    <div class="stat">
      <span class="stat-number">${years.size}</span>
      <span class="stat-label">Graduating years represented</span>
    </div>
    <div class="stat">
      <span class="stat-number">${upcomingCount}</span>
      <span class="stat-label">Upcoming events</span>
    </div>
  `;
}

// ===== Photo gallery (gallery.html) =====
async function loadGallery() {
  const container = document.getElementById("gallery-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load the gallery right now.</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p>No photos yet — check back after the next event.</p>`;
    return;
  }

  container.innerHTML = data.map(p => `
    <figure class="photo-card">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title || "Alumni photo")}" loading="lazy">
      ${p.title ? `<figcaption>${escapeHtml(p.title)}</figcaption>` : ""}
    </figure>
  `).join("");
}

// ===== Alumni spotlight (index.html) =====
async function loadSpotlight() {
  const section = document.getElementById("spotlight-section");
  const container = document.getElementById("spotlight-card");
  if (!section || !container) return;

  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .eq("approved", true)
    .eq("is_spotlight", true)
    .order("spotlight_set_at", { ascending: false })
    .limit(1);

  if (error || !data.length) return;

  const m = data[0];
  container.innerHTML = `
    <div class="card spotlight-card">
      <div class="meta">Class of ${m.grad_year}</div>
      <h3>${escapeHtml(m.full_name)}</h3>
      ${m.profession ? `<p class="meta">${escapeHtml(m.profession)}</p>` : ""}
      ${m.spotlight_blurb ? `<p>${escapeHtml(m.spotlight_blurb)}</p>` : ""}
    </div>
  `;
  section.style.display = "block";
}

// ===== Newsletter signup (index.html) =====
async function handleNewsletterSignup(event) {
  event.preventDefault();
  const email = document.getElementById("newsletter-email").value.trim();
  const status = document.getElementById("newsletter-status");

  const { error } = await supabaseClient
    .from("newsletter_subscribers")
    .insert({ email });

  if (error) {
    status.textContent = error.code === "23505"
      ? "You're already subscribed!"
      : "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Subscribed! Thanks for staying in touch.";
    status.className = "form-status success";
    event.target.reset();
  }
}

// ===== Jobs & internships (jobs.html) =====
async function loadJobs() {
  const container = document.getElementById("jobs-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("jobs")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load listings right now.</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p>No openings posted yet — check back soon, or post one below.</p>`;
    return;
  }

  container.innerHTML = data.map(j => `
    <div class="card">
      <div class="meta">${new Date(j.created_at).toLocaleDateString()}</div>
      <h3>${escapeHtml(j.title)}</h3>
      ${j.company ? `<p class="meta">${escapeHtml(j.company)}</p>` : ""}
      ${j.description ? `<p>${escapeHtml(j.description)}</p>` : ""}
      <a href="mailto:${encodeURIComponent(j.contact_email)}" class="btn btn-outline" style="margin-top:14px; padding:8px 18px; font-size:0.85rem;">Apply / enquire</a>
    </div>
  `).join("");
}

async function submitJobPosting(event) {
  event.preventDefault();
  const status = document.getElementById("job-status");

  const payload = {
    title: document.getElementById("j-title").value.trim(),
    company: document.getElementById("j-company").value.trim() || null,
    description: document.getElementById("j-description").value.trim() || null,
    contact_email: document.getElementById("j-email").value.trim(),
    posted_by: document.getElementById("j-posted-by").value.trim(),
    approved: false
  };

  const { error } = await supabaseClient.from("jobs").insert(payload);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Thanks! Your listing is pending admin approval.";
    status.className = "form-status success";
    event.target.reset();
  }
}

// ===== Mentorship (mentorship.html) =====
let allMentorshipCache = [];
let currentMentorshipTab = "mentor";

async function loadMentorship() {
  const container = document.getElementById("mentorship-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("mentorship_profiles")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load mentorship profiles right now.</p>`;
    return;
  }

  allMentorshipCache = data;
  renderMentorshipTab();
}

function setMentorshipTab(role) {
  currentMentorshipTab = role;
  document.getElementById("tab-mentors")?.classList.toggle("active", role === "mentor");
  document.getElementById("tab-mentees")?.classList.toggle("active", role === "mentee");
  renderMentorshipTab();
}

function renderMentorshipTab() {
  const container = document.getElementById("mentorship-grid");
  if (!container) return;

  const list = allMentorshipCache.filter(p => p.role === currentMentorshipTab);

  if (!list.length) {
    container.innerHTML = `<p>No ${currentMentorshipTab}s listed yet — be the first to sign up below.</p>`;
    return;
  }

  container.innerHTML = list.map(p => `
    <div class="card">
      <h3>${escapeHtml(p.full_name)}</h3>
      ${p.area ? `<p class="meta">${escapeHtml(p.area)}</p>` : ""}
      ${p.bio ? `<p>${escapeHtml(p.bio)}</p>` : ""}
      <a href="mailto:${encodeURIComponent(p.email)}" class="btn btn-outline" style="margin-top:14px; padding:8px 18px; font-size:0.85rem;">Get in touch</a>
    </div>
  `).join("");
}

async function submitMentorshipProfile(event) {
  event.preventDefault();
  const status = document.getElementById("mentorship-status");

  const payload = {
    full_name: document.getElementById("m-name").value.trim(),
    email: document.getElementById("m-email").value.trim(),
    role: document.getElementById("m-role").value,
    area: document.getElementById("m-area").value.trim() || null,
    bio: document.getElementById("m-bio").value.trim() || null,
    approved: false
  };

  const { error } = await supabaseClient.from("mentorship_profiles").insert(payload);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Thanks! Your sign-up is pending admin approval.";
    status.className = "form-status success";
    event.target.reset();
  }
}

// ===== Class notes (class-notes.html) =====
function populateClassYearSelect() {
  const select = document.getElementById("cn-year-select");
  if (!select) return;
  const currentYear = new Date().getFullYear();
  let options = "";
  for (let y = currentYear; y >= 1950; y--) {
    options += `<option value="${y}">${y}</option>`;
  }
  select.innerHTML = options;
}

async function loadClassNotes() {
  const select = document.getElementById("cn-year-select");
  const board = document.getElementById("class-notes-board");
  if (!select || !board) return;

  const year = select.value;
  board.innerHTML = "<p>Loading...</p>";

  const { data, error } = await supabaseClient
    .from("class_notes")
    .select("*")
    .eq("grad_year", year)
    .order("created_at", { ascending: false });

  if (error) {
    board.innerHTML = `<p>Couldn't load notes right now.</p>`;
    return;
  }
  if (!data.length) {
    board.innerHTML = `<p>No notes yet for the Class of ${year} — be the first to post one.</p>`;
    return;
  }

  board.innerHTML = data.map(n => `
    <div class="card" style="margin-bottom: 14px;">
      <div class="meta">${escapeHtml(n.author_name)} · ${new Date(n.created_at).toLocaleDateString()}</div>
      <p>${escapeHtml(n.message)}</p>
    </div>
  `).join("");
}

async function submitClassNote(event) {
  event.preventDefault();
  const year = document.getElementById("cn-year-select").value;
  const author_name = document.getElementById("cn-name").value.trim();
  const message = document.getElementById("cn-message").value.trim();
  const status = document.getElementById("class-note-status");

  const { error } = await supabaseClient
    .from("class_notes")
    .insert({ grad_year: year, author_name, message });

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Posted!";
    status.className = "form-status success";
    event.target.reset();
    loadClassNotes();
  }
}

// ===== Donations (donate.html) =====
async function loadTotalDonations() {
  const el = document.getElementById("donations-total-display");
  if (!el) return;
  const { data, error } = await supabaseClient.rpc("get_total_donations");
  if (!error) el.textContent = `KES ${Number(data).toLocaleString()}`;
}

async function loadDonationWall() {
  const container = document.getElementById("donation-wall");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("donation_wall")
    .select("*");

  if (error || !data.length) {
    container.innerHTML = `<p>Be the first to support KBHSAA.</p>`;
    return;
  }

  container.innerHTML = `<ul class="skill-tags" style="gap:10px;">` +
    data.map(d => `<li class="skill-tag" style="padding:6px 14px; font-size:0.85rem;">${escapeHtml(d.full_name)}</li>`).join("") +
    `</ul>`;
}

async function submitDonation(event) {
  event.preventDefault();
  const status = document.getElementById("donation-status");
  const amount = parseFloat(document.getElementById("d-amount").value);
  const full_name = document.getElementById("d-name").value.trim();
  const email = document.getElementById("d-email").value.trim();
  const message = document.getElementById("d-message").value.trim() || null;

  if (!amount || amount < 50) {
    status.textContent = "Please enter an amount of at least KES 50.";
    status.className = "form-status error";
    return;
  }

  launchFlutterwave({
    amount,
    currency: "KES",
    email,
    name: full_name,
    title: "Donation to KBHSAA",
    txRef: generateTxRef("DONATE"),
    onSuccess: async (data) => {
      const { error } = await supabaseClient
        .from("donations")
        .insert({ full_name, email, amount, message, payment_reference: data.tx_ref || data.transaction_id || generateTxRef("DONATE") });

      if (error) {
        status.textContent = "Payment went through, but saving your donation record failed — contact us with your payment reference.";
        status.className = "form-status error";
      } else {
        status.textContent = "Thank you for your support!";
        status.className = "form-status success";
        document.getElementById("donation-form").reset();
        loadTotalDonations();
        loadDonationWall();
      }
    }
  });
}

// ===== Memorial tributes (memorial.html) =====
async function loadMemorials() {
  const container = document.getElementById("memorials-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("memorials")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load tributes right now.</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p>No tributes published yet.</p>`;
    return;
  }

  container.innerHTML = data.map(m => `
    <div class="card memorial-card">
      ${m.photo_url ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.full_name)}">` : ""}
      <h3>${escapeHtml(m.full_name)}</h3>
      <div class="meta">${m.grad_year ? `Class of ${m.grad_year}` : ""}${m.date_of_passing ? ` · d. ${new Date(m.date_of_passing).toLocaleDateString()}` : ""}</div>
      ${m.tribute_text ? `<p>${escapeHtml(m.tribute_text)}</p>` : ""}
    </div>
  `).join("");
}

async function submitMemorial(event) {
  event.preventDefault();
  const status = document.getElementById("memorial-status");

  const payload = {
    full_name: document.getElementById("mem-name").value.trim(),
    grad_year: document.getElementById("mem-grad-year").value || null,
    date_of_passing: document.getElementById("mem-passing").value || null,
    tribute_text: document.getElementById("mem-tribute").value.trim() || null,
    photo_url: document.getElementById("mem-photo").value.trim() || null,
    submitted_by_name: document.getElementById("mem-submitted-by-name").value.trim(),
    submitted_by_email: document.getElementById("mem-submitted-by-email").value.trim(),
    approved: false
  };

  const { error } = await supabaseClient.from("memorials").insert(payload);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Thank you — this tribute is pending review before it's published.";
    status.className = "form-status success";
    event.target.reset();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  loadDirectory();
  loadEvents();
  loadAnnouncements();
  loadStats();
  loadGallery();
  loadSpotlight();
  loadJobs();
  loadMentorship();
  if (document.getElementById("cn-year-select")) {
    populateClassYearSelect();
    loadClassNotes();
  }
  loadTotalDonations();
  loadDonationWall();
  loadMemorials();
});
