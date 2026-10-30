const currentDuesYear = new Date().getFullYear();

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("dashboard-section").style.display = "none";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById("login-status");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value
  });

  if (error) {
    status.textContent = "Login failed: " + error.message;
    status.className = "form-status error";
  } else {
    showDashboard();
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  checkSession();
}

function showDashboard() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("dashboard-section").style.display = "block";
  loadMembers();
  loadAnnouncementsAdmin();
  loadEventsAdmin();
  loadPhotosAdmin();
  loadNewsletterCount();
  loadJobsAdmin();
  loadMentorshipAdmin();
  loadClassNotesAdmin();
  loadDonationsAdmin();
  loadMemorialsAdmin();
}

async function loadMembers() {
  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  const pendingBody = document.getElementById("pending-table-body");
  const approvedBody = document.getElementById("approved-table-body");

  if (error) {
    pendingBody.innerHTML = `<tr><td colspan="5">Couldn't load members.</td></tr>`;
    return;
  }

  const pending = data.filter(m => !m.approved);
  const approved = data.filter(m => m.approved);

  pendingBody.innerHTML = pending.length ? pending.map(m => `
    <tr>
      <td>${m.full_name}</td>
      <td>${m.grad_year}</td>
      <td>${m.email}</td>
      <td><span class="pill pill-pending">Pending</span></td>
      <td><button class="btn btn-outline" onclick="approveMember('${m.id}')">Approve</button></td>
    </tr>
  `).join("") : `<tr><td colspan="5">No pending registrations.</td></tr>`;

  approvedBody.innerHTML = approved.length ? approved.map(m => `
    <tr>
      <td>${m.full_name}</td>
      <td>${m.grad_year}</td>
      <td>${m.email}</td>
      <td><span class="pill pill-approved">Approved</span></td>
      <td>
        ${m.is_spotlight
          ? `<span class="pill pill-approved">Featured</span> <button class="link-btn danger" onclick="unfeatureMember('${m.id}')">Remove</button>`
          : `<button class="link-btn edit" onclick="openSpotlightModal('${m.id}')">Feature</button>`}
      </td>
      <td>
        ${m.dues_paid && m.dues_year === currentDuesYear
          ? `<span class="pill pill-approved">Paid</span> <button class="link-btn danger" onclick="setDues('${m.id}', false)">Unmark</button>`
          : `<button class="link-btn edit" onclick="setDues('${m.id}', true)">Mark paid</button>`}
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6">No approved members yet.</td></tr>`;

  const duesStats = document.getElementById("dues-stats");
  if (duesStats) {
    const paidCount = approved.filter(m => m.dues_paid && m.dues_year === currentDuesYear).length;
    duesStats.textContent = approved.length
      ? `${paidCount} of ${approved.length} approved members have paid dues for ${currentDuesYear}.`
      : "";
  }
}

async function setDues(id, paid) {
  const { error } = await supabaseClient
    .from("members")
    .update({ dues_paid: paid, dues_year: paid ? currentDuesYear : null })
    .eq("id", id);
  if (!error) loadMembers();
}

function openSpotlightModal(memberId) {
  document.getElementById("spotlight-member-id").value = memberId;
  document.getElementById("spotlight-blurb").value = "";
  document.getElementById("spotlight-status").textContent = "";
  document.getElementById("spotlight-modal").style.display = "flex";
}

async function saveSpotlight(event) {
  event.preventDefault();
  const id = document.getElementById("spotlight-member-id").value;
  const blurb = document.getElementById("spotlight-blurb").value.trim();
  const status = document.getElementById("spotlight-status");

  // Only one member is spotlighted at a time: clear any existing spotlight first.
  await supabaseClient.from("members").update({ is_spotlight: false }).eq("is_spotlight", true);

  const { error } = await supabaseClient
    .from("members")
    .update({ is_spotlight: true, spotlight_blurb: blurb || null, spotlight_set_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("spotlight-modal");
    loadMembers();
  }
}

async function unfeatureMember(id) {
  const { error } = await supabaseClient
    .from("members")
    .update({ is_spotlight: false })
    .eq("id", id);
  if (!error) loadMembers();
}

async function approveMember(id) {
  const { error } = await supabaseClient
    .from("members")
    .update({ approved: true })
    .eq("id", id);

  if (!error) loadMembers();
}

async function postAnnouncement(event) {
  event.preventDefault();
  const title = document.getElementById("a-title").value.trim();
  const body = document.getElementById("a-body").value.trim();
  const status = document.getElementById("announcement-status");

  const { error } = await supabaseClient
    .from("announcements")
    .insert({ title, body, published: true });

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Announcement posted.";
    status.className = "form-status success";
    event.target.reset();
    loadAnnouncementsAdmin();
  }
}

async function loadAnnouncementsAdmin() {
  const body = document.getElementById("announcements-table-body");
  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    body.innerHTML = `<tr><td colspan="3">Couldn't load announcements.</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="3">No announcements yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(a => `
    <tr>
      <td>${escapeAdminHtml(a.title)}</td>
      <td>${new Date(a.created_at).toLocaleDateString()}</td>
      <td class="table-actions">
        <button class="link-btn edit" onclick='openAnnouncementEdit(${JSON.stringify(a).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deleteAnnouncement('${a.id}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openAnnouncementEdit(a) {
  document.getElementById("edit-a-id").value = a.id;
  document.getElementById("edit-a-title").value = a.title;
  document.getElementById("edit-a-body").value = a.body;
  document.getElementById("edit-announcement-status").textContent = "";
  document.getElementById("edit-announcement-modal").style.display = "flex";
}

async function saveAnnouncementEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-a-id").value;
  const title = document.getElementById("edit-a-title").value.trim();
  const bodyText = document.getElementById("edit-a-body").value.trim();
  const status = document.getElementById("edit-announcement-status");

  const { error } = await supabaseClient
    .from("announcements")
    .update({ title, body: bodyText })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-announcement-modal");
    loadAnnouncementsAdmin();
  }
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete this announcement? This can't be undone.")) return;
  const { error } = await supabaseClient.from("announcements").delete().eq("id", id);
  if (!error) loadAnnouncementsAdmin();
}

async function postEvent(event) {
  event.preventDefault();
  const title = document.getElementById("e-title").value.trim();
  const event_date = document.getElementById("e-date").value;
  const location = document.getElementById("e-location").value.trim();
  const description = document.getElementById("e-description").value.trim();
  const ticket_price = document.getElementById("e-ticket-price").value || null;
  const currency = document.getElementById("e-currency").value.trim() || "KES";
  const status = document.getElementById("event-status");

  const { error } = await supabaseClient
    .from("events")
    .insert({ title, event_date, location, description, ticket_price, currency });

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Event added.";
    status.className = "form-status success";
    event.target.reset();
    loadEventsAdmin();
  }
}

async function loadEventsAdmin() {
  const body = document.getElementById("events-table-body");
  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    body.innerHTML = `<tr><td colspan="5">Couldn't load events.</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="5">No events yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(e => {
    const isPaid = e.ticket_price && e.ticket_price > 0;
    return `
    <tr>
      <td>${escapeAdminHtml(e.title)}</td>
      <td>${new Date(e.event_date).toLocaleDateString()}</td>
      <td>${escapeAdminHtml(e.location || "")}</td>
      <td>${isPaid ? `${escapeAdminHtml(e.currency || "KES")} ${Number(e.ticket_price).toLocaleString()}` : "Free"}</td>
      <td><button class="link-btn edit" onclick="viewAttendees('${e.id}', '${escapeAdminHtml(e.title).replace(/'/g, "&#39;")}', ${isPaid})">View</button></td>
      <td class="table-actions">
        <button class="link-btn edit" onclick='openEventEdit(${JSON.stringify(e).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deleteEvent('${e.id}')">Delete</button>
      </td>
    </tr>
  `;
  }).join("");
}

async function viewAttendees(eventId, eventTitle, isPaid) {
  document.getElementById("rsvp-list-event-title").textContent = eventTitle;
  document.getElementById("rsvp-list-heading").textContent = isPaid ? "Ticket buyers" : "RSVPs";
  document.getElementById("rsvp-list-thead").innerHTML = isPaid
    ? `<tr><th>Name</th><th>Email</th><th>Amount</th></tr>`
    : `<tr><th>Name</th><th>Email</th></tr>`;
  const body = document.getElementById("rsvp-list-body");
  body.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
  document.getElementById("rsvp-list-modal").style.display = "flex";

  const { data, error } = await supabaseClient
    .from(isPaid ? "event_tickets" : "event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    body.innerHTML = `<tr><td colspan="3">Couldn't load attendees.</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="3">No ${isPaid ? "ticket purchases" : "RSVPs"} yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(r => isPaid
    ? `<tr><td>${escapeAdminHtml(r.full_name)}</td><td>${escapeAdminHtml(r.email)}</td><td>${escapeAdminHtml(r.currency)} ${Number(r.amount).toLocaleString()}</td></tr>`
    : `<tr><td>${escapeAdminHtml(r.full_name)}</td><td>${escapeAdminHtml(r.email)}</td></tr>`
  ).join("");
}

function openEventEdit(e) {
  document.getElementById("edit-e-id").value = e.id;
  document.getElementById("edit-e-title").value = e.title;
  // event_date comes back as an ISO string; datetime-local inputs need "YYYY-MM-DDTHH:mm"
  document.getElementById("edit-e-date").value = new Date(e.event_date).toISOString().slice(0, 16);
  document.getElementById("edit-e-location").value = e.location || "";
  document.getElementById("edit-e-description").value = e.description || "";
  document.getElementById("edit-e-ticket-price").value = e.ticket_price || "";
  document.getElementById("edit-e-currency").value = e.currency || "KES";
  document.getElementById("edit-event-status").textContent = "";
  document.getElementById("edit-event-modal").style.display = "flex";
}

async function saveEventEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-e-id").value;
  const title = document.getElementById("edit-e-title").value.trim();
  const event_date = document.getElementById("edit-e-date").value;
  const location = document.getElementById("edit-e-location").value.trim();
  const description = document.getElementById("edit-e-description").value.trim();
  const ticket_price = document.getElementById("edit-e-ticket-price").value || null;
  const currency = document.getElementById("edit-e-currency").value.trim() || "KES";
  const status = document.getElementById("edit-event-status");

  const { error } = await supabaseClient
    .from("events")
    .update({ title, event_date, location, description, ticket_price, currency })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-event-modal");
    loadEventsAdmin();
  }
}

async function deleteEvent(id) {
  if (!confirm("Delete this event? This can't be undone.")) return;
  const { error } = await supabaseClient.from("events").delete().eq("id", id);
  if (!error) loadEventsAdmin();
}

// ===== Photo gallery management =====
async function postPhoto(event) {
  event.preventDefault();
  const title = document.getElementById("p-title").value.trim();
  const image_url = document.getElementById("p-url").value.trim();
  const status = document.getElementById("photo-status");

  const { error } = await supabaseClient
    .from("photos")
    .insert({ title: title || null, image_url });

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    status.textContent = "Photo added.";
    status.className = "form-status success";
    event.target.reset();
    loadPhotosAdmin();
  }
}

async function loadPhotosAdmin() {
  const container = document.getElementById("photos-admin-grid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Couldn't load photos.</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p>No photos yet.</p>`;
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="card" style="padding: 12px;">
      <img src="${escapeAdminHtml(p.image_url)}" alt="" style="width:100%; aspect-ratio:4/3; object-fit:cover; display:block; margin-bottom:10px;">
      <div class="meta">${p.title ? escapeAdminHtml(p.title) : "(no caption)"}</div>
      <div class="table-actions" style="margin-top:8px;">
        <button class="link-btn edit" onclick='openPhotoEdit(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deletePhoto('${p.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function openPhotoEdit(p) {
  document.getElementById("edit-p-id").value = p.id;
  document.getElementById("edit-p-title").value = p.title || "";
  document.getElementById("edit-p-url").value = p.image_url;
  document.getElementById("edit-photo-status").textContent = "";
  document.getElementById("edit-photo-modal").style.display = "flex";
}

async function savePhotoEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-p-id").value;
  const title = document.getElementById("edit-p-title").value.trim();
  const image_url = document.getElementById("edit-p-url").value.trim();
  const status = document.getElementById("edit-photo-status");

  const { error } = await supabaseClient
    .from("photos")
    .update({ title: title || null, image_url })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-photo-modal");
    loadPhotosAdmin();
  }
}

async function deletePhoto(id) {
  if (!confirm("Delete this photo? This can't be undone.")) return;
  const { error } = await supabaseClient.from("photos").delete().eq("id", id);
  if (!error) loadPhotosAdmin();
}

// ===== Newsletter subscribers =====
let subscriberEmailsCache = [];

async function loadNewsletterCount() {
  const el = document.getElementById("newsletter-count");
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("newsletter_subscribers")
    .select("email");

  if (error) {
    el.textContent = "Couldn't load subscribers.";
    return;
  }

  subscriberEmailsCache = data.map(s => s.email);
  el.textContent = `${subscriberEmailsCache.length} subscriber${subscriberEmailsCache.length === 1 ? "" : "s"}`;
}

function copySubscriberEmails() {
  if (!subscriberEmailsCache.length) {
    alert("No subscribers to copy yet.");
    return;
  }
  navigator.clipboard.writeText(subscriberEmailsCache.join(", "))
    .then(() => alert("Emails copied to clipboard."))
    .catch(() => alert("Couldn't copy automatically — select and copy manually: \n\n" + subscriberEmailsCache.join(", ")));
}

// ===== Job & internship postings =====
async function loadJobsAdmin() {
  const pendingBody = document.getElementById("jobs-pending-body");
  const approvedBody = document.getElementById("jobs-approved-body");
  if (!pendingBody) return;

  const { data, error } = await supabaseClient
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    pendingBody.innerHTML = `<tr><td colspan="4">Couldn't load listings.</td></tr>`;
    return;
  }

  const pending = data.filter(j => !j.approved);
  const approved = data.filter(j => j.approved);

  pendingBody.innerHTML = pending.length ? pending.map(j => `
    <tr>
      <td>${escapeAdminHtml(j.title)}</td>
      <td>${escapeAdminHtml(j.posted_by || "")}</td>
      <td>${escapeAdminHtml(j.contact_email)}</td>
      <td><button class="btn btn-outline" onclick="approveJob('${j.id}')">Approve</button></td>
    </tr>
  `).join("") : `<tr><td colspan="4">No pending listings.</td></tr>`;

  approvedBody.innerHTML = approved.length ? approved.map(j => `
    <tr>
      <td>${escapeAdminHtml(j.title)}</td>
      <td>${escapeAdminHtml(j.posted_by || "")}</td>
      <td>${escapeAdminHtml(j.contact_email)}</td>
      <td class="table-actions">
        <button class="link-btn edit" onclick='openJobEdit(${JSON.stringify(j).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deleteJob('${j.id}')">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">No approved listings yet.</td></tr>`;
}

async function approveJob(id) {
  const { error } = await supabaseClient.from("jobs").update({ approved: true }).eq("id", id);
  if (!error) loadJobsAdmin();
}

function openJobEdit(j) {
  document.getElementById("edit-j-id").value = j.id;
  document.getElementById("edit-j-title").value = j.title;
  document.getElementById("edit-j-company").value = j.company || "";
  document.getElementById("edit-j-description").value = j.description || "";
  document.getElementById("edit-j-email").value = j.contact_email;
  document.getElementById("edit-job-status").textContent = "";
  document.getElementById("edit-job-modal").style.display = "flex";
}

async function saveJobEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-j-id").value;
  const title = document.getElementById("edit-j-title").value.trim();
  const company = document.getElementById("edit-j-company").value.trim() || null;
  const description = document.getElementById("edit-j-description").value.trim() || null;
  const contact_email = document.getElementById("edit-j-email").value.trim();
  const status = document.getElementById("edit-job-status");

  const { error } = await supabaseClient
    .from("jobs")
    .update({ title, company, description, contact_email })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-job-modal");
    loadJobsAdmin();
  }
}

async function deleteJob(id) {
  if (!confirm("Delete this listing? This can't be undone.")) return;
  const { error } = await supabaseClient.from("jobs").delete().eq("id", id);
  if (!error) loadJobsAdmin();
}

// ===== Mentorship sign-ups =====
async function loadMentorshipAdmin() {
  const pendingBody = document.getElementById("mentorship-pending-body");
  const approvedBody = document.getElementById("mentorship-approved-body");
  if (!pendingBody) return;

  const { data, error } = await supabaseClient
    .from("mentorship_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    pendingBody.innerHTML = `<tr><td colspan="4">Couldn't load profiles.</td></tr>`;
    return;
  }

  const pending = data.filter(m => !m.approved);
  const approved = data.filter(m => m.approved);

  pendingBody.innerHTML = pending.length ? pending.map(m => `
    <tr>
      <td>${escapeAdminHtml(m.full_name)}</td>
      <td>${escapeAdminHtml(m.role)}</td>
      <td>${escapeAdminHtml(m.area || "")}</td>
      <td><button class="btn btn-outline" onclick="approveMentorship('${m.id}')">Approve</button></td>
    </tr>
  `).join("") : `<tr><td colspan="4">No pending sign-ups.</td></tr>`;

  approvedBody.innerHTML = approved.length ? approved.map(m => `
    <tr>
      <td>${escapeAdminHtml(m.full_name)}</td>
      <td>${escapeAdminHtml(m.role)}</td>
      <td>${escapeAdminHtml(m.area || "")}</td>
      <td class="table-actions">
        <button class="link-btn edit" onclick='openMentorshipEdit(${JSON.stringify(m).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deleteMentorship('${m.id}')">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">No approved profiles yet.</td></tr>`;
}

async function approveMentorship(id) {
  const { error } = await supabaseClient.from("mentorship_profiles").update({ approved: true }).eq("id", id);
  if (!error) loadMentorshipAdmin();
}

function openMentorshipEdit(m) {
  document.getElementById("edit-m-id").value = m.id;
  document.getElementById("edit-m-area").value = m.area || "";
  document.getElementById("edit-m-bio").value = m.bio || "";
  document.getElementById("edit-mentorship-status").textContent = "";
  document.getElementById("edit-mentorship-modal").style.display = "flex";
}

async function saveMentorshipEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-m-id").value;
  const area = document.getElementById("edit-m-area").value.trim() || null;
  const bio = document.getElementById("edit-m-bio").value.trim() || null;
  const status = document.getElementById("edit-mentorship-status");

  const { error } = await supabaseClient
    .from("mentorship_profiles")
    .update({ area, bio })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-mentorship-modal");
    loadMentorshipAdmin();
  }
}

async function deleteMentorship(id) {
  if (!confirm("Delete this profile? This can't be undone.")) return;
  const { error } = await supabaseClient.from("mentorship_profiles").delete().eq("id", id);
  if (!error) loadMentorshipAdmin();
}

// ===== Class notes moderation =====
async function loadClassNotesAdmin() {
  const body = document.getElementById("class-notes-admin-body");
  if (!body) return;

  const { data, error } = await supabaseClient
    .from("class_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    body.innerHTML = `<tr><td colspan="4">Couldn't load notes.</td></tr>`;
    return;
  }
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="4">No notes posted yet.</td></tr>`;
    return;
  }

  body.innerHTML = data.map(n => `
    <tr>
      <td>${n.grad_year}</td>
      <td>${escapeAdminHtml(n.author_name)}</td>
      <td>${escapeAdminHtml(n.message)}</td>
      <td><button class="link-btn danger" onclick="deleteClassNote('${n.id}')">Delete</button></td>
    </tr>
  `).join("");
}

async function deleteClassNote(id) {
  if (!confirm("Delete this note? This can't be undone.")) return;
  const { error } = await supabaseClient.from("class_notes").delete().eq("id", id);
  if (!error) loadClassNotesAdmin();
}

// ===== Donations =====
async function loadDonationsAdmin() {
  const totalEl = document.getElementById("donations-total");
  const body = document.getElementById("donations-table-body");
  if (!body) return;

  const { data, error } = await supabaseClient
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    body.innerHTML = `<tr><td colspan="4">Couldn't load donations.</td></tr>`;
    totalEl.textContent = "";
    return;
  }

  const total = data.reduce((sum, d) => sum + Number(d.amount), 0);
  totalEl.textContent = `KES ${total.toLocaleString()} raised from ${data.length} donation${data.length === 1 ? "" : "s"}.`;

  body.innerHTML = data.length ? data.map(d => `
    <tr>
      <td>${escapeAdminHtml(d.full_name)}</td>
      <td>${escapeAdminHtml(d.currency)} ${Number(d.amount).toLocaleString()}</td>
      <td>${d.message ? escapeAdminHtml(d.message) : ""}</td>
      <td>${new Date(d.created_at).toLocaleDateString()}</td>
    </tr>
  `).join("") : `<tr><td colspan="4">No donations yet.</td></tr>`;
}

// ===== Memorial tributes =====
async function loadMemorialsAdmin() {
  const pendingBody = document.getElementById("memorials-pending-body");
  const approvedBody = document.getElementById("memorials-approved-body");
  if (!pendingBody) return;

  const { data, error } = await supabaseClient
    .from("memorials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    pendingBody.innerHTML = `<tr><td colspan="3">Couldn't load tributes.</td></tr>`;
    return;
  }

  const pending = data.filter(m => !m.approved);
  const approved = data.filter(m => m.approved);

  pendingBody.innerHTML = pending.length ? pending.map(m => `
    <tr>
      <td>${escapeAdminHtml(m.full_name)}</td>
      <td>${escapeAdminHtml(m.submitted_by_name || "")}</td>
      <td><button class="btn btn-outline" onclick="approveMemorial('${m.id}')">Approve</button></td>
    </tr>
  `).join("") : `<tr><td colspan="3">No pending tributes.</td></tr>`;

  approvedBody.innerHTML = approved.length ? approved.map(m => `
    <tr>
      <td>${escapeAdminHtml(m.full_name)}</td>
      <td>${m.grad_year || ""}</td>
      <td class="table-actions">
        <button class="link-btn edit" onclick='openMemorialEdit(${JSON.stringify(m).replace(/'/g, "&#39;")})'>Edit</button>
        <button class="link-btn danger" onclick="deleteMemorial('${m.id}')">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="3">No published tributes yet.</td></tr>`;
}

async function approveMemorial(id) {
  const { error } = await supabaseClient.from("memorials").update({ approved: true }).eq("id", id);
  if (!error) loadMemorialsAdmin();
}

function openMemorialEdit(m) {
  document.getElementById("edit-mem-id").value = m.id;
  document.getElementById("edit-mem-name").value = m.full_name;
  document.getElementById("edit-mem-grad-year").value = m.grad_year || "";
  document.getElementById("edit-mem-passing").value = m.date_of_passing || "";
  document.getElementById("edit-mem-tribute").value = m.tribute_text || "";
  document.getElementById("edit-mem-photo").value = m.photo_url || "";
  document.getElementById("edit-memorial-status").textContent = "";
  document.getElementById("edit-memorial-modal").style.display = "flex";
}

async function saveMemorialEdit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-mem-id").value;
  const full_name = document.getElementById("edit-mem-name").value.trim();
  const grad_year = document.getElementById("edit-mem-grad-year").value || null;
  const date_of_passing = document.getElementById("edit-mem-passing").value || null;
  const tribute_text = document.getElementById("edit-mem-tribute").value.trim() || null;
  const photo_url = document.getElementById("edit-mem-photo").value.trim() || null;
  const status = document.getElementById("edit-memorial-status");

  const { error } = await supabaseClient
    .from("memorials")
    .update({ full_name, grad_year, date_of_passing, tribute_text, photo_url })
    .eq("id", id);

  if (error) {
    status.textContent = "Error: " + error.message;
    status.className = "form-status error";
  } else {
    closeModal("edit-memorial-modal");
    loadMemorialsAdmin();
  }
}

async function deleteMemorial(id) {
  if (!confirm("Delete this tribute? This can't be undone.")) return;
  const { error } = await supabaseClient.from("memorials").delete().eq("id", id);
  if (!error) loadMemorialsAdmin();
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

function escapeAdminHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", checkSession);
