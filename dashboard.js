// QwenCode Dashboard Server
// 实时可视化 Qwen Code 工作进度
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 9876;
const STATUS_DIR = path.join(process.env.USERPROFILE, '.qwencode');
const STATUS_FILE = path.join(STATUS_DIR, 'status.json');
const HISTORY_DIR = path.join(STATUS_DIR, 'history');

// ── 读取状态 ──────────────────────────────────
function readStatus() {
    try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); }
    catch { return null; }
}

function readHistory() {
    try {
        const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            try { return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), 'utf8')); }
            catch { return null; }
        }).filter(Boolean).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20);
    } catch { return []; }
}

function getOllamaStatus() {
    try {
        const models = execSync('ollama list', { encoding: 'utf8', timeout: 5000 });
        const ps = execSync('ollama ps', { encoding: 'utf8', timeout: 5000 });
        return { models: models.trim(), running: ps.trim() };
    } catch { return { models: '离线', running: '离线' }; }
}

// ── 路由 ──────────────────────────────────────
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // API: 当前任务状态
    if (req.url === '/api/status') {
        const status = readStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(status || { phase: 'idle', message: '等待任务...', progress: 0 }));
    }

    // API: 历史任务
    if (req.url === '/api/history') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(readHistory()));
    }

    // API: Ollama 状态
    if (req.url === '/api/ollama') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(getOllamaStatus()));
    }

    // 仪表盘页面
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(DASHBOARD_HTML);
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

// ── 仪表盘 HTML ───────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QwenCode Bridge · 工作进度</title>
<style>
  :root {
    --bg: #0d1117;
    --card: #161b22;
    --border: #30363d;
    --text: #c9d1d9;
    --muted: #8b949e;
    --green: #3fb950;
    --blue: #58a6ff;
    --orange: #d2991d;
    --red: #f85149;
    --purple: #a371f7;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 24px;
  }
  .container { max-width: 900px; margin: 0 auto; }

  /* 头部 */
  .header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .header h1 { font-size: 1.5rem; font-weight: 600; }
  .header .badge {
    font-size: 0.75rem; padding: 3px 10px; border-radius: 20px;
    font-weight: 500;
  }
  .badge-online { background: #1a3a1a; color: var(--green); }
  .badge-offline { background: #3a1a1a; color: var(--red); }
  .badge-running { background: #1a2a3a; color: var(--blue); animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* 主状态卡片 */
  .status-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px;
    margin-bottom: 20px;
  }
  .status-card.idle { border-color: var(--border); }
  .status-card.running { border-color: var(--blue); }
  .status-card.done { border-color: var(--green); }
  .status-card.failed { border-color: var(--red); }

  .phase-label {
    font-size: 0.8rem; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .task-prompt {
    font-size: 1.05rem; color: var(--text);
    margin-bottom: 16px; line-height: 1.5;
  }
  .task-meta {
    display: flex; gap: 20px; flex-wrap: wrap;
    font-size: 0.8rem; color: var(--muted);
    margin-bottom: 20px;
  }
  .task-meta span { display: flex; align-items: center; gap: 4px; }

  /* 进度条 */
  .progress-bar {
    width: 100%; height: 8px;
    background: var(--border); border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 4px;
    transition: width 0.5s ease, background 0.3s ease;
  }
  .progress-fill.running { background: linear-gradient(90deg, var(--blue), var(--purple)); }
  .progress-fill.done { background: var(--green); }
  .progress-fill.failed { background: var(--red); }
  .progress-fill.idle { background: var(--muted); width: 0%; }

  /* 步骤指示器 */
  .steps {
    display: flex; gap: 8px; margin-top: 16px;
  }
  .step {
    flex: 1; text-align: center; font-size: 0.7rem;
    padding: 8px 4px; border-radius: 6px;
    background: var(--bg); color: var(--muted);
    transition: all 0.3s;
  }
  .step.active { background: #1a2a3a; color: var(--blue); font-weight: 600; }
  .step.done { background: #1a3a1a; color: var(--green); }
  .step.failed { background: #3a1a1a; color: var(--red); }

  /* 历史列表 */
  .history-title { font-size: 1rem; margin-bottom: 12px; color: var(--muted); }
  .history-list { display: flex; flex-direction: column; gap: 8px; }
  .history-item {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; padding: 12px 16px;
    font-size: 0.85rem; display: flex; justify-content: space-between;
    align-items: center; transition: border-color 0.2s;
  }
  .history-item:hover { border-color: var(--muted); }
  .history-item .prompt { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 12px; }
  .history-item .time { color: var(--muted); font-size: 0.75rem; white-space: nowrap; }
  .history-item .exit-ok { color: var(--green); }
  .history-item .exit-err { color: var(--red); }

  /* 空状态 */
  .empty { text-align: center; color: var(--muted); padding: 40px; }
  .empty-icon { font-size: 3rem; margin-bottom: 10px; }

  /* 响应式 */
  @media (max-width: 600px) {
    body { padding: 12px; }
    .status-card { padding: 16px; }
    .steps { flex-wrap: wrap; }
    .step { flex: 1 1 40%; }
  }
</style>
</head>
<body>
<div class="container">
  <!-- 头部 -->
  <div class="header">
    <h1>⚡ QwenCode Bridge</h1>
    <span id="globalBadge" class="badge badge-online">● 就绪</span>
  </div>

  <!-- 主状态卡片 -->
  <div id="statusCard" class="status-card idle">
    <div class="phase-label" id="phaseLabel">等待任务</div>
    <div class="task-prompt" id="taskPrompt">尚未开始任务。在终端运行 qwencode.ps1 启动工作流。</div>
    <div class="task-meta">
      <span>📦 <span id="metaModel">-</span></span>
      <span>📂 <span id="metaDir">-</span></span>
      <span>⏱ <span id="metaTime">-</span></span>
      <span>🆔 <span id="metaId">-</span></span>
    </div>
    <div class="progress-bar">
      <div id="progressFill" class="progress-fill idle"></div>
    </div>
    <div class="steps" id="steps">
      <div class="step" data-step="init">🔌 初始化</div>
      <div class="step" data-step="check">✅ 检查</div>
      <div class="step" data-step="connect">🔗 连接</div>
      <div class="step" data-step="model">🧠 模型</div>
      <div class="step" data-step="running">⚡ 执行</div>
      <div class="step" data-step="done">🏁 完成</div>
    </div>
  </div>

  <!-- 历史记录 -->
  <div class="history-title">📋 任务历史</div>
  <div class="history-list" id="historyList">
    <div class="empty"><div class="empty-icon">📭</div>暂无记录</div>
  </div>
</div>

<script>
const STATUS_API = '/api/status';
const HISTORY_API = '/api/history';
let lastTaskId = null;

const PHASES = ['init','check','connect','model','running','done'];

async function refresh() {
  try {
    const [statusRes, historyRes] = await Promise.all([
      fetch(STATUS_API), fetch(HISTORY_API)
    ]);
    const status = await statusRes.json();
    const history = await historyRes.json();

    if (!status) return;
    renderStatus(status);
    if (status.taskId !== lastTaskId || !document.querySelector('.history-item')) {
      renderHistory(history);
      lastTaskId = status.taskId;
    }
  } catch(e) { console.error(e); }
}

function renderStatus(s) {
  const card = document.getElementById('statusCard');
  const fill = document.getElementById('progressFill');
  const badge = document.getElementById('globalBadge');

  // 卡片样式
  card.className = 'status-card ' + (s.phase === 'done' ? 'done' : s.phase === 'failed' ? 'failed' : s.phase === 'idle' ? 'idle' : 'running');

  // 阶段标签
  const labels = { idle:'💤 空闲', init:'🔌 初始化', check:'✅ 依赖检查', connect:'🔗 连接服务', model:'🧠 加载模型', running:'⚡ 执行中', done:'✅ 完成', failed:'❌ 失败', error:'❌ 错误' };
  document.getElementById('phaseLabel').textContent = labels[s.phase] || s.phase;

  // 任务描述
  document.getElementById('taskPrompt').textContent = s.prompt || '等待新任务...';

  // 元数据
  document.getElementById('metaModel').textContent = s.model || '-';
  document.getElementById('metaDir').textContent = s.workDir || '-';
  document.getElementById('metaTime').textContent = s.elapsed || s.updatedAt || '-';
  document.getElementById('metaId').textContent = (s.taskId || '').slice(-12) || '-';

  // 进度条
  fill.style.width = (s.progress || 0) + '%';
  fill.className = 'progress-fill ' + (s.phase === 'done' ? 'done' : s.phase === 'failed' ? 'failed' : s.phase === 'idle' ? 'idle' : 'running');

  // 全局徽章
  if (s.phase === 'running') { badge.textContent = '◉ 执行中'; badge.className = 'badge badge-running'; }
  else if (s.phase === 'done') { badge.textContent = '● 就绪'; badge.className = 'badge badge-online'; }
  else if (s.phase === 'failed') { badge.textContent = '● 异常'; badge.className = 'badge badge-offline'; }
  else { badge.textContent = '● 就绪'; badge.className = 'badge badge-online'; }

  // 步骤指示器
  const stepIdx = PHASES.indexOf(s.phase);
  document.querySelectorAll('.step').forEach((el, i) => {
    el.className = 'step';
    if (s.phase === 'failed') {
      if (i <= Math.max(0, stepIdx)) el.classList.add('failed');
    } else if (s.phase === 'done') {
      el.classList.add('done');
    } else if (i < stepIdx) {
      el.classList.add('done');
    } else if (i === stepIdx && stepIdx >= 0) {
      el.classList.add('active');
    }
  });
}

function renderHistory(items) {
  const list = document.getElementById('historyList');
  if (!items || !items.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>暂无记录</div>';
    return;
  }
  list.innerHTML = items.map(h => {
    const isOk = h.exitCode === 0;
    const shortPrompt = (h.prompt || '').substring(0, 60);
    const time = (h.startedAt || '').replace('T',' ').substring(5, 16);
    return '<div class="history-item">' +
      '<span class="prompt" title="' + (h.prompt||'').replace(/"/g,'&quot;') + '">' + shortPrompt + '</span>' +
      '<span class="time">' + time + '&nbsp;</span>' +
      '<span class="' + (isOk ? 'exit-ok' : 'exit-err') + '">' + (isOk ? '✓' : '✗ ' + h.exitCode) + '</span>' +
      '</div>';
  }).join('');
}

// 每秒刷新
refresh();
setInterval(refresh, 1000);
</script>
</body>
</html>`;

// ── 启动 ──────────────────────────────────────
server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║  QwenCode Bridge · Dashboard        ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  http://localhost:${PORT}                ║`);
    console.log('  ║  Ctrl+C 停止                         ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
    console.log('  等待 qwencode.ps1 启动任务...');
    console.log('');
});
