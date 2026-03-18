import { useState, useEffect } from "react";

const CATEGORIES = [
  {
    id: "asksage",
    name: "AskSage Platform",
    icon: "🤖",
    color: "#58a6ff",
    items: [
      { id: "as1", text: "Enterprise account active with 10M+ monthly tokens", priority: "critical", who: "Enterprise Admin / AskSage Rep", why: "All agents, M365 MCP, and full plugin access require enterprise tier. Without this, nothing else works.", how: "Log into chat.asksage.ai → Account Settings → Verify subscription tier shows Enterprise. If not, contact your AskSage account representative or support@asksage.ai to confirm enterprise enrollment.", verify: "Account Settings page shows Enterprise tier and monthly token allocation ≥ 10M" },
      { id: "as2", text: "API key generated and securely stored", priority: "critical", who: "You (ISSM)", why: "Every Power Automate flow and the SharePoint widget need this API key to authenticate against AskSage. Without it, no API calls work.", how: "AskSage platform → Account Settings → Manage your API Keys → Generate new key. Copy the key immediately — it won't be shown again. Store in a password manager or Azure Key Vault.", verify: "Test: POST https://api.asksage.ai/user/get-token-with-api-key with your email + API key. Should return an access_token JSON response." },
      { id: "as3", text: "API base URL confirmed (standard vs. dedicated tenant)", priority: "high", who: "Enterprise Admin / AskSage Support", why: "Dedicated tenants may have a different base URL than the standard api.asksage.ai. All flows, widgets, and scripts must use the correct URL.", how: "Contact AskSage support (support@asksage.ai) and ask: 'What is my organization's API base URL? Are we on the shared platform or a dedicated tenant?' Document the answer.", verify: "Both URLs respond: https://[your-base-url]/server/get-models and https://[your-base-url]/user/get-token-with-api-key" },
      { id: "as4", text: "Available models confirmed (Claude, GPT-4o, GPT-4o-mini)", priority: "high", who: "You", why: "SAGE Stage 2 uses Claude Opus, Stage 3 uses GPT-4o (different model for adversarial independence), bulk processing uses GPT-4o-mini for cost efficiency. All three must be available.", how: "After authenticating, POST to /server/get-models. Review the response list for: 'Google Anthropic Claude 4.5 Opus', 'Google OpenAI GPT-4o', 'Google OpenAI GPT-4o-mini'. Alternatively, check in the AskSage chat interface model selector.", verify: "All three models appear in the /get-models response or the chat model dropdown" },
      { id: "as5", text: "M365 MCP activation requested", priority: "high", who: "Enterprise Admin → AskSage Support", why: "Required for the Records Officer Copilot (Agent 6) to access Outlook, Calendar, OneDrive, and SharePoint from within AskSage chat. Requires admin-level request.", how: "Email support@asksage.ai: 'We are requesting Microsoft 365 MCP activation for our enterprise account. Our organization is [TACOM G-6], enterprise tier with 10M+ tokens. Please enable hosted MCP access.' Wait for confirmation email.", verify: "After activation: Account Settings → Sign in with Microsoft button appears. After signing in, chat Tools menu shows 'Microsoft 365' toggle." },
      { id: "as6", text: "Dataset creation permissions verified", priority: "high", who: "You", why: "You need to create and manage 6+ datasets for RAG grounding. Some enterprise accounts restrict dataset creation to admins.", how: "POST to /user/add-dataset with body: {\"dataset_name\": \"test_dataset_creation\"}. If successful, immediately call /user/delete-datasets to clean up.", verify: "Dataset creation returns success. Then verify with /server/get-datasets that it appears in the list." },
      { id: "as7", text: "Agent Builder access confirmed", priority: "high", who: "You", why: "The Bulk Processor, Drift Monitor, and Transfer Advisor all run as Agent Builder workflows. This feature may need separate enablement.", how: "Navigate to AskSage platform → look for 'Workflows & Agents' or 'Agent Builder' in the navigation menu. If not visible, contact support to enable.", verify: "Agent Builder dashboard loads. You can see the 'Create New Workflow' button." },
      { id: "as8", text: "Plugin access verified (Iterative CSV, Summarize File, Content into Dataset)", priority: "medium", who: "You", why: "Dataset ingestion uses these plugins. Paid plugins require active subscription.", how: "POST to /server/get-plugins. Check response for: 'Iterative CSV Prompting', 'Summarize File', 'Content into Dataset', 'CSV Lines'. Alternatively, check the Plugins & Agents section in chat.", verify: "All four plugins appear in the list and are marked as available (not locked)" },
      { id: "as9", text: "Token consumption baseline measured", priority: "medium", who: "You", why: "Before building agents, you need to know your current baseline usage so you can project headroom for new agent workloads.", how: "GET or POST to /server/count-monthly-tokens. Record the current month's usage. Also check the Enterprise Account → Account Metrics dashboard for historical trends.", verify: "You know your current monthly burn rate and can calculate remaining capacity" },
      { id: "as10", text: "OpenAI-compatible endpoint availability (optional, for future flexibility)", priority: "low", who: "You", why: "AskSage offers OpenAI-style endpoints that could allow integration with other tools or custom apps that expect the OpenAI API format.", how: "Review docs at https://docs.asksage.ai/docs/api-documentation/OpenAI-Compatibility-Guide.html. Test if these endpoints work with your API key.", verify: "OpenAI-compatible /v1/chat/completions endpoint responds correctly" },
    ],
  },
  {
    id: "powerplatform",
    name: "Power Platform",
    icon: "⚡",
    color: "#a78bfa",
    items: [
      { id: "pp1", text: "Power Automate Premium license assigned to flow owner", priority: "critical", who: "IT License Admin / Power Platform Admin", why: "The HTTP connector used to call AskSage REST API is a PREMIUM connector. Any flow using it requires the owner to have Power Automate Premium ($15/user/month) or a Power Apps Premium license ($20/user/month) which includes PA rights. Without this, your flows cannot make external API calls.", how: "Power Platform Admin Center → Users → Find your account → Check assigned licenses. You need one of: Power Automate Premium, Power Apps Premium, or a Dynamics 365 license that includes premium connectors. If not assigned, submit a license request to your IT admin.", verify: "In Power Automate portal → Settings → View my licenses → Confirms 'Power Automate Premium' or equivalent" },
      { id: "pp2", text: "Dataverse environment provisioned with sufficient storage", priority: "critical", who: "Power Platform Admin", why: "All 12 rmr_ tables live in Dataverse. The AI Suggestion Log table will grow rapidly (each classification generates ~3-5KB of raw JSON response data). You need database capacity for growth.", how: "Power Platform Admin Center → Environments → Select your environment → Resources → Capacity. Check: Database (GB used/available), File (GB used/available). Estimate: 1GB database + 5GB file storage for first year of RMR operations.", verify: "Environment shows ≥ 1GB database capacity available and ≥ 5GB file capacity" },
      { id: "pp3", text: "Environment DLP policies allow HTTP connector", priority: "critical", who: "Power Platform Admin / You", why: "Data Loss Prevention policies can block the HTTP connector entirely or restrict it to specific endpoint patterns. If DLP blocks HTTP, NO AskSage API calls will work from Power Automate.", how: "Power Platform Admin Center → Policies → Data policies → Check each policy applied to your environment. Look for the HTTP connector in the 'Business' or 'Blocked' groups. The HTTP connector must be in the 'Business' (or 'Non-Business') group — NOT in 'Blocked'. Ideally, configure the policy to allow only https://api.asksage.ai/* endpoints.", verify: "Create a test flow with an HTTP action to POST to https://api.asksage.ai/server/get-models. If it runs without DLP errors, you're clear." },
      { id: "pp4", text: "Environment variables capability available", priority: "high", who: "You", why: "API keys, base URLs, and configuration values (like RMR_DispositionReminderDays) should be stored as environment variables — not hardcoded in flows. This enables proper ALM (dev → test → prod promotion).", how: "In your solution, create a new Environment Variable: Name: ASKSAGE_API_KEY, Type: Secret. Create another: Name: ASKSAGE_BASE_URL, Type: Text, Default: https://api.asksage.ai. Create: ASKSAGE_EMAIL, Type: Text. Create: RMR_DISPOSITION_REMINDER_DAYS, Type: Text, Default: 30.", verify: "Environment variables appear in your solution and can be referenced from Power Automate flows" },
      { id: "pp5", text: "Connection references configured for HTTP", priority: "high", who: "You", why: "Connection references allow flows to use different credentials per environment (dev/test/prod). For the HTTP connector, this means you can swap API keys without editing flows.", how: "In your solution → New → More → Connection Reference → Connector: HTTP. This creates a reusable connection reference. All SAGE flows should reference this instead of inline connections.", verify: "Connection reference appears in solution and can be selected when configuring HTTP actions in flows" },
      { id: "pp6", text: "Solution publisher prefix confirmed (rmr_)", priority: "high", who: "You", why: "All RMR Dataverse tables use the rmr_ prefix. The publisher must exist in the target environment before importing any solution. This was a lesson learned from EPM deployment.", how: "Power Platform Admin Center → Environments → Your environment → Solutions → Publishers. Verify a publisher with prefix 'rmr' exists. If not, create one before importing any solution components.", verify: "Publisher with prefix 'rmr' exists and is associated with your RMR solution" },
      { id: "pp7", text: "Canvas App maker permissions in target environment", priority: "high", who: "Environment Admin", why: "You need Environment Maker or System Customizer role to create/edit Canvas Apps and Dataverse tables.", how: "Power Platform Admin Center → Environments → Your environment → Security roles → Verify your account has 'Environment Maker' or 'System Customizer' role.", verify: "You can create a test Canvas App and Dataverse table in the target environment" },
      { id: "pp8", text: "Power Automate flow run history retention configured", priority: "medium", who: "Power Platform Admin", why: "Flow run history is your debugging lifeline. Default retention is 28 days. For compliance, consider extending to 90 days for SAGE orchestrator flows.", how: "This is set at the environment level. Check Power Platform Admin Center → Environments → Settings → Audit and logs. Note: extended retention may require additional Dataverse log storage.", verify: "Flow run history settings documented. Retention period sufficient for your audit requirements." },
      { id: "pp9", text: "Power BI Pro or Premium license for monitoring dashboards", priority: "medium", who: "IT License Admin", why: "The token monitoring dashboard, AI acceptance rate tracking, and drift reporting all need Power BI. Pro license required for sharing dashboards.", how: "Check your M365 license assignments for Power BI Pro or Premium Per User. If using Power BI embedded in a Canvas App, you need Premium capacity.", verify: "You can create and publish a Power BI report that connects to your Dataverse environment" },
    ],
  },
  {
    id: "sharepoint",
    name: "SharePoint & M365",
    icon: "📄",
    color: "#3fb950",
    items: [
      { id: "sp1", text: "SharePoint App Catalog access (Site Collection Admin)", priority: "critical", who: "SharePoint Admin", why: "The AskSage Chat Widget (asksage-chatbot.sppkg) must be uploaded to the App Catalog. Without App Catalog access, you cannot deploy the Help Desk widget.", how: "SharePoint Admin Center → More features → Apps → Open → App Catalog. If 'App Catalog' doesn't exist, a SharePoint Admin needs to create one first: https://docs.microsoft.com/en-us/sharepoint/use-app-catalog. You need Site Collection Admin rights on the App Catalog site.", verify: "You can navigate to the App Catalog and see the 'Apps for SharePoint' document library" },
      { id: "sp2", text: "asksage-chatbot.sppkg package obtained", priority: "critical", who: "AskSage Support", why: "This is the SPFx web part package file that contains the SharePoint Chat Widget. AskSage provides it to enterprise customers.", how: "Email support@asksage.ai: 'Please provide the asksage-chatbot.sppkg SharePoint web part package for our enterprise deployment.' They should provide the latest version.", verify: "You have the .sppkg file downloaded and ready to upload to App Catalog" },
      { id: "sp3", text: "SharePoint Document Library for RMR file storage configured", priority: "high", who: "You / SP Site Admin", why: "RMR stores uploaded document binaries in a SharePoint Document Library. The Canvas App writes files here and stores the URL in rmr_sharepointfileurl.", how: "Create a dedicated Document Library on your TACOM G-6 SharePoint site (e.g., 'RMR Documents'). Configure permissions to match your Dataverse security roles. Enable versioning for audit compliance.", verify: "Document Library exists, versioning is enabled, and you can upload/download test files programmatically" },
      { id: "sp4", text: "SharePoint site edit permissions for widget target pages", priority: "high", who: "SP Site Owner / You", why: "You need page edit rights on every SharePoint page where the Help Desk widget will be deployed. The widget API key is stored in the web part property pane, so only trusted editors should have access.", how: "For each target page (G-6 Records Hub, Cyber Ops, CWF Portal, etc.): verify you can click Edit on the page. If not, request Editor permissions from the Site Owner.", verify: "You can edit and publish each target SharePoint page" },
      { id: "sp5", text: "Per-page deployment approval (agency security requirement)", priority: "medium", who: "Security Team / SP Governance", why: "Per the AskSage admin setup guide: 'Depending on your organization's security requirements, you may need approval on a per-page basis before deploying the widget.' Check your agency's SharePoint governance policy.", how: "Contact your SharePoint governance office or agency security team. Ask: 'Do we need per-page approval to deploy third-party SPFx web parts on our SharePoint sites?' Document the answer and any approval workflow required.", verify: "Written approval (email or ticket) for each page where the widget will be deployed, OR confirmation that per-page approval is not required" },
      { id: "sp6", text: "Microsoft 365 account for MCP authentication", priority: "high", who: "You", why: "The M365 MCP requires you to authenticate with your Microsoft account inside AskSage. Your army.mil credentials must be able to complete the OAuth flow.", how: "After M365 MCP is activated (see AskSage checklist): Account Settings → Sign in with Microsoft → Complete authentication with your army.mil credentials.", verify: "AskSage Account Settings shows 'Logout from Microsoft' button (indicating successful connection)" },
    ],
  },
  {
    id: "network",
    name: "Network & Security",
    icon: "🔒",
    color: "#f85149",
    items: [
      { id: "nw1", text: "Network allow-list: api.asksage.ai (HTTPS 443)", priority: "critical", who: "Network Team / Firewall Admin", why: "ALL AskSage API calls from Power Automate, the SharePoint widget, and any Python scripts go through this domain. If your government network blocks it, nothing works.", how: "Submit a network change request to your Network Operations team: 'Request allow-listing of HTTPS (port 443) traffic to api.asksage.ai from our Power Platform environment and SharePoint tenant. This is for an authorized DoD AI platform (AskSage, FedRAMP High / IL5 authorized).' Include the ATO/authorization documentation from AskSage.", verify: "From a machine on your network, run: curl -s -o /dev/null -w '%{http_code}' https://api.asksage.ai/server/get-models → should return 200 or 401 (not connection refused/timeout)" },
      { id: "nw2", text: "Network allow-list: chat.asksage.ai (HTTPS 443)", priority: "high", who: "Network Team", why: "This is the AskSage web interface where you access Agent Builder, chat, plugins, and account settings. Needed for building and managing workflows.", how: "Same change request as above, add chat.asksage.ai to the allow-list.", verify: "You can load https://chat.asksage.ai in your browser from your government workstation" },
      { id: "nw3", text: "Network allow-list: box.asksage.ai (if using In A Box suite)", priority: "low", who: "Network Team", why: "Only needed if you plan to use ATO In a Box or other compliance suite tools.", how: "Add to same network change request if planning to use In A Box products.", verify: "https://box.asksage.ai loads in browser" },
      { id: "nw4", text: "Proxy/SSL inspection compatibility confirmed", priority: "high", who: "Network Security Team", why: "Many government networks use SSL inspection proxies that break TLS connections. If your proxy re-signs certificates, API calls from Power Automate may fail with SSL errors.", how: "Ask your Network Security team: 'Does our network proxy perform SSL/TLS inspection? If so, is api.asksage.ai on the bypass list?' If SSL inspection is active and not bypassed, API calls will fail with certificate errors.", verify: "Power Automate HTTP action to https://api.asksage.ai does NOT return SSL/certificate errors" },
      { id: "nw5", text: "SharePoint widget can reach api.asksage.ai from client browsers", priority: "high", who: "Network Team", why: "The SharePoint Chat Widget makes API calls from the user's BROWSER (client-side), not from the server. This means the user's workstation network must allow outbound HTTPS to api.asksage.ai.", how: "Test from a typical user workstation (not just your admin machine): open browser dev tools (F12) → Console → type: fetch('https://api.asksage.ai/server/get-models', {method:'POST'}).then(r=>console.log(r.status)). Should return 401 (unauthorized but reachable), not a network error.", verify: "Browser fetch to api.asksage.ai returns HTTP status code (401 is fine), not a network/CORS error" },
      { id: "nw6", text: "CAC/PIV authentication does not block AskSage OAuth flows", priority: "medium", who: "Security Team", why: "Some DoD networks force CAC authentication on all outbound connections. This can interfere with the M365 MCP OAuth flow and AskSage's own authentication.", how: "Test by logging into chat.asksage.ai and completing a full authentication cycle. Then test the M365 MCP sign-in flow. If either fails with authentication errors, you may need a proxy exception.", verify: "You can authenticate to AskSage AND complete M365 sign-in without CAC interference" },
    ],
  },
  {
    id: "governance",
    name: "Governance & Compliance",
    icon: "📋",
    color: "#e3b341",
    items: [
      { id: "gv1", text: "AskSage ATO/authorization documentation on file", priority: "critical", who: "You (ISSM)", why: "As ISSM, you need to document that AskSage is an authorized platform for processing your data classification level. AskSage holds FedRAMP High and IL5 authorization, but your local ATO package should reference this.", how: "Request AskSage's authorization documentation: FedRAMP High authorization letter, IL5 provisional authorization, and SSP summary. Add to your system's ATO package as an interconnection/external service dependency.", verify: "AskSage authorization artifacts are filed in your ATO documentation and referenced in your system's interconnection agreements" },
      { id: "gv2", text: "Data classification boundary confirmed for AskSage processing", priority: "critical", who: "You (ISSM) / Classification Authority", why: "SAGE prompts include document metadata (titles, subjects, keywords, content previews). You MUST confirm this data is within the classification level authorized for AskSage processing. Classified data MUST NOT be sent to AskSage unless your instance is authorized at that level.", how: "Document the classification boundary: 'RMR sends only UNCLASSIFIED and CUI document metadata to AskSage. No classified content, file binaries, or PII beyond what is in document titles/subjects is transmitted.' Get this signed by your ISSM/AO.", verify: "Written classification boundary statement signed and filed. SAGE system prompt includes explicit classification guard (already in your Stage 1 prompt)." },
      { id: "gv3", text: "Privacy Impact Assessment (PIA) updated for AI processing", priority: "high", who: "Privacy Officer / You", why: "Sending document metadata to an external AI service may require a PIA update, especially if any metadata contains PII (originator names, subjects referencing personnel).", how: "Contact your organization's Privacy Officer. Ask: 'We are implementing AI-assisted records classification using AskSage (FedRAMP High / IL5). Document metadata including titles, subjects, and originator names will be processed. Do we need a PIA update?' Document the response.", verify: "PIA either updated to cover AI processing, or written confirmation that no update is needed" },
      { id: "gv4", text: "Records Officer awareness and buy-in", priority: "high", who: "You / Records Officer", why: "The Records Officer is a key stakeholder — they review AI classifications, approve dispositions, and are responsible for NARA compliance. Without their buy-in, Agents 3-6 have no operational owner.", how: "Brief the Records Officer on: what SAGE does, how confidence thresholds work, their role in the review queue, and how the Help Desk widget will reduce their question volume. Get their input on dataset content and disposition workflows.", verify: "Records Officer understands the system, has agreed to review pending classifications, and has provided input on GRS dataset accuracy" },
      { id: "gv5", text: "AI usage documentation for NARA compliance", priority: "high", who: "You / Records Officer", why: "NARA's emerging guidance states that AI-assisted classification decisions are themselves records. The AI Suggestion Log (rmr_aisuggestionlog) satisfies this, but you need to document the policy.", how: "Create a brief policy memo: 'TACOM G-6 uses AskSage AI to assist (not replace) records classification. All AI decisions are logged in rmr_aisuggestionlog including full prompt/response data. Records Officers review and approve all classifications below 90% confidence. AI suggestions can be overridden at any time.' File with your records management program documentation.", verify: "Policy memo drafted, reviewed by Records Officer, and filed" },
      { id: "gv6", text: "Ethics/legal review for AI-assisted government decisions", priority: "medium", who: "Legal Counsel / Ethics Office", why: "Some agencies require legal review before deploying AI that assists in government decision-making (even non-binding recommendations). Records classification affects retention and destruction timelines.", how: "Check with your legal counsel or ethics office: 'Do we need legal review for using AI to recommend (not auto-decide) records retention classifications?' If your outside employment ethics clearance process applies (similar to Ironlane Digital), follow that model.", verify: "Legal/ethics clearance obtained or written confirmation that none is required" },
      { id: "gv7", text: "API key rotation schedule established", priority: "medium", who: "You", why: "Per the SharePoint widget admin guide, quarterly API key rotation is recommended. The widget embeds the key in the web part property pane (visible to page editors).", how: "Create a recurring calendar event: quarterly API key rotation. Process: Generate new key → Update Power Automate environment variable → Update all SharePoint widget property panes → Deactivate old key → Log rotation in audit trail.", verify: "Calendar reminders set. First rotation date documented." },
    ],
  },
  {
    id: "data",
    name: "Source Data & Content",
    icon: "📦",
    color: "#79c0ff",
    items: [
      { id: "dt1", text: "GRS Transmittal 36 source document obtained", priority: "critical", who: "Records Officer / NARA website", why: "This is THE primary reference document — 31 GRS schedules, 67 line items, DAA numbers. It becomes your grs_transmittal_36 dataset. Without it, SAGE has no classification knowledge base.", how: "Download from NARA website: https://www.archives.gov/records-mgmt/grs. Get the latest Transmittal (currently #36, August 2024). Also get the individual schedule PDFs for detailed disposition instructions. Your Records Officer should have these on file.", verify: "You have the complete GRS Transmittal 36 document with all 31 schedules and 67 line items ready for ingestion" },
      { id: "dt2", text: "NARA disposition guidance documents collected", priority: "high", who: "Records Officer", why: "Feeds the nara_disposition_guidance dataset used by the Disposition Scheduler agent.", how: "Collect: 36 CFR 1226 (Implementing Disposition), NIST SP 800-88 Rev 1 (Media Sanitization — for destruction methods), NARA Bulletin 2015-04 (Metadata for Transfer), ERA submission guidance.", verify: "All four source documents downloaded and ready for ingestion via Summarize File plugin" },
      { id: "dt3", text: "Army ARIMS schedule obtained (agency-specific)", priority: "high", who: "Records Officer", why: "GRS covers government-wide records. Army-specific records (OPORDs, mission reports, command directives) are covered by ARIMS, not GRS. SAGE needs both to be complete.", how: "Contact your Records Officer or visit the Army Records Management portal for the current ARIMS schedule applicable to TACOM. This may be a controlled document.", verify: "ARIMS schedule document obtained and ready for ingestion into army_arims dataset" },
      { id: "dt4", text: "CUI marking guidance documents collected (32 CFR Part 2002)", priority: "medium", who: "CUI Program Manager / You", why: "SAGE includes a classification level advisory. The classification_guidance dataset needs 32 CFR Part 2002 and DoDI 5200.48 to provide accurate CUI category recommendations.", how: "Download 32 CFR Part 2002 from eCFR.gov. Download DoDI 5200.48 from the DoD Issuances website. These are publicly available.", verify: "Both documents downloaded and ready for ingestion" },
      { id: "dt5", text: "TACOM G-6 local RM SOPs identified", priority: "medium", who: "Records Officer / You", why: "Local procedures supplement federal guidance. The tacom_rm_sops dataset ensures the Help Desk widget gives TACOM-specific answers, not just generic NARA guidance.", how: "Gather from Records Officer: TACOM G-6 records management SOP, local file plan guidance, disposition approval workflows, legal hold procedures.", verify: "Local SOPs collected and ready for ingestion" },
      { id: "dt6", text: "Test document set prepared (50-100 documents with known GRS classifications)", priority: "high", who: "You / Records Officer", why: "You need a ground-truth validation set to measure SAGE accuracy. Without this, you can't verify the system works before going live.", how: "Work with Records Officer to compile 50-100 documents where the correct GRS classification is already known. Include a mix: financial records, HR records, IT records, policy memos, correspondence. Create a CSV with columns: title, type, office, date, subject, known_grs_key.", verify: "Test CSV ready with ≥ 50 documents and their verified GRS classifications" },
    ],
  },
];

const PRIORITY_COLORS = { critical: "#f85149", high: "#e3b341", medium: "#58a6ff", low: "#8b949e" };
const PRIORITY_LABELS = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

export default function App() {
  const [checks, setChecks] = useState({});
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const init = {};
    CATEGORIES.forEach(cat => cat.items.forEach(item => { init[item.id] = false; }));
    setChecks(init);
  }, []);

  const toggle = (id) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const totalItems = CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = Object.values(checks).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const criticalTotal = CATEGORIES.reduce((s, c) => s + c.items.filter(i => i.priority === "critical").length, 0);
  const criticalDone = CATEGORIES.reduce((s, c) => s + c.items.filter(i => i.priority === "critical" && checks[i.id]).length, 0);

  const filteredCategories = CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (filter === "all") return true;
      if (filter === "incomplete") return !checks[item.id];
      return item.priority === filter;
    }),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#c9d1d9" }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "#30363d", background: "#161b22" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#8b949e" }}>TACOM G-6 — RMR AI Agent Solution</div>
          <h1 className="text-2xl font-bold" style={{ color: "#e6edf3" }}>Environment Pre-Flight Checklist</h1>
          <p className="text-sm mt-1" style={{ color: "#8b949e" }}>Verify all permissions, access, and resources before building</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b" style={{ borderColor: "#30363d", background: "#161b22" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4">
              <span className="text-sm font-bold" style={{ color: "#e6edf3" }}>{checkedItems}/{totalItems} Complete ({pct}%)</span>
              <span className="text-sm" style={{ color: criticalDone === criticalTotal ? "#3fb950" : "#f85149" }}>
                Critical: {criticalDone}/{criticalTotal} {criticalDone === criticalTotal ? "✓" : "⚠"}
              </span>
            </div>
            <div className="flex gap-1">
              {["all", "incomplete", "critical", "high", "medium"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1 text-xs rounded-full font-medium"
                  style={{
                    background: filter === f ? "#30363d" : "transparent",
                    color: filter === f ? "#e6edf3" : "#8b949e",
                    border: `1px solid ${filter === f ? "#484f58" : "transparent"}`,
                  }}>
                  {f === "all" ? "All" : f === "incomplete" ? "Incomplete" : PRIORITY_LABELS[f] || f}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full rounded-full h-3" style={{ background: "#21262d" }}>
            <div className="h-3 rounded-full transition-all duration-500" style={{
              width: `${pct}%`,
              background: pct === 100 ? "#3fb950" : pct >= 70 ? "#e3b341" : "#58a6ff",
            }} />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="max-w-4xl mx-auto p-4">
        {filteredCategories.map(cat => {
          const catDone = cat.items.filter(i => checks[i.id]).length;
          return (
            <div key={cat.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "#21262d" }}>
                <span className="text-lg">{cat.icon}</span>
                <h2 className="text-lg font-bold" style={{ color: cat.color }}>{cat.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: "#21262d", color: "#8b949e" }}>
                  {catDone}/{cat.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {cat.items.map(item => {
                  const isExpanded = expanded[item.id];
                  const isDone = checks[item.id];
                  return (
                    <div key={item.id} className="rounded-lg overflow-hidden" style={{ background: "#161b22", border: `1px solid ${isDone ? "#238636" : "#30363d"}` }}>
                      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => toggle(item.id)}>
                        <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs"
                          style={{ borderColor: isDone ? "#3fb950" : "#484f58", background: isDone ? "#23863622" : "transparent", color: "#3fb950" }}>
                          {isDone && "✓"}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "#8b949e" : "#e6edf3" }}>
                              {item.text}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                              background: PRIORITY_COLORS[item.priority] + "18",
                              color: PRIORITY_COLORS[item.priority],
                              border: `1px solid ${PRIORITY_COLORS[item.priority]}33`,
                            }}>
                              {PRIORITY_LABELS[item.priority]}
                            </span>
                          </div>
                          <div className="text-xs mt-1" style={{ color: "#8b949e" }}>Owner: {item.who}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                          className="flex-shrink-0 text-xs px-2 py-1 rounded" style={{ color: "#58a6ff", background: "transparent" }}>
                          {isExpanded ? "▲ Less" : "▼ Details"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 ml-8 space-y-3">
                          <div className="rounded p-3" style={{ background: "#0d111722", border: "1px solid #21262d" }}>
                            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#e3b341" }}>Why This Matters</div>
                            <div className="text-sm" style={{ color: "#c9d1d9" }}>{item.why}</div>
                          </div>
                          <div className="rounded p-3" style={{ background: "#0d111722", border: "1px solid #21262d" }}>
                            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#58a6ff" }}>How To Do It</div>
                            <div className="text-sm whitespace-pre-wrap" style={{ color: "#c9d1d9" }}>{item.how}</div>
                          </div>
                          <div className="rounded p-3" style={{ background: "#0d111722", border: "1px solid #21262d" }}>
                            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#3fb950" }}>How To Verify</div>
                            <div className="text-sm" style={{ color: "#c9d1d9" }}>{item.verify}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="p-4 border-t" style={{ borderColor: "#30363d", background: "#161b22" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-xs" style={{ color: "#484f58" }}>
            UNCLASSIFIED // FOUO — RMR AI Agent Environment Checklist v1.0 — March 2026
          </div>
        </div>
      </div>
    </div>
  );
}
