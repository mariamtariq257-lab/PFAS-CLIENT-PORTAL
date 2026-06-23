// pages/index.js  —  PFAS Client Portal
// Auth0 login → fetch live ClickUp data → render project dashboard

import Head from "next/head";
import { useEffect, useState, useRef } from "react";

const AUTH0_DOMAIN    = process.env.NEXT_PUBLIC_AUTH0_DOMAIN    || "dev-zrdwden5qdovxa40.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "Rhh7Of9haJruOvHsEYswD5YtmohXV81N";

// ── ADMIN CONFIG ──────────────────────────────────────────────────────────────
// Change ADMIN_PIN to any 4-digit string you prefer.
// This is a convenience bypass — same security level as the dev picker.
const ADMIN_PIN = "2580";

// IS_DEV is determined client-side only to avoid SSR/hydration mismatch

// ── EMAIL → PROJECT(S) MAP ────────────────────────────────────────────────────
const EMAIL_PROJECT_MAP = {
  // ── Single-project logins ──────────────────────────────────────────────────
  "demo@pfas.pk":       { name: "Demo Client",            projects: [{ slug: "pcmmdc",         label: "PCMMDC HR Manual" }] },
  "pcmmdc@pfas.pk":     { name: "PCMMDC",                 projects: [{ slug: "pcmmdc",         label: "PCMMDC HR Manual" }] },
  "p4a@pfas.pk":        { name: "P4A",                    projects: [{ slug: "p4a",            label: "Tertiary Care Hospital" }] },
  "energy@pfas.pk":     { name: "Energy Dept",            projects: [{ slug: "energy",         label: "PMW Strategic Design" }] },
  "fisheries@pfas.pk":  { name: "Fisheries Dept",         projects: [{ slug: "shrimps",        label: "Shrimps Estate Project" }] },
  "tam@pfas.pk":        { name: "TAM",                    projects: [{ slug: "tam",            label: "Time Travel Theme Park" }] },
  "pha@pfas.pk":        { name: "PHA",                    projects: [{ slug: "pha",            label: "PHA Lahore Sustainability" }] },
  "pbf@pfas.pk":        { name: "Punjab Benevolent",      projects: [{ slug: "pbf",            label: "Employees Welfare Fund" }] },
  "hed@pfas.pk":        { name: "HED",                    projects: [{ slug: "hed",            label: "HED Engagement" }] },
  "phimc@pfas.pk":      { name: "PHIMC",                  projects: [{ slug: "phimc",          label: "6 Hospitals Feasibility" }] },

  // ── Combined logins (dropdown appears) ────────────────────────────────────
  "cw@pfas.pk": {
    name: "C&W Department",
    projects: [
      { slug: "bot1",     label: "BOT-1 Depalpur-Pakpattan-Vehari" },
      { slug: "bot2",     label: "BOT-2 Chiragabad-Jhang-Shorkot" },
      { slug: "bot3",     label: "BOT-3 Muzaffargarh-Alipur-TM Panah" },
      { slug: "bot4",     label: "BOT-4 Sahiwal-Samundari" },
      { slug: "bot5",     label: "BOT-5 Bahawalpur-Jhangra Sharqi" },
      { slug: "om-roads", label: "18 O&M Roads PPP" },
    ],
  },
  "fiedmc@pfas.pk": {
    name: "FIEDMC",
    projects: [
      { slug: "fiedmc-m3ic", label: "M3IC Commercial Plot Sale" },
      { slug: "fiedmc-sbp",  label: "Strategic Business Plan" },
    ],
  },
  "finance@pfas.pk": {
    name: "Finance Department",
    projects: [
      { slug: "punjab-onebill", label: "Punjab One Bill Study" },
      { slug: "vss",            label: "VSS Engagement" },
    ],
  },
  "wildlife@pfas.pk": {
    name: "Wildlife Department",
    projects: [
      { slug: "wildlife-bansra", label: "Bansra Gali Wildlife" },
      { slug: "wildlife-changa", label: "Changa Manga Wildlife" },
    ],
  },

  // ── Legacy single-project logins ──────────────────────────────────────────
  "fiedmc-sbp@pfas.pk": { name: "FIEDMC (SBP)",           projects: [{ slug: "fiedmc-sbp",     label: "FIEDMC Strategic Business Plan" }] },
  "cw-bot1@pfas.pk":    { name: "C&W (BOT-1)",            projects: [{ slug: "bot1",           label: "BOT-1 Depalpur-Pakpattan-Vehari" }] },
  "cw-bot2@pfas.pk":    { name: "C&W (BOT-2)",            projects: [{ slug: "bot2",           label: "BOT-2 Chiragabad-Jhang-Shorkot" }] },
  "cw-bot3@pfas.pk":    { name: "C&W (BOT-3)",            projects: [{ slug: "bot3",           label: "BOT-3 Muzaffargarh-Alipur-TM Panah" }] },
  "cw-bot4@pfas.pk":    { name: "C&W (BOT-4)",            projects: [{ slug: "bot4",           label: "BOT-4 Sahiwal-Samundari" }] },
  "cw-bot5@pfas.pk":    { name: "C&W (BOT-5)",            projects: [{ slug: "bot5",           label: "BOT-5 Bahawalpur-Jhangra Sharqi" }] },
  "cw-om@pfas.pk":      { name: "C&W (18 O&M)",           projects: [{ slug: "om-roads",       label: "18 O&M Roads PPP" }] },
  "wildlife-b@pfas.pk": { name: "Wildlife (Bansra Gali)", projects: [{ slug: "wildlife-bansra",label: "Bansra Gali Wildlife" }] },
  "wildlife-c@pfas.pk": { name: "Wildlife (Changa)",      projects: [{ slug: "wildlife-changa",label: "Changa Manga Wildlife" }] },
  "vss@pfas.pk":        { name: "Finance (VSS)",          projects: [{ slug: "vss",            label: "VSS Engagement" }] },
};

// ── Admin client list: all unique clients for the admin picker ────────────────
// Groups projects under their parent client name for a clean admin view.
const ADMIN_CLIENT_LIST = (() => {
  const seen = new Set();
  const list = [];
  // Primary logins only (no legacy duplicates)
  const PRIMARY_EMAILS = [
    "demo@pfas.pk", "pcmmdc@pfas.pk", "p4a@pfas.pk", "energy@pfas.pk",
    "fisheries@pfas.pk", "tam@pfas.pk", "pha@pfas.pk", "pbf@pfas.pk",
    "hed@pfas.pk", "phimc@pfas.pk", "cw@pfas.pk", "fiedmc@pfas.pk",
    "finance@pfas.pk", "wildlife@pfas.pk",
  ];
  PRIMARY_EMAILS.forEach(email => {
    const acc = EMAIL_PROJECT_MAP[email];
    if (acc && !seen.has(acc.name)) {
      seen.add(acc.name);
      list.push({ email, name: acc.name, projects: acc.projects });
    }
  });
  return list;
})();

// All distinct project slugs (for dev picker)
const ALL_PROJECTS = (() => {
  const seen = new Set();
  const list = [];
  Object.values(EMAIL_PROJECT_MAP).forEach(acc => {
    acc.projects.forEach(p => {
      if (!seen.has(p.slug)) {
        seen.add(p.slug);
        list.push({ slug: p.slug, name: p.label });
      }
    });
  });
  return list;
})();


// ── Admin PIN modal ───────────────────────────────────────────────────────────
// Shown as an overlay on top of the login screen when "Admin Access" is clicked.
// Four digit boxes, auto-advances, shows shake animation on wrong PIN.
function AdminPinModal({ onSuccess, onClose }) {
  const [digits, setDigits]   = useState(["", "", "", ""]);
  const [error, setError]     = useState(false);
  const [shake, setShake]     = useState(false);
  const inputRefs             = [useRef(), useRef(), useRef(), useRef()];

  // Focus first box on mount
  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  const handleKey = (idx, e) => {
    // Allow only digits
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError(false);

    if (val && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }

    // Auto-check when all 4 filled
    if (val && idx === 3) {
      const pin = [...next.slice(0, 3), val].join("");
      checkPin(pin);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs[idx - 1].current?.focus();
    }
    if (e.key === "Enter") {
      const pin = digits.join("");
      if (pin.length === 4) checkPin(pin);
    }
  };

  const checkPin = (pin) => {
    if (pin === ADMIN_PIN) {
      onSuccess();
    } else {
      setShake(true);
      setError(true);
      setDigits(["", "", "", ""]);
      setTimeout(() => {
        setShake(false);
        inputRefs[0].current?.focus();
      }, 600);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`admin-modal-card ${shake ? "pin-shake" : ""}`}>
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-modal-icon">🔐</div>
          <div className="admin-modal-title">Admin Access</div>
          <div className="admin-modal-sub">Enter your 4-digit admin PIN to access all client portals</div>
        </div>

        {/* PIN dots */}
        <div className="pin-inputs">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              className={`pin-box ${error ? "pin-box-error" : d ? "pin-box-filled" : ""}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleKey(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <div className="pin-error-msg">Incorrect PIN. Please try again.</div>
        )}

        <button className="admin-modal-cancel" onClick={onClose}>
          Cancel
        </button>

        <div className="admin-modal-hint">
          Contact your PFAS system administrator if you've forgotten your PIN.
        </div>
      </div>
    </div>
  );
}


// ── Admin client picker ───────────────────────────────────────────────────────
// Full-screen picker shown after successful PIN entry.
// Lists all clients with their projects. Click a client → load their portal.
function AdminClientPicker({ onSelect, onBack }) {
  const [search, setSearch] = useState("");

  const filtered = ADMIN_CLIENT_LIST.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.projects.some(p => p.label.toLowerCase().includes(search.toLowerCase()))
  );

  // Department color tags
  const deptColor = (name) => {
    if (name.includes("C&W"))        return { bg: "#DBEAFE", color: "#1E40AF" };
    if (name.includes("Wildlife"))   return { bg: "#DCFCE7", color: "#166534" };
    if (name.includes("FIEDMC"))     return { bg: "#FEF3C7", color: "#92400E" };
    if (name.includes("Finance"))    return { bg: "#F3E8FF", color: "#6B21A8" };
    if (name.includes("Energy"))     return { bg: "#FEE2E2", color: "#991B1B" };
    if (name.includes("Fisheries"))  return { bg: "#CFFAFE", color: "#155E75" };
    return { bg: "#F1F5F9", color: "#334155" };
  };

  return (
    <div className="admin-picker-overlay">
      {/* Header */}
      <div className="admin-picker-header">
        <div className="admin-picker-brand">
          <div className="brand-logo" style={{ width: 52, height: 36, fontSize: 16 }}>PFAS</div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase" }}>Admin Mode</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Client Portal Overview</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="admin-badge">🔐 Admin</span>
          <button className="logout-btn" onClick={onBack}>← Exit Admin</button>
        </div>
      </div>

      {/* Body */}
      <div className="admin-picker-body">
        <div className="admin-picker-meta">
          {ADMIN_CLIENT_LIST.length} clients · {ALL_PROJECTS.length} projects
        </div>

        {/* Search */}
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input
            className="admin-search-input"
            type="text"
            placeholder="Search clients or projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        {/* Client cards */}
        <div className="admin-client-grid">
          {filtered.length === 0 && (
            <div className="admin-no-results">No clients match "{search}"</div>
          )}
          {filtered.map((client, ci) => {
            const dc = deptColor(client.name);
            const initials = client.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
            return (
              <div className="admin-client-card" key={ci}>
                {/* Client header */}
                <div className="admin-card-header">
                  <div className="admin-card-avatar" style={{ background: dc.bg, color: dc.color }}>
                    {initials}
                  </div>
                  <div>
                    <div className="admin-card-name">{client.name}</div>
                    <div className="admin-card-count">
                      {client.projects.length} project{client.projects.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Project list */}
                <div className="admin-project-list">
                  {client.projects.map((p, pi) => (
                    <button
                      key={pi}
                      className="admin-project-btn"
                      onClick={() => onSelect(p.slug, client.name, client.projects)}
                    >
                      <span className="admin-project-label">{p.label}</span>
                      <span className="admin-project-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


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
function LoginScreen({ onLogin, error, onAdminClick }) {
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
        <div className="login-footer">
          © 2026 Punjab Financial Advisory Services
          <button className="admin-link-btn" onClick={onAdminClick} title="Admin access">
            🔐 Admin
          </button>
        </div>
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

// ── Project switcher dropdown ─────────────────────────────────────────────────
function ProjectSwitcher({ projects, currentSlug, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = projects.find(p => p.slug === currentSlug) || projects[0];

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", background: "rgba(255,255,255,0.12)",
          color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", maxWidth: 280,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current.label}
        </span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: 6, zIndex: 100,
          minWidth: 280, maxHeight: 360, overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: "#94A3B8", padding: "8px 12px 4px", textTransform: "uppercase" }}>
            Switch Project
          </div>
          {projects.map(p => {
            const isActive = p.slug === currentSlug;
            return (
              <button
                key={p.slug}
                onClick={() => { onChange(p.slug); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 12px", background: isActive ? "#F1F5F9" : "transparent",
                  border: "none", borderRadius: 8, fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#1F3A5F" : "#334155", cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {isActive && <span style={{ color: "#276749", marginRight: 6 }}>✓</span>}
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function TopBar({ userName, onLogout, lastUpdated, isDev, onSwitchDev, projects, currentSlug, onProjectChange, isAdmin, onAdminSwitch }) {
  const initial = userName ? userName[0].toUpperCase() : "?";
  const showSwitcher = projects && projects.length > 1;
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
        {isAdmin && (
          <span className="admin-topbar-badge">🔐 Admin</span>
        )}
        {showSwitcher && (
          <ProjectSwitcher
            projects={projects}
            currentSlug={currentSlug}
            onChange={onProjectChange}
          />
        )}
        <span className="live-badge">
          <span className="live-dot" />
          {lastUpdated ? `Updated ${lastUpdated}` : "LIVE · ClickUp"}
        </span>
        <span className="user-chip">
          <span className="av">{initial}</span>
          <span>{userName}</span>
        </span>
        {isAdmin
          ? <button className="logout-btn" onClick={onAdminSwitch}>← Client List</button>
          : isDev
            ? <button className="logout-btn" onClick={onSwitchDev}>← Switch Client</button>
            : <button className="logout-btn" onClick={onLogout}>Sign Out</button>
        }
      </div>
    </div>
  );
}

// ── Project header ────────────────────────────────────────────────────────────
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

// ── Phase progress ────────────────────────────────────────────────────────────
function PhaseList({ phases }) {
  if (!phases?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>No phase data available.</p>;

  const sorted = [...phases].sort((a, b) => {
    const rank = (p) => { if (p.pct === 100) return 0; if (p.pct > 0) return 1; return 2; };
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

// ── PFAS Staff Directory ──────────────────────────────────────────────────────
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
// Converts Pakistani number to wa.me format: "0346-6991919" → "923466991919"
function toWhatsAppNumber(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, ""); // strip dashes, spaces
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  if (digits.startsWith("92")) return digits;
  return null;
}

function TeamGrid({ team }) {
  if (!team?.length) return <p style={{ color: "#94A3B8", fontSize: 13 }}>Team details coming soon.</p>;
  return (
    <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
      {team.map((m, i) => {
        const initials = m.name.split(" ").map(n => n[0]).join("").substring(0, 2);
        const staffKey = (m.email || "").toLowerCase().trim();
        const staff    = STAFF_DIRECTORY[staffKey] || {};
        const designation  = staff.designation || m.role || "—";
        const contact      = staff.contact     || null;
        const emailDisplay = m.email && m.email !== "—" ? m.email : null;
        const waNumber     = toWhatsAppNumber(contact);
        const waHref       = waNumber ? `https://wa.me/${waNumber}` : null;
        return (
          <div className="member-card" key={i} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div className={`avatar av-${m.color}`} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="member-name" style={{ fontWeight: 700, fontSize: 15, color: "#1E293B", lineHeight: 1.25 }}>{m.name}</div>
                <div className="member-role" style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.35, marginTop: 2 }}>{designation}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {emailDisplay && (
                <div className="member-email" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, minWidth: 0 }}>
                  <span style={{ flexShrink: 0 }}>✉</span>
                  <a href={`mailto:${emailDisplay}`} style={{ color: "#1F3A5F", textDecoration: "none", overflowWrap: "anywhere", wordBreak: "break-word" }}>{emailDisplay}</a>
                </div>
              )}
              {contact && (
                <div className="member-contact" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5 }}>
                  <span style={{ flexShrink: 0 }}>📞</span>
                  <a href={`tel:${contact}`} style={{ color: "#475569", textDecoration: "none" }}>{contact}</a>
                </div>
              )}
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 2 }}>
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", background: "#DCFCE7", color: "#166534", fontSize: 12.5, fontWeight: 600, borderRadius: 8, textDecoration: "none", border: "1px solid #BBF7D0" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.716a.5.5 0 0 0 .609.61l5.975-1.516A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.65-.523-5.157-1.432l-.36-.214-3.737.949.988-3.648-.235-.375A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Contact on WhatsApp
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Teams discussion panel ────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!hasLiveChannel) return;
    setLoading(true);
    setError("");
    fetch(`/api/teams-messages?teamId=${project.teamsTeamId}&channelId=${project.teamsChannelId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => { setMsgs(data.messages || []); setLoading(false); })
      .catch(() => { setError("Could not load messages."); setLoading(false); });
  }, [project.teamsTeamId, project.teamsChannelId]);

  useEffect(() => {
    if (chatBodyRef.current && msgs.length > 0) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [msgs]);

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
              <span className="pending-dot" /> Connecting to Microsoft Teams…
            </div>
          </div>
        </div>
        <div className="chat-pending-body">
          <div className="teams-logo-wrap">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#6264A7"/>
              <path d="M30 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" fill="white"/>
              <path d="M34 20h-4.5A6 6 0 0 1 24 34a6 6 0 0 1-5.5-14H14a2 2 0 0 0-2 2v8a10 10 0 0 0 20 0v-8a2 2 0 0 0-2-2z" fill="white" fillOpacity="0.85"/>
            </svg>
          </div>
          <div className="pending-title">Teams channel connecting</div>
          <div className="pending-sub">Live discussion from your project channel will appear here once the Microsoft Teams integration is activated by your PFAS engagement team.</div>
          <div className="pending-steps">
            <div className="pstep pstep-done"><div className="pstep-icon">✓</div><div className="pstep-text">Portal connected to PFAS systems</div></div>
            <div className="pstep pstep-done"><div className="pstep-icon">✓</div><div className="pstep-text">Project channel identified</div></div>
            <div className="pstep pstep-pending"><div className="pstep-icon"><span className="pstep-spinner" /></div><div className="pstep-text">Awaiting Teams channel permission</div></div>
          </div>
          <div className="pending-hint">In the meantime, your team is active on Teams. Open the channel directly to see messages and post updates.</div>
        </div>
        <div className="chat-cta-banner">
          <div className="lbl">Your project channel is live on Teams</div>
          <a className="chat-cta" href={project.teamsChannel || "#"} target="_blank" rel="noreferrer">↗ Open in Microsoft Teams</a>
        </div>
      </div>
    );
  }

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
          <div className="chat-status">{loading ? "Loading messages…" : `${msgs.length} message${msgs.length !== 1 ? "s" : ""} · Live from Teams`}</div>
        </div>
        <a href={project.teamsChannel || "#"} target="_blank" rel="noreferrer"
           style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textDecoration: "none", flexShrink: 0 }}>Open ↗</a>
      </div>
      <div className="chat-body" ref={chatBodyRef}>
        {loading && <div className="chat-loading"><div className="chat-loading-dot" /><div className="chat-loading-dot" /><div className="chat-loading-dot" /></div>}
        {error && <div className="chat-error">{error} — <a href={project.teamsChannel || "#"} target="_blank" rel="noreferrer" style={{ color: "#6264A7" }}>open in Teams ↗</a></div>}
        {!loading && !error && msgs.length === 0 && <div className="chat-empty">No messages yet in this channel.</div>}
        {msgs.map((msg, i) => {
          const body = stripHtml(msg.body);
          if (!body) return null;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div className="msg-sender">{msg.from || "PFAS Team"}</div>
              <div className="msg msg-them">{body}<div className="msg-time" style={{ color: "#94A3B8" }}>{formatMsgTime(msg.createdDateTime)}</div></div>
            </div>
          );
        })}
      </div>
      <div className="chat-cta-banner">
        <div className="lbl">Reply directly in Teams</div>
        <a className="chat-cta" href={project.teamsChannel || "#"} target="_blank" rel="noreferrer">↗ Open in Microsoft Teams</a>
      </div>
    </div>
  );
}

// ── Documents section ─────────────────────────────────────────────────────────
const RECENT_FILES_PLACEHOLDER = [
  { name: "Inception Report.pdf",             type: "pdf",   date: "Jun 2026" },
  { name: "Stakeholder Consultation MoM.docx",type: "word",  date: "May 2026" },
  { name: "Financial Model v3.xlsx",           type: "excel", date: "May 2026" },
  { name: "Draft Policy Framework.docx",       type: "word",  date: "Apr 2026" },
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
              <div className="doc-file-info"><div className="doc-file-name">{f.name}</div><div className="doc-file-meta">{f.date}</div></div>
              <div className="doc-file-arrow">↗</div>
            </a>
          );
        })}
      </div>
      <div className="docs-actions-row">
        <a className="docs-browse-btn" href={uploadUrl} target="_blank" rel="noreferrer">📂 Browse All Files</a>
        <a className="docs-upload-btn" href={uploadUrl} target="_blank" rel="noreferrer">⬆ Upload Document</a>
      </div>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────────────────────────
function ActionsGrid({ project }) {
  return (
    <div className="actions-grid">
      <a className="action-btn" href={project.onedriveUrl || "#"} target="_blank" rel="noreferrer">
        <div className="action-icon ai-blue">📁</div>
        <div className="action-text"><div className="action-title">Shared Documents</div><div className="action-desc">Client Communication folder</div></div>
      </a>
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
function MeetingLog({ project }) {
  const all = Array.isArray(project.meetings) ? project.meetings : [];
  const now = new Date();
  const parse = (m) => ({ ...m, _d: m.datetime ? new Date(m.datetime) : null });
  const parsed = all.map(parse).filter(m => m._d && !isNaN(m._d));
  const upcoming  = parsed.filter(m => m._d >= now).sort((a, b) => a._d - b._d);
  const completed = parsed.filter(m => m._d <  now).sort((a, b) => b._d - a._d);
  const fmt = (d) =>
    d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  const row = (m, i, kind) => (
    <div className={`mtg-row mtg-${kind}`} key={`${kind}-${i}`}>
      <div className="mtg-dot" />
      <div className="mtg-body">
        <div className="mtg-title">{m.title || "Meeting"}</div>
        <div className="mtg-meta">{fmt(m._d)}{m.attendees ? <span className="mtg-attendees"> · {m.attendees}</span> : null}</div>
      </div>
      <div className="mtg-actions">
        {kind === "up"   && m.joinUrl  && <a className="mtg-link mtg-join"  href={m.joinUrl}  target="_blank" rel="noreferrer">Join ↗</a>}
        {kind === "done" && m.notesUrl && <a className="mtg-link mtg-notes" href={m.notesUrl} target="_blank" rel="noreferrer">Minutes ↗</a>}
      </div>
    </div>
  );
  return (
    <div className="section-card mtg-card">
      <div className="section-title">Scheduling Log</div>
      <div className="mtg-group-label mtg-up-label"><span className="mtg-label-dot dot-amber" /> Upcoming Meetings<span className="mtg-count">{upcoming.length}</span></div>
      {upcoming.length ? upcoming.map((m, i) => row(m, i, "up")) : <div className="mtg-empty">No upcoming meetings scheduled.</div>}
      <div className="mtg-group-label mtg-done-label" style={{ marginTop: 18 }}><span className="mtg-label-dot dot-green" /> Completed Meetings<span className="mtg-count">{completed.length}</span></div>
      {completed.length ? completed.map((m, i) => row(m, i, "done")) : <div className="mtg-empty">No meetings recorded yet.</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [authState, setAuthState]         = useState("loading");
  const [authError, setAuthError]         = useState("");
  const [userName, setUserName]           = useState("");
  const [allowedProjects, setAllowedProjects] = useState([]);
  const [projectSlug, setSlug]            = useState("");
  const [project, setProject]             = useState(null);
  const [dataLoading, setDataLoading]     = useState(false);
  const [dataError, setDataError]         = useState("");
  const [isDev, setIsDev]                 = useState(false);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [showPinModal, setShowPinModal]   = useState(false);
  const auth0Ref = useRef(null);

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isLocalhost = window.location.hostname === "localhost";
    if (isLocalhost) {
      setIsDev(true);
      setAuthState("devpicker");
      return;
    }
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
        domain: AUTH0_DOMAIN, clientId: AUTH0_CLIENT_ID,
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
        setAllowedProjects(acc.projects);
        setSlug(acc.projects[0].slug);
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
      .catch(() => { setDataError("Could not load live project data. Please refresh."); setDataLoading(false); });
  }, [projectSlug]);

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleLogin     = () => auth0Ref.current?.loginWithRedirect();
  const handleLogout    = () => auth0Ref.current?.logout({ logoutParams: { returnTo: window.location.origin } });
  const handleDevSelect = (slug, name) => {
    setUserName(name);
    setAllowedProjects([{ slug, label: name }]);
    setSlug(slug);
    setAuthState("app");
  };
  const handleDevSwitch = () => { setAuthState("devpicker"); setProject(null); setSlug(""); };
  const handleProjectChange = (newSlug) => setSlug(newSlug);

  // ── Admin handlers ──────────────────────────────────────────────────────────
  const handleAdminPinSuccess = () => {
    setShowPinModal(false);
    setIsAdmin(true);
    setAuthState("adminpicker");
  };
  const handleAdminSelect = (slug, clientName, projects) => {
    setUserName(clientName);
    setAllowedProjects(projects);
    setSlug(slug);
    setAuthState("app");
  };
  const handleAdminSwitch = () => {
    setAuthState("adminpicker");
    setProject(null);
    setSlug("");
  };
  const handleAdminExit = () => {
    setIsAdmin(false);
    setAuthState("login");
    setProject(null);
    setSlug("");
    setUserName("");
  };

  // ── Shared <Head> ───────────────────────────────────────────────────────────
  const headAndCss = (
    <Head>
      <title>PFAS Client Portal</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    </Head>
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
    return (
      <>
        {headAndCss}
        <LoginScreen onLogin={handleLogin} error={authError} onAdminClick={() => setShowPinModal(true)} />
        {showPinModal && (
          <AdminPinModal
            onSuccess={handleAdminPinSuccess}
            onClose={() => setShowPinModal(false)}
          />
        )}
      </>
    );
  }

  if (authState === "adminpicker") {
    return (
      <>
        {headAndCss}
        <AdminClientPicker
          onSelect={handleAdminSelect}
          onBack={handleAdminExit}
        />
      </>
    );
  }

  // ── App shell ───────────────────────────────────────────────────────────────
  return (
    <>
      {headAndCss}
      <TopBar
        userName={userName}
        onLogout={handleLogout}
        lastUpdated={project?.lastUpdated}
        isDev={isDev}
        onSwitchDev={handleDevSwitch}
        projects={allowedProjects}
        currentSlug={projectSlug}
        onProjectChange={handleProjectChange}
        isAdmin={isAdmin}
        onAdminSwitch={handleAdminSwitch}
      />
      <div className="container">
        <div className="hero">
          <div className="live-corner">LIVE DATA</div>
          <div className="hero-eyebrow">Project Portfolio Overview</div>
          <div className="hero-title">Welcome to your PFAS engagement portal</div>
          <div className="hero-sub">Track project progress, contact your advisory team directly, access shared documents and meeting minutes, and schedule meetings — all in one place.</div>
        </div>

        {dataLoading && <LoadingSkeleton />}
        {dataError && (
          <div style={{ background: "#FECACA", border: "1px solid #F87171", borderRadius: 12, padding: "16px 20px", color: "#9B2C2C", marginBottom: 20 }}>
            ⚠ {dataError}
          </div>
        )}

        {project && !dataLoading && (
          <div className="main-grid">
            <div>
              <ProjectHeader project={project} />
              <KpiRow project={project} />
              <div className="section-card">
                <div className="section-title">Your PFAS Advisory Team</div>
                <TeamGrid team={project.team} />
              </div>
              <MeetingLog project={project} />
              <DocumentsSection project={project} />
              <div className="section-card">
                <div className="section-title">Quick Actions</div>
                <ActionsGrid project={project} />
              </div>
            </div>
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
