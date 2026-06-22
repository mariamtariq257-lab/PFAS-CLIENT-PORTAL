// pages/index.js  —  PFAS Client Portal
// Auth0 login → fetch live ClickUp data → render project dashboard

import Head from "next/head";
import { useEffect, useState, useRef } from "react";
const AUTH0_DOMAIN    = process.env.NEXT_PUBLIC_AUTH0_DOMAIN    || "dev-zrdwden5qdovxa40.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "Rhh7Of9haJruOvHsEYswD5YtmohXV81N";

// IS_DEV is determined client-side only to avoid SSR/hydration mismatch

const EMAIL_PROJECT_MAP = {
  "demo@pfas.pk":       { name: "Demo Client",            slug: "pcmmdc"         },
  "pcmmdc@pfas.pk":     { name: "PCMMDC",                 slug: "pcmmdc"         },
  "p4a@pfas.pk":        { name: "P4A",                    slug: "p4a"            },
  "fiedmc@pfas.pk":     { name: "FIEDMC",                 slug: "fiedmc-m3ic"    },
  "fiedmc-sbp@pfas.pk": { name: "FIEDMC (SBP)",           slug: "fiedmc-sbp"     },
  "energy@pfas.pk":     { name: "Energy Dept",            slug: "energy"         },
  "fisheries@pfas.pk":  { name: "Fisheries Dept",         slug: "shrimps"        },
  "cw-bot1@pfas.pk":    { name: "C&W (BOT-1)",            slug: "bot1"           },
  "cw-bot2@pfas.pk":    { name: "C&W (BOT-2)",            slug: "bot2"           },
  "cw-bot3@pfas.pk":    { name: "C&W (BOT-3)",            slug: "bot3"           },
  "cw-bot4@pfas.pk":    { name: "C&W (BOT-4)",            slug: "bot4"           },
  "cw-bot5@pfas.pk":    { name: "C&W (BOT-5)",            slug: "bot5"           },
  "cw-om@pfas.pk":      { name: "C&W (18 O&M)",           slug: "om-roads"       },
  "wildlife-b@pfas.pk": { name: "Wildlife (Bansra Gali)", slug: "wildlife-bansra"},
  "wildlife-c@pfas.pk": { name: "Wildlife (Changa)",      slug: "wildlife-changa"},
  "tam@pfas.pk":        { name: "TAM",                    slug: "tam"            },
  "pha@pfas.pk":        { name: "PHA",                    slug: "pha"            },
  "pbf@pfas.pk":        { name: "Punjab Benevolent",      slug: "pbf"            },
  "finance@pfas.pk":    { name: "Finance Dept",           slug: "punjab-onebill" },
  "vss@pfas.pk":        { name: "Finance (VSS)",          slug: "vss"            },
  "hed@pfas.pk":        { name: "HED",                    slug: "hed"            },
  "phimc@pfas.pk":      { name: "PHIMC",                  slug: "phimc"          },
};

// All slugs for dev picker
const ALL_PROJECTS = Object.values(EMAIL_PROJECT_MAP).filter(
  (v, i, a) => a.findIndex(x => x.slug === v.slug) === i
);


// ── Dev mode project picker ───────────────────────────────────────────────────
function DevPicker({ onSelect }) {
  const [selected, setSelected] = useState(ALL_PROJECTS[0].slug);
  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">PFAS</div>
        <div className="login-title">PFAS Client Portal</div>
        <div className="login-sub">Local development mode</div>
        <div className="dev-banner">
          🛠 Dev mode — Auth0 bypassed on localhost.<br />
          Select a client to preview their portal.
        </div>
        <select
          className="dev-select"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {ALL_PROJECTS.map(p => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <button
          className="login-btn"
          onClick={() => onSelect(selected, ALL_PROJECTS.find(p => p.slug === selected)?.name)}
        >
          Open Portal →
        </button>
        <div className="login-footer">© 2026 Punjab Financial Advisory Services · DEV</div>
      </div>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">PFAS</div>
        <div className="login-title">PFAS Client Portal</div>
        <div className="login-sub">Sign in to access your engagement workspace</div>
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <button className="login-btn" onClick={onLogin} style={{ marginTop: 0 }}>
            Sign In Securely
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-hint">
          <strong>Secure login powered by Auth0.</strong> You will be redirected to a secure
          sign-in page. Contact your PFAS engagement lead if you need access.
        </div>
        <div className="login-footer">© 2026 Punjab Financial Advisory Services</div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: "40px 28px", maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ background: "#E2E8F0", borderRadius: 16, height: 120, marginBottom: 24, animation: "shimmer 1.5s infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ background: "#E2E8F0", borderRadius: 14, height: 80, animation: "shimmer 1.5s infinite" }} />)}
      </div>
      <div style={{ background: "#E2E8F0", borderRadius: 16, height: 200, animation: "shimmer 1.5s infinite" }} />
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function TopBar({ userName, onLogout, lastUpdated, isDev, onSwitchDev }) {
  const initial = userName ? userName[0].toUpperCase() : "?";
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-logo">PFAS</div>
        <div>
          <div className="brand-sub">Punjab Financial Advisory Services</div>
          <div className="brand-name">Client Portal</div>
        </div>
      </div>
      <div className="topbar-right">
        <span className="live-badge">
          <span className="live-dot" />
          {lastUpdated ? `Updated ${lastUpdated}` : "LIVE · ClickUp"}
        </span>
        <span className="user-chip">
          <span className="av">{initial}</span>
          <span>{userName}</span>
        </span>
        {isDev
          ? <button className="logout-btn" onClick={onSwitchDev}>← Switch Client</button>
          : <button className="logout-btn" onClick={onLogout}>Sign Out</button>
        }
      </div>
    </div>
  );
}

// ── Project header (health chip removed) ──────────────────────────────────────
function ProjectHeader({ project }) {
  return (
    <div className="project-header">
      <div className="ph-top">
        <div className="ph-title-block">
          <div className="ph-eyebrow">{project.type}</div>
          <div className="ph-title">{project.displayName || project.name}</div>
        </div>
      </div>
      <div className="ph-meta">
        <span><strong>Client:</strong> {project.clientName}</span>
        <span><strong>Current Phase:</strong> {project.currentPhase}</span>
        <span><strong>Team Size:</strong> {project.team?.length || 0}</span>
      </div>
    </div>
  );
}

// ── KPI row ───────────────────────────────────────────────────────────────────
function KpiRow({ project }) {
  return (
    <div className="kpi-row">
      <div className="kpi k-progress">
        <div className="kpi-label">Project Progress</div>
        <div className="kpi-value">{project.overallPercent}%</div>
        <div className="kpi-sub">Overall completion</div>
      </div>
      <div className="kpi k-tasks">
        <div className="kpi-label">Active Tasks</div>
        <div className="kpi-value">{project.activeTasks}</div>
        <div className="kpi-sub">{project.overdueTasks} need attention</div>
      </div>
      <div className="kpi k-phase">
        <div className="kpi-label">Current Phase</div>
        <div className="kpi-value">{project.currentPhase}</div>
        <div className="kpi-sub">In progress</div>
      </div>
      <div className="kpi k-fee">
        <div className="kpi-label">Engagement Value</div>
        <div className="kpi-value">{project.pfasFee || "PKR TBD"}</div>
        <div className="kpi-sub">Total advisory fee</div>
      </div>
    </div>
  );
}

// ── Phase progress (sorted: completed → active → planned) ─────────────────────
function PhaseList({ phases }) {
  if (!phases?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>No phase data available.</p>;

  // Sort: completed (100%) → in-progress (>0%) → not started (0%)
  const sorted = [...phases].sort((a, b) => {
    const rank = (p) => {
      if (p.pct === 100) return 0;
      if (p.pct > 0)     return 1;
      return 2;
    };
    return rank(a) - rank(b) || b.pct - a.pct;
  });

  return (
    <>
      {sorted.map((ph, i) => (
        <div className="phase-row" key={i}>
          <div className="phase-head">
            <div className="phase-name">{(ph.name || "").replace(/^\s*phase\s*[-:.]?\s*/i, "")}</div>
            <div className={`phase-pct pct-${ph.status}`}>{ph.pct}%</div>
          </div>
          <div className={`phase-bar b-${ph.status}`}>
            <span style={{ width: `${ph.pct}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ── PFAS Staff Directory — sourced from data/pfas-staff.json ─────────────────
// Keyed by lowercase email for fast lookup
const STAFF_DIRECTORY = {
  "azmat.nawaz@pfas.pk":        { designation: "Chief Operating Officer",                                          contact: "0300-4975975" },
  "habeeba.naseer@pfas.pk":     { designation: "Chief Legal Officer",                                              contact: "0300-4416264" },
  "minam.karim@pfas.pk":        { designation: "Senior Manager – Legal / Senior Legal Counsel",                    contact: "0301-8496433" },
  "awais.khan@pfas.pk":         { designation: "Manager – Legal / Associate Legal Counsel",                        contact: "0322-8473455" },
  "wali.muhammad@pfas.pk":      { designation: "Assistant Manager / Senior Analyst Legal",                         contact: "0301-1152222" },
  "mariam.omer@pfas.pk":        { designation: "Law Officer",                                                      contact: "0301-8419960" },
  "aneel.iqbal@pfas.pk":        { designation: "General Manager – Corporate Finance and Risk Management",          contact: "0300-5556417" },
  "husnain.siddique@pfas.pk":   { designation: "Senior Manager / Senior Associate Financial Advisory",             contact: "0342-8119118" },
  "harris.ghaffar@pfas.pk":     { designation: "Manager / Associate Financial Advisory",                          contact: "0333-4558295" },
  "muhammad.aejwat@pfas.pk":    { designation: "Assistant Manager / Senior Analyst Financial Advisory",            contact: "0316-0141617" },
  "ammar.yasar@pfas.pk":        { designation: "Senior Manager / Senior Associate Project Management & TPV",       contact: "0345-4547945" },
  "ammar.yasir@pfas.com.pk":    { designation: "Senior Manager / Senior Associate Project Management & TPV",       contact: "0345-4547945" },
  "hamza.naeem@pfas.pk":        { designation: "Manager / Associate Project Management & TPV",                     contact: "0346-6991919" },
  "maryam.tariq@pfas.pk":       { designation: "Assistant Manager / Senior Analyst Project Management & TPV",      contact: "0334-7073889" },
  "meiraj.khan@pfas.pk":        { designation: "Analyst Project Management & TPV",                                 contact: "0322-0227875" },
  "amjad.murtaza@pfas.pk":      { designation: "Senior Manager / Senior Associate Transaction Advisory",           contact: "0334-3610333" },
  "syed.rehan@pfas.pk":         { designation: "Manager / Associate Financial Management",                         contact: "0333-4445651" },
  "umar.paracha@pfas.com.pk":   { designation: "Assistant Manager / Senior Analyst Transaction Advisory",          contact: "0331-0040695" },
  "umar.paracha@pfas.pk":       { designation: "Assistant Manager / Senior Analyst Transaction Advisory",          contact: "0331-0040695" },
  "khalid.safdar@pfas.pk":      { designation: "General Manager / Practice Lead Strategy & Reforms",               contact: "0300-8213214" },
  "hashim.riaz@pfas.com.pk":    { designation: "Senior Manager / Senior Associate Strategy & Reforms",             contact: "0321-3337118" },
  "hashim.riaz@pfas.pk":        { designation: "Senior Manager / Senior Associate Strategy & Reforms",             contact: "0321-3337118" },
  "fahad.tanveer@pfas.pk":      { designation: "Assistant Manager / Senior Analyst Business Process Reengineering",contact: "0323-4824120" },
  "samiya.mukhtar@pfas.pk":     { designation: "General Manager / Practice Lead PFM & Revenue Management",         contact: "0322-4147173" },
  "hassaan.mallick@pfas.pk":    { designation: "Manager / Associate PFM",                                          contact: "0308-2597799" },
  "bilal.butt@pfas.pk":         { designation: "Assistant Manager / Senior Analyst PFM",                           contact: "0334-5308076" },
  "ahmad.qazi@pfas.pk":         { designation: "General Manager / Practice Lead Energy",                           contact: "0303-4441690" },
  "awais.khan@pfas.com.pk":     { designation: "Analyst",                                                          contact: "0322-8473455" },
};

// ── Team grid ─────────────────────────────────────────────────────────────────
function TeamGrid({ team }) {
  if (!team?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>Team details coming soon.</p>;
  return (
    <div
      className="team-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 14,
      }}
    >
      {team.map((m, i) => {
        const initials = m.name.split(" ").map(n => n[0]).join("").substring(0, 2);
        // Enrich from staff directory using email as key
        const staffKey = (m.email || "").toLowerCase().trim();
        const staff    = STAFF_DIRECTORY[staffKey] || {};
        const designation = staff.designation || m.role || "—";
        const contact     = staff.contact     || null;
        const emailDisplay = m.email && m.email !== "—" ? m.email : null;
        // Per-member Teams scheduling deep link — pre-fills this member as attendee
        const scheduleHref = emailDisplay
          ? `https://teams.microsoft.com/l/meeting/new?attendees=${encodeURIComponent(emailDisplay)}&subject=${encodeURIComponent("PFAS Meeting — " + m.name)}`
          : "https://teams.microsoft.com/l/meeting/new";
        return (
          <div
            className="member-card"
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 16,
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              minWidth: 0,
            }}
          >
            {/* Header: avatar + name/role side by side */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div
                className={`avatar av-${m.color}`}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  className="member-name"
                  style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", lineHeight: 1.25 }}
                >
                  {m.name}
                </div>
                <div
                  className="member-role"
                  style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.35, marginTop: 2 }}
                >
                  {designation}
                </div>
              </div>
            </div>

            {/* Contact block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {emailDisplay && (
                <div className="member-email" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, minWidth: 0 }}>
                  <span style={{ flexShrink: 0 }}>✉</span>
                  <a
                    href={`mailto:${emailDisplay}`}
                    style={{ color: "#1F3A5F", textDecoration: "none", overflowWrap: "anywhere", wordBreak: "break-word" }}
                  >
                    {emailDisplay}
                  </a>
                </div>
              )}
              {contact && (
                <div className="member-contact" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                  <span style={{ flexShrink: 0 }}>📞</span>
                  <a href={`tel:${contact}`} style={{ color: "#475569", textDecoration: "none" }}>{contact}</a>
                </div>
              )}
            </div>

            {/* Schedule button */}
            <a
              className="member-schedule-btn"
              href={scheduleHref}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 2,
                padding: "7px 12px",
                background: "#EEF2FF",
                color: "#4338CA",
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 8,
                textDecoration: "none",
                border: "1px solid #E0E7FF",
              }}
            >
              📅 Schedule Meeting
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ── Teams discussion panel ────────────────────────────────────────────────────
// PHASE 1: Shows pending connection UI when teamsChannelId is not set
// PHASE 2: Fetches live messages from /api/teams-messages when teamsChannelId is set
//
// To activate Phase 2 for a project:
//   1. Wahab grants ChannelMessage.Read.All admin consent in Azure portal
//   2. Add teamsChannelId + teamsTeamId to the project entry in PROJECT_META (clickup-client.js)
//      e.g.  teamsTeamId: "19:abc123@thread.tacv2",  teamsChannelId: "19:xyz456@thread.tacv2"
//   3. The API route pages/api/teams-messages.js must be deployed
//   That's it — no other changes needed. The panel auto-switches to live mode.

function formatMsgTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHrs  < 24)  return `${diffHrs}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function TeamsPanel({ project }) {
  const hasLiveChannel = !!(project.teamsChannelId && project.teamsTeamId);
  const [msgs,    setMsgs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const chatBodyRef = useRef(null);

  // Phase 2: fetch live messages when channel IDs are present
  useEffect(() => {
    if (!hasLiveChannel) return;
    setLoading(true);
    setError("");
    fetch(`/api/teams-messages?teamId=${project.teamsTeamId}&channelId=${project.teamsChannelId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => { setMsgs(data.messages || []); setLoading(false); })
      .catch(err => { setError("Could not load messages."); setLoading(false); });
  }, [project.teamsTeamId, project.teamsChannelId]);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    if (chatBodyRef.current && msgs.length > 0) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [msgs]);

  // ── Phase 1: Pending connection state ───────────────────────────────────────
  if (!hasLiveChannel) {
    return (
      <div className="chat-card teams-panel">
        <div className="chat-header">
          <div className="chat-avatar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <div className="chat-title">{project.clientName} ↔ PFAS Team</div>
            <div className="chat-status-pending">
              <span className="pending-dot" />
              Connecting to Microsoft Teams…
            </div>
          </div>
        </div>

        <div className="chat-pending-body">
          {/* Teams logo mark */}
          <div className="teams-logo-wrap">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#6264A7"/>
              <path d="M30 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" fill="white"/>
              <path d="M34 20h-4.5A6 6 0 0 1 24 34a6 6 0 0 1-5.5-14H14a2 2 0 0 0-2 2v8a10 10 0 0 0 20 0v-8a2 2 0 0 0-2-2z" fill="white" fillOpacity="0.85"/>
            </svg>
          </div>

          <div className="pending-title">Teams channel connecting</div>
          <div className="pending-sub">
            Live discussion from your project channel will appear here once the
            Microsoft Teams integration is activated by your PFAS engagement team.
          </div>

          {/* Step indicators */}
          <div className="pending-steps">
            <div className="pstep pstep-done">
              <div className="pstep-icon">✓</div>
              <div className="pstep-text">Portal connected to PFAS systems</div>
            </div>
            <div className="pstep pstep-done">
              <div className="pstep-icon">✓</div>
              <div className="pstep-text">Project channel identified</div>
            </div>
            <div className="pstep pstep-pending">
              <div className="pstep-icon">
                <span className="pstep-spinner" />
              </div>
              <div className="pstep-text">Awaiting Teams channel permission</div>
            </div>
          </div>

          <div className="pending-hint">
            In the meantime, your team is active on Teams. Open the channel directly to see messages and post updates.
          </div>
        </div>

        <div className="chat-cta-banner">
          <div className="lbl">Your project channel is live on Teams</div>
          <a className="chat-cta" href={project.teamsChannel || "#"} target="_blank" rel="noreferrer">
            ↗ Open in Microsoft Teams
          </a>
        </div>
      </div>
    );
  }

  // ── Phase 2: Live messages ──────────────────────────────────────────────────
  return (
    <div className="chat-card teams-panel">
      <div className="chat-header">
        <div className="chat-avatar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white" fillOpacity="0.9"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="chat-title">{project.clientName} ↔ PFAS Team</div>
          <div className="chat-status">
            {loading ? "Loading messages…" : `${msgs.length} message${msgs.length !== 1 ? "s" : ""} · Live from Teams`}
          </div>
        </div>
        <a href={project.teamsChannel || "#"} target="_blank" rel="noreferrer"
           style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textDecoration: "none", flexShrink: 0 }}>
          Open ↗
        </a>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        {loading && (
          <div className="chat-loading">
            <div className="chat-loading-dot" /><div className="chat-loading-dot" /><div className="chat-loading-dot" />
          </div>
        )}
        {error && (
          <div className="chat-error">{error} — <a href={project.teamsChannel || "#"} target="_blank" rel="noreferrer" style={{ color: "#6264A7" }}>open in Teams ↗</a></div>
        )}
        {!loading && !error && msgs.length === 0 && (
          <div className="chat-empty">No messages yet in this channel.</div>
        )}
        {msgs.map((msg, i) => {
          const isMe = false; // all messages appear as "them" from client perspective
          const body = stripHtml(msg.body);
          if (!body) return null;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div className="msg-sender">{msg.from || "PFAS Team"}</div>
              <div className="msg msg-them">
                {body}
                <div className="msg-time" style={{ color: "#94A3B8" }}>{formatMsgTime(msg.createdDateTime)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-cta-banner">
        <div className="lbl">Reply directly in Teams</div>
        <a className="chat-cta" href={project.teamsChannel || "#"} target="_blank" rel="noreferrer">
          ↗ Open in Microsoft Teams
        </a>
      </div>
    </div>
  );
}

// ── Documents section ─────────────────────────────────────────────────────────
// Shows recently uploaded files (static representative list) + Upload button
// that redirects to the client's OneDrive folder.
// NOTE: Real recent-files require Graph API with delegated auth (future enhancement).
// For now, shows a representative placeholder list per project with link to full folder.
const RECENT_FILES_PLACEHOLDER = [
  { name: "Inception Report.pdf",          type: "pdf",  date: "Jun 2026" },
  { name: "Stakeholder Consultation MoM.docx", type: "word", date: "May 2026" },
  { name: "Financial Model v3.xlsx",        type: "excel", date: "May 2026" },
  { name: "Draft Policy Framework.docx",   type: "word",  date: "Apr 2026" },
];

function fileIcon(type) {
  if (type === "pdf")   return { icon: "📄", bg: "#FECACA", color: "#9B2C2C" };
  if (type === "word")  return { icon: "📝", bg: "#DBEAFE", color: "#1E40AF" };
  if (type === "excel") return { icon: "📊", bg: "#DCFCE7", color: "#276749" };
  if (type === "ppt")   return { icon: "📋", bg: "#FED7AA", color: "#9A3412" };
  return                       { icon: "📎", bg: "#E2E8F0", color: "#475569" };
}

function DocumentsSection({ project }) {
  const uploadUrl = project.onedriveUrl || "#";

  return (
    <div className="section-card docs-card">
      <div className="section-title">Project Documents</div>
      <div className="docs-recent-label">Recently Uploaded</div>
      <div className="docs-file-list">
        {RECENT_FILES_PLACEHOLDER.map((f, i) => {
          const fi = fileIcon(f.type);
          return (
            <a key={i} className="doc-file-row" href={uploadUrl} target="_blank" rel="noreferrer">
              <div className="doc-file-icon" style={{ background: fi.bg, color: fi.color }}>{fi.icon}</div>
              <div className="doc-file-info">
                <div className="doc-file-name">{f.name}</div>
                <div className="doc-file-meta">{f.date}</div>
              </div>
              <div className="doc-file-arrow">↗</div>
            </a>
          );
        })}
      </div>
      <div className="docs-actions-row">
        <a className="docs-browse-btn" href={uploadUrl} target="_blank" rel="noreferrer">
          📂 Browse All Files
        </a>
        <a className="docs-upload-btn" href={uploadUrl} target="_blank" rel="noreferrer">
          ⬆ Upload Document
        </a>
      </div>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────
function ActionsGrid({ project }) {
  // Scheduling: two paths.
  //  • teamsBookingUrl  → open self-service Bookings / Virtual Appointments page (client, no login)
  //  • teamsScheduleUrl → Teams "New meeting" deep link composer (PFAS team, set time + invite)
  return (
    <div className="actions-grid">
      <a className="action-btn" href={project.onedriveUrl || "#"} target="_blank" rel="noreferrer">
        <div className="action-icon ai-blue">📁</div>
        <div className="action-text"><div className="action-title">Shared Documents</div><div className="action-desc">Client Communication folder</div></div>
      </a>

      {/* Client self-service booking — no Teams account required */}
      <a className="action-btn" href={project.teamsBookingUrl || project.teamsMeeting || "#"} target="_blank" rel="noreferrer">
        <div className="action-icon ai-green">📅</div>
        <div className="action-text"><div className="action-title">Book a Meeting</div><div className="action-desc">Pick an open slot with your PFAS team</div></div>
      </a>

      <a className="action-btn" href={project.onedriveUrl || "#"} target="_blank" rel="noreferrer">
        <div className="action-icon ai-purple">📝</div>
        <div className="action-text"><div className="action-title">Meeting Minutes</div><div className="action-desc">MoMs folder · OneDrive</div></div>
      </a>
      <a className="action-btn" href={project.onedriveUrl || "#"} target="_blank" rel="noreferrer">
        <div className="action-icon ai-cyan">💰</div>
        <div className="action-text"><div className="action-title">Invoices & Payments</div><div className="action-desc">Payments folder · OneDrive</div></div>
      </a>
    </div>
  );
}

// ── Scheduling log ────────────────────────────────────────────────────────────
// Reads project.meetings: [{ title, datetime (ISO), attendees?, joinUrl?, notesUrl? }]
// Auto-splits into Upcoming (datetime >= now) and Completed (datetime < now).
// Works today with a static array in PROJECT_META; flip `meetings` to a live
// Graph /events or ClickUp feed later with no change to this component.
function MeetingLog({ project }) {
  const all = Array.isArray(project.meetings) ? project.meetings : [];
  const now = new Date();

  const parse = (m) => ({ ...m, _d: m.datetime ? new Date(m.datetime) : null });
  const parsed = all.map(parse).filter(m => m._d && !isNaN(m._d));

  const upcoming = parsed
    .filter(m => m._d >= now)
    .sort((a, b) => a._d - b._d);
  const completed = parsed
    .filter(m => m._d < now)
    .sort((a, b) => b._d - a._d);

  const fmt = (d) =>
    d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });

  const row = (m, i, kind) => (
    <div className={`mtg-row mtg-${kind}`} key={`${kind}-${i}`}>
      <div className="mtg-dot" />
      <div className="mtg-body">
        <div className="mtg-title">{m.title || "Meeting"}</div>
        <div className="mtg-meta">
          {fmt(m._d)}
          {m.attendees ? <span className="mtg-attendees"> · {m.attendees}</span> : null}
        </div>
      </div>
      <div className="mtg-actions">
        {kind === "up" && m.joinUrl && (
          <a className="mtg-link mtg-join" href={m.joinUrl} target="_blank" rel="noreferrer">Join ↗</a>
        )}
        {kind === "done" && m.notesUrl && (
          <a className="mtg-link mtg-notes" href={m.notesUrl} target="_blank" rel="noreferrer">Minutes ↗</a>
        )}
      </div>
    </div>
  );

  return (
    <div className="section-card mtg-card">
      <div className="section-title">Scheduling Log</div>

      <div className="mtg-group-label mtg-up-label">
        <span className="mtg-label-dot dot-amber" /> Upcoming Meetings
        <span className="mtg-count">{upcoming.length}</span>
      </div>
      {upcoming.length
        ? upcoming.map((m, i) => row(m, i, "up"))
        : <div className="mtg-empty">No upcoming meetings scheduled.</div>}

      <div className="mtg-group-label mtg-done-label" style={{ marginTop: 18 }}>
        <span className="mtg-label-dot dot-green" /> Completed Meetings
        <span className="mtg-count">{completed.length}</span>
      </div>
      {completed.length
        ? completed.map((m, i) => row(m, i, "done"))
        : <div className="mtg-empty">No meetings recorded yet.</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [authState, setAuthState]     = useState("loading");
  const [authError, setAuthError]     = useState("");
  const [userName, setUserName]       = useState("");
  const [projectSlug, setSlug]        = useState("");
  const [project, setProject]         = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError]     = useState("");
  const [isDev, setIsDev]             = useState(false);
  const auth0Ref = useRef(null);

  // ── Boot: dev mode or Auth0 ─────────────────────────────────────────────────
  useEffect(() => {
    const isLocalhost = window.location.hostname === "localhost";
    if (isLocalhost) {
      setIsDev(true);
      setAuthState("devpicker");
      return;
    }
    // Production: Auth0
    async function boot() {
      if (!window.auth0) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const client = await window.auth0.createAuth0Client({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        authorizationParams: { redirect_uri: window.location.origin },
        cacheLocation: "localstorage",
      });
      auth0Ref.current = client;

      if (window.location.search.includes("code=")) {
        await client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
      }

      const isAuth = await client.isAuthenticated();
      if (isAuth) {
        const user  = await client.getUser();
        const email = (user?.email || "").toLowerCase();
        const acc   = EMAIL_PROJECT_MAP[email];
        if (!acc) {
          setAuthError("Your account is not linked to any PFAS project. Contact your engagement lead.");
          setAuthState("login");
          return;
        }
        setUserName(acc.name);
        setSlug(acc.slug);
        setAuthState("app");
      } else {
        setAuthState("login");
      }
    }
    boot().catch(() => setAuthState("login"));
  }, []);

  // ── Fetch live project data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!projectSlug) return;
    setProject(null);
    setDataLoading(true);
    setDataError("");
    fetch(`/api/clickup-client?project=${projectSlug}`)
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then(data => { setProject(data); setDataLoading(false); })
      .catch(err => { setDataError("Could not load live project data. Please refresh."); setDataLoading(false); });
  }, [projectSlug]);

  const handleLogin     = () => auth0Ref.current?.loginWithRedirect();
  const handleLogout    = () => auth0Ref.current?.logout({ logoutParams: { returnTo: window.location.origin } });
  const handleDevSelect = (slug, name) => { setUserName(name); setSlug(slug); setAuthState("app"); };
  const handleDevSwitch = () => { setAuthState("devpicker"); setProject(null); setSlug(""); };

  // ── Shared <Head> ───────────────────────────────────────────────────────────
  const headAndCss = (
    <>
      <Head>
        <title>PFAS Client Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
    </>
  );

  // ── Render states ───────────────────────────────────────────────────────────
  if (authState === "loading") {
    return (
      <>
        {headAndCss}
        <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "#475569" }}>
            <div style={{ width: 72, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#1F3A5F,#2C4F7C)", color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>PFAS</div>
            <p style={{ fontSize: 14 }}>Loading portal…</p>
          </div>
        </div>
      </>
    );
  }

  if (authState === "devpicker") {
    return <>{headAndCss}<DevPicker onSelect={handleDevSelect} /></>;
  }

  if (authState === "login") {
    return <>{headAndCss}<LoginScreen onLogin={handleLogin} error={authError} /></>;
  }

  // ── App shell: new 2-column layout ─────────────────────────────────────────
  // Left (main):  ProjectHeader → KPIs → Team → Teams Discussion → Documents → Quick Actions
  // Right (sidebar): Phase Progress (sorted)
  return (
    <>
      {headAndCss}
      <TopBar userName={userName} onLogout={handleLogout} lastUpdated={project?.lastUpdated} isDev={isDev} onSwitchDev={handleDevSwitch} />
      <div className="container">
        <div className="hero">
          <div className="live-corner">LIVE DATA</div>
          <div className="hero-eyebrow">Project Portfolio Overview</div>
          <div className="hero-title">Welcome to your PFAS engagement portal</div>
          <div className="hero-sub">Track project progress, communicate with your advisory team in Microsoft Teams, access shared documents and meeting minutes, and schedule meetings — all in one place.</div>
        </div>

        {dataLoading && <LoadingSkeleton />}
        {dataError && (
          <div style={{ background: "#FECACA", border: "1px solid #F87171", borderRadius: 12, padding: "16px 20px", color: "#9B2C2C", marginBottom: 20 }}>
            ⚠ {dataError}
          </div>
        )}

        {project && !dataLoading && (
          <div className="main-grid">

            {/* ── LEFT: main content ── */}
            <div>
              <ProjectHeader project={project} />
              <KpiRow project={project} />

              {/* Team */}
              <div className="section-card">
                <div className="section-title">Your PFAS Advisory Team</div>
                <TeamGrid team={project.team} />
              </div>

              {/* Teams Discussion Panel — center */}
              <TeamsPanel project={project} />

              {/* Scheduling Log — upcoming + completed meetings */}
              <MeetingLog project={project} />

              {/* Documents */}
              <DocumentsSection project={project} />

              {/* Quick Actions */}
              <div className="section-card">
                <div className="section-title">Quick Actions</div>
                <ActionsGrid project={project} />
              </div>
            </div>

            {/* ── RIGHT: phase progress ── */}
            <div className="sidebar">
              <div className="section-card phase-sidebar-card">
                <div className="section-title">Phase Progress</div>
                <div className="phase-legend">
                  <span className="legend-dot dot-green" /> Completed
                  <span className="legend-dot dot-amber" style={{ marginLeft: 12 }} /> In Progress
                  <span className="legend-dot dot-grey"  style={{ marginLeft: 12 }} /> Not Started
                </div>
                <PhaseList phases={project.phases} />
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
