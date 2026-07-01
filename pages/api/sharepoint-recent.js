// pages/api/sharepoint-recent.js
// ----------------------------------------------------------------------------
// Returns the 3 most recently uploaded/modified files in a project's
// "Data for client access" SharePoint folder (recursively, across all 4
// sub-folders: PFAS Outputs, Received from Client, Meeting Minutes and
// Notes, Misc).
//
// Usage from the frontend:
//   fetch(`/api/sharepoint-recent?project=${projectSlug}`)
//
// Response shape:
//   { files: [ { name, webUrl, lastModifiedDateTime, size, type }, ... ] }
//
// PREREQUISITES (same Graph app registration already used for Teams sync,
// per PFAS_Portal_Context.md section 11):
//   - Application or delegated permissions: Sites.Read.All (or Sites.ReadWrite.All)
//   - Environment variables (set in Vercel project settings):
//       AZURE_TENANT_ID
//       AZURE_CLIENT_ID
//       AZURE_CLIENT_SECRET
//       SHAREPOINT_SITE_ID   (the Graph site ID for pfaspk.sharepoint.com/sites/PFAS-PMO —
//                             fetch once via GET https://graph.microsoft.com/v1.0/sites/pfaspk.sharepoint.com:/sites/PFAS-PMO
//                             and paste the returned "id" value here as an env var)
//
// If these env vars are not set, this route returns an empty file list
// with a clear "not configured" reason instead of crashing — the frontend
// falls back to the "Browse all documents" link-out card.
// ----------------------------------------------------------------------------

// ── Project slug -> SharePoint folder path map ──────────────────────────────
// Mirrors the SHAREPOINT_FOLDERS map in pages/index.js. Keep these two in
// sync if project folder paths change.
const PROJECT_FOLDER_PATHS = {
  "wildlife-bansra": "Wildlife/Bansara Gali/Data for client access",
  "wildlife-changa": "Wildlife/Changa Manga/Data for client access",
  "punjab-onebill":  "Finance Department/Punjab One Bill Study/Data for client access",
  "bot1":            "C&W/BOT-1 Depalpur-Pakpattan-Vehari/Data for client access",
  "bot2":            "C&W/BOT-2 Chiragabad-Jhang-Shorkot/Data for client access",
  "bot3":            "C&W/BOT-3 Muzaffargarh-Alipur-TM/Data for client access",
  "bot4":            "C&W/BOT-4 Sahiwal Samundari/Data for client access",
  "bot5":            "C&W/BOT 5 Bahawalpur-Jhangra sharqi Road/Data for client access",
  "om-roads":        "C&W/18 O&M Roads-PPP/Data for client access",
  "pcmmdc":          "PCMMDC/HR Manual/Data for client access",
  "p4a":             "P4A/PPP Structure Optimisation and Economic & Financial Feasibility Advisory -  Tertiary Care General Hospital/Data for client access",
  "fiedmc-m3ic":     "FIEDMC/Optimal Fund Utilisation of M3IC Commercial Plot Sale Proceeds/Data for client access",
  "fiedmc-sbp":      "FIEDMC/Strategic Business Plan/Data for client access",
  "tam":             "TAM/Time Travel Park/Data for client access",
  "pha":             "PHA/PHA/Data for client access",
  "pbf":             "Punjab Benevolent Fund/Punjab Govt Employees welfare fund/Data for client access",
  "vss":             "Finance Department/VSS Engagement/Data for client access",
  "energy":          "Energy Department/Strategic Assessment & Design of a Project Management Wing/Data for client access",
  "hed":             "Higher Education Department/Higher Education Department/Data for client access",
  "phimc":           "PHIMC/6 Hospitals Feasibility/Data for client access",
  "lda":             "LDA/Economic & Financial Feasibility Advisory -  4 Hospitals/Data for client access",
  "shrimps":         "Fisheries/Shrimps Estate Project/Data for client access",
};

const SITE_ROOT_PATH = "PFAS Operations/All Clients";

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getGraphToken() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error("NOT_CONFIGURED");
  }

  // Reuse cached token if still valid (tokens last 1hr; refresh 5 min early)
  if (cachedToken && Date.now() < cachedTokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`TOKEN_FETCH_FAILED: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

// Recursively walks a SharePoint folder (depth-limited to 2 levels deep —
// the 4 named sub-folders plus one level inside each) and collects files
// with their lastModifiedDateTime, then returns the 3 most recent overall.
async function getRecentFiles(token, siteId, folderPath, maxDepth = 2) {
  const files = [];

  async function walk(path, depth) {
    if (depth > maxDepth) return;
    const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/children`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return; // folder may not exist yet — skip silently

    const data = await res.json();
    for (const item of data.value || []) {
      if (item.folder) {
        await walk(`${path}/${item.name}`, depth + 1);
      } else if (item.file) {
        files.push({
          name: item.name,
          webUrl: item.webUrl,
          lastModifiedDateTime: item.lastModifiedDateTime,
          size: item.size,
          type: (item.name.split(".").pop() || "").toLowerCase(),
        });
      }
    }
  }

  await walk(folderPath, 0);
  files.sort((a, b) => new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime));
  return files.slice(0, 3);
}

export default async function handler(req, res) {
  const { project } = req.query;

  if (!project || !PROJECT_FOLDER_PATHS[project]) {
    return res.status(400).json({ files: [], error: "Unknown or missing project slug." });
  }

  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (!siteId) {
    return res.status(200).json({ files: [], error: "NOT_CONFIGURED", reason: "SHAREPOINT_SITE_ID env var not set." });
  }

  try {
    const token = await getGraphToken();
    const fullPath = `${SITE_ROOT_PATH}/${PROJECT_FOLDER_PATHS[project]}`;
    const files = await getRecentFiles(token, siteId, fullPath);
    return res.status(200).json({ files });
  } catch (err) {
    if (err.message === "NOT_CONFIGURED") {
      return res.status(200).json({ files: [], error: "NOT_CONFIGURED", reason: "Azure AD app credentials not set in environment variables." });
    }
    console.error("sharepoint-recent error:", err);
    return res.status(500).json({ files: [], error: "FETCH_FAILED" });
  }
}
