const http = require('http');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PORT = 3100;
const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT, 'logs');
const AGENTS_DIR = path.join(ROOT, 'agents');
const INBOX_DIR = path.join(ROOT, 'inbox');
const DRAFTS_DIR = path.join(ROOT, 'drafts');
const COMPANY_FILE = path.join(ROOT, 'company.yaml');

function readFileOrNull(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function getAgents() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml'));
  return files.map(f => {
    const raw = readFileOrNull(path.join(AGENTS_DIR, f));
    if (!raw) return null;
    try {
      const config = yaml.load(raw);
      const name = config.name || f.replace('.yaml', '');
      const latestLog = readFileOrNull(path.join(LOGS_DIR, `${name}-latest.md`));
      const inbox = readFileOrNull(path.join(INBOX_DIR, `${name}.md`));

      // Parse status from latest log
      let status = 'unknown', lastRun = null, summary = '';
      if (latestLog) {
        const statusMatch = latestLog.match(/## Status:\s*(\w+)/);
        if (statusMatch) status = statusMatch[1];
        const dateMatch = latestLog.match(/# .+ — (\d{4}-\d{2}-\d{2})/);
        if (dateMatch) lastRun = dateMatch[1];
        const summaryMatch = latestLog.match(/## Summary\n([\s\S]*?)(?=\n##|$)/);
        if (summaryMatch) summary = summaryMatch[1].trim();
      }

      return {
        name,
        title: config.title || name,
        enabled: config.enabled !== false,
        model: config.model_tier || 'sonnet',
        budget: config.budget?.monthly_usd || 0,
        schedule: config.schedule?.heartbeat || 'N/A',
        status,
        lastRun,
        summary,
        hasInbox: !!inbox,
        inboxPreview: inbox ? inbox.substring(0, 200) : null,
        latestLog: latestLog ? latestLog.substring(0, 1000) : null,
      };
    } catch { return null; }
  }).filter(Boolean);
}

function getCompany() {
  const raw = readFileOrNull(COMPANY_FILE);
  if (!raw) return {};
  try { return yaml.load(raw); } catch { return {}; }
}

function getDrafts() {
  try {
    return fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md')).map(f => ({
      name: f,
      content: readFileOrNull(path.join(DRAFTS_DIR, f))?.substring(0, 500),
    }));
  } catch { return []; }
}

function getRecentLogs(agentName, limit = 5) {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`${agentName}-`) && f !== `${agentName}-latest.md` && f.endsWith('.md'))
      .sort().reverse().slice(0, limit);
    return files.map(f => ({ name: f, content: readFileOrNull(path.join(LOGS_DIR, f)) }));
  } catch { return []; }
}

function renderHTML(agents, company, drafts) {
  const statusIcon = s => s === 'ok' ? '🟢' : s === 'warning' ? '🟡' : s === 'error' ? '🔴' : '⚪';
  const enabledBadge = e => e ? '' : '<span style="background:#ff4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px">PAUSED</span>';

  const agentCards = agents.map(a => `
    <div class="card ${a.enabled ? '' : 'disabled'}">
      <div class="card-header">
        <span class="status-icon">${statusIcon(a.status)}</span>
        <strong>${a.title}</strong>
        ${enabledBadge(a.enabled)}
        <span class="model-badge">${a.model}</span>
      </div>
      <div class="card-meta">
        <span>🕐 ${a.schedule}</span>
        <span>💰 $${a.budget}/mo</span>
        <span>📅 ${a.lastRun || 'Never'}</span>
        ${a.hasInbox ? '<span class="inbox-badge">📥 INBOX</span>' : ''}
      </div>
      <div class="card-summary">${a.summary || 'No recent activity'}</div>
      ${a.latestLog ? `<details><summary>Full Log</summary><pre>${escapeHtml(a.latestLog)}</pre></details>` : ''}
      ${a.inboxPreview ? `<details><summary>📥 Inbox</summary><pre>${escapeHtml(a.inboxPreview)}</pre></details>` : ''}
    </div>
  `).join('');

  const growth = company.growth || {};
  const kpi = company.kpi_targets || {};
  const phase = growth.current_phase || 'unknown';
  const milestones = growth.milestones || {};

  const draftList = drafts.length ? drafts.map(d => `
    <details><summary>📝 ${d.name}</summary><pre>${escapeHtml(d.content || '')}</pre></details>
  `).join('') : '<p style="color:#888">No drafts</p>';

  return `<!DOCTYPE html>
<html>
<head>
<title>Paperclip Dashboard — Taste Roulette</title>
<meta charset="utf-8">
<meta http-equiv="refresh" content="30">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0F0F1A; color: #E0E0E0; font-family: -apple-system, sans-serif; padding: 20px; }
  h1 { color: #6C5CE7; margin-bottom: 8px; }
  .subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: #1A1A2E; border: 1px solid #2A2A3E; border-radius: 12px; padding: 16px; }
  .card.disabled { opacity: 0.5; }
  .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 16px; }
  .card-meta { display: flex; gap: 16px; font-size: 12px; color: #888; margin-bottom: 8px; flex-wrap: wrap; }
  .card-summary { font-size: 13px; color: #AAA; line-height: 1.5; }
  .status-icon { font-size: 14px; }
  .model-badge { background: #2A2A3E; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: auto; }
  .inbox-badge { background: #6C5CE7; color: #fff; padding: 2px 6px; border-radius: 4px; }
  details { margin-top: 8px; }
  details summary { cursor: pointer; font-size: 12px; color: #6C5CE7; }
  pre { background: #0a0a14; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; white-space: pre-wrap; margin-top: 8px; color: #CCC; max-height: 300px; overflow-y: auto; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .kpi-card { background: #1A1A2E; border: 1px solid #2A2A3E; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-value { font-size: 24px; font-weight: bold; color: #6C5CE7; }
  .kpi-label { font-size: 11px; color: #888; margin-top: 4px; }
  h2 { color: #6C5CE7; margin-bottom: 16px; font-size: 18px; }
  .section { margin-bottom: 32px; }
  .phase-badge { display: inline-block; background: #6C5CE7; color: #fff; padding: 4px 12px; border-radius: 16px; font-size: 13px; margin-bottom: 16px; }
</style>
</head>
<body>
  <h1>🎲 Paperclip Dashboard</h1>
  <p class="subtitle">Taste Roulette — AI Agent Operations | Auto-refreshes every 30s</p>

  <div class="section">
    <span class="phase-badge">📍 ${phase}</span>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">${agents.filter(a => a.enabled).length}/${agents.length}</div><div class="kpi-label">Active Agents</div></div>
      <div class="kpi-card"><div class="kpi-value">${agents.filter(a => a.status === 'ok').length}</div><div class="kpi-label">Healthy</div></div>
      <div class="kpi-card"><div class="kpi-value">${agents.filter(a => a.hasInbox).length}</div><div class="kpi-label">Pending Inbox</div></div>
      <div class="kpi-card"><div class="kpi-value">$${agents.reduce((s, a) => s + a.budget, 0)}</div><div class="kpi-label">Monthly Budget</div></div>
      <div class="kpi-card"><div class="kpi-value">${(kpi.d7_retention * 100 || 0)}%</div><div class="kpi-label">D7 Retention Target</div></div>
      <div class="kpi-card"><div class="kpi-value">${(kpi.surprise_rate * 100 || 0)}%</div><div class="kpi-label">Surprise Rate Target</div></div>
      <div class="kpi-card"><div class="kpi-value">${kpi.pool_size_min || 0}</div><div class="kpi-label">Min Pool Size</div></div>
      <div class="kpi-card"><div class="kpi-value">${milestones.month1?.users || '?'}</div><div class="kpi-label">Month 1 Target</div></div>
    </div>
  </div>

  <div class="section">
    <h2>🤖 Agents</h2>
    <div class="grid">${agentCards}</div>
  </div>

  <div class="section">
    <h2>📝 Social Drafts</h2>
    ${draftList}
  </div>

  <p style="color:#444;font-size:11px;text-align:center;margin-top:40px">
    Paperclip v0.1 — localhost:${PORT} — Last refreshed: ${new Date().toLocaleString()}
  </p>
</body>
</html>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAgents()));
  } else if (req.url?.startsWith('/api/logs/')) {
    const agent = req.url.split('/api/logs/')[1];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRecentLogs(agent)));
  } else {
    const agents = getAgents();
    const company = getCompany();
    const drafts = getDrafts();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderHTML(agents, company, drafts));
  }
});

server.listen(PORT, () => {
  console.log(`🎲 Paperclip Dashboard running at http://localhost:${PORT}`);
});
