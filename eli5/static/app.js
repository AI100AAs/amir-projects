/**
 * ELI5 News Database - Frontend Application
 * Modern, feature-rich single-page app with graph visualization,
 * timeline, dashboard, dark mode, and comprehensive article management.
 */

// ─── State ─────────────────────────────────────────────────────────────────
const state = {
    articles: [],
    links: [],
    topics: [],
    currentView: 'list',
    darkMode: false,
    config: {},
    graphSimulation: null,
    selectedArticle: null
};

// ─── DOM Elements Cache ────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Initialization ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    loadConfig();
    loadArticles();
    initKeyboardShortcuts();
});

// ─── Theme ─────────────────────────────────────────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('eli5-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.darkMode = saved ? saved === 'dark' : prefersDark;
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    const label = $('.theme-label');
    if (label) label.textContent = state.darkMode ? 'Light' : 'Dark';
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('eli5-theme', state.darkMode ? 'dark' : 'light');
    applyTheme();
}

// ─── Event Listeners ─────────────────────────────────────────────────────
function initEventListeners() {
    // Navigation
    $$('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Theme toggle
    $('#theme-toggle')?.addEventListener('click', toggleTheme);

    // Add article modal
    $('#btn-add')?.addEventListener('click', openAddModal);
    $('.modal-overlay')?.addEventListener('click', closeAllModals);
    $$('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Tabs in add modal
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Forms
    $('#paste-form')?.addEventListener('submit', handlePasteSubmit);
    $('#url-form')?.addEventListener('submit', handleUrlSubmit);

    // Filters
    $('#search-filter')?.addEventListener('input', debounce(renderArticles, 200));
    $('#topic-filter')?.addEventListener('change', renderArticles);
    $('#sort-filter')?.addEventListener('change', renderArticles);

    // Import/Export
    $('#btn-export')?.addEventListener('click', doExport);
    $('#btn-import')?.addEventListener('click', openImportModal);
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const key = e.key.toLowerCase();
        if (key === 'n') { e.preventDefault(); openAddModal(); }
        else if (key === '1') switchView('list');
        else if (key === 'g') switchView('graph');
        else if (key === 't') switchView('timeline');
        else if (key === 'd') switchView('dashboard');
        else if (key === 'e') switchView('ethics');
        else if (e.shiftKey && key === 'd') { e.preventDefault(); toggleTheme(); }
        else if (key === 'escape') closeAllModals();
    });
}

// ─── View Switching ──────────────────────────────────────────────────────
function switchView(viewName) {
    state.currentView = viewName;

    // Update nav
    $$('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update views
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));

    // Update title
    const titles = {
        list: 'Articles',
        graph: 'Article Graph',
        timeline: 'Timeline',
        dashboard: 'Dashboard',
        ethics: 'Ethics Guide'
    };
    $('#page-title').textContent = titles[viewName] || 'ELI5 News DB';

    // Refresh view-specific content
    if (viewName === 'graph') renderGraph();
    if (viewName === 'timeline') renderTimeline();
    if (viewName === 'dashboard') renderDashboard();
}

// ─── Tab Switching ───────────────────────────────────────────────────────
function switchTab(tabName) {
    $$('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    $$('.tab-content').forEach(content => content.classList.toggle('active', content.id === `${tabName}-form`));
}

// ─── API Functions ─────────────────────────────────────────────────────────
async function api(method, endpoint, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(endpoint, opts);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
    return data;
}

async function loadConfig() {
    try {
        state.config = await api('GET', '/api/config');
        const dot = $('.status-dot');
        const text = $('.status-text');
        if (state.config.has_api_key) {
            dot.classList.add('ready');
            text.textContent = `${state.config.model}`;
        } else {
            text.textContent = 'Demo mode';
        }
    } catch (e) {
        console.error('Config load failed:', e);
    }
}

async function loadArticles() {
    try {
        state.articles = await api('GET', '/api/articles');
        state.links = await api('GET', '/api/links');

        // Extract topics
        const topicSet = new Set();
        state.articles.forEach(a => (a.topics || []).forEach(t => topicSet.add(t)));
        state.topics = Array.from(topicSet).sort();

        updateTopicFilter();
        renderArticles();
        $('#article-count').textContent = state.articles.length;
    } catch (e) {
        toast('Failed to load articles', 'error');
    }
}

// ─── Article CRUD ──────────────────────────────────────────────────────────
async function handlePasteSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
        const data = await api('POST', '/api/articles', {
            title: $('#title').value.trim(),
            text: $('#text').value.trim(),
            source_url: $('#source_url').value.trim()
        });

        toast('Article added and summarized!', 'success');
        $('#paste-form').reset();
        closeAddModal();
        await loadArticles();
        showArticleDetail(data.article.id);
    } catch (e) {
        toast(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function handleUrlSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
        const data = await api('POST', '/api/articles', {
            url: $('#article-url').value.trim()
        });

        toast('Article fetched and summarized!', 'success');
        $('#url-form').reset();
        closeAddModal();
        await loadArticles();
        showArticleDetail(data.article.id);
    } catch (e) {
        toast(e.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

async function deleteArticle(articleId) {
    if (!confirm('Delete this article permanently?')) return;
    try {
        await api('DELETE', `/api/articles/${articleId}`);
        toast('Article deleted', 'success');
        closeDetailModal();
        await loadArticles();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ─── Rendering ───────────────────────────────────────────────────────────
function updateTopicFilter() {
    const select = $('#topic-filter');
    const current = select.value;
    select.innerHTML = '<option value="">All Topics</option>';
    state.topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
    select.value = current;
}

function renderArticles() {
    const search = ($('#search-filter')?.value || '').toLowerCase().trim();
    const topic = $('#topic-filter')?.value || '';
    const sort = $('#sort-filter')?.value || 'newest';

    let filtered = [...state.articles];

    // Search filter
    if (search) {
        filtered = filtered.filter(a =>
            a.title.toLowerCase().includes(search) ||
            (a.eli5_summary || '').toLowerCase().includes(search) ||
            (a.topics || []).some(t => t.toLowerCase().includes(search))
        );
    }

    // Topic filter
    if (topic) {
        filtered = filtered.filter(a => (a.topics || []).includes(topic));
    }

    // Sort
    filtered.sort((a, b) => {
        if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'confidence') return b.confidence_level - a.confidence_level;
        if (sort === 'modification') return b.modification_level - a.modification_level;
        return 0;
    });

    const container = $('#articles-list');
    const emptyState = $('#list-empty');

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = filtered.map(article => {
        const confPct = Math.round((article.confidence_level || 0) * 100);
        const modPct = Math.round((article.modification_level || 0) * 100);
        const articleLinks = state.links.filter(l =>
            l.source_article_id === article.id || l.target_article_id === article.id
        );

        return `
            <div class="article-card" onclick="showArticleDetail(${article.id})">
                <div class="article-card-header">
                    <div class="article-card-title">${esc(article.title)}</div>
                    <div class="confidence-pill">
                        <span class="pill pill-confidence">${confPct}% sure</span>
                        <span class="pill pill-modification">${modPct}% mod</span>
                    </div>
                </div>
                <div class="article-card-meta">
                    <span>${fmtDate(article.created_at)}</span>
                    <span>${article.word_count || 0} words</span>
                    <span>${article.reading_time || 1} min read</span>
                </div>
                <div class="article-topics">
                    ${(article.topics || []).map(t => `<span class="topic-tag">${esc(t)}</span>`).join('')}
                </div>
                <div class="article-preview">${esc(article.eli5_summary || 'Processing...')}</div>
                ${articleLinks.length > 0 ? `
                <div class="article-links-preview">
                    ${articleLinks.slice(0, 3).map(l => `
                        <span class="link-badge link-${l.link_type}">${l.link_type}</span>
                    `).join('')}
                    ${articleLinks.length > 3 ? `<span class="link-badge link-related">+${articleLinks.length - 3} more</span>` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ─── Graph Visualization ───────────────────────────────────────────────────
function renderGraph() {
    const svg = $('#graph-svg');
    if (!svg) return;

    if (state.articles.length < 2) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="var(--text-tertiary)" font-size="14">Add at least 2 articles to see connections</text>';
        return;
    }

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Build nodes and edges
    const nodes = state.articles.map((a, i) => ({
        id: a.id,
        title: a.title,
        x: width / 2 + Math.cos(i * 2 * Math.PI / state.articles.length) * 150,
        y: height / 2 + Math.sin(i * 2 * Math.PI / state.articles.length) * 150,
        vx: 0, vy: 0,
        radius: Math.max(20, Math.min(40, 20 + (a.word_count || 0) / 50))
    }));

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    const edges = state.links.map(l => ({
        source: nodeMap[l.source_article_id],
        target: nodeMap[l.target_article_id],
        type: l.link_type,
        confidence: l.confidence || 0.5
    })).filter(e => e.source && e.target);

    // Simple force-directed simulation
    let iteration = 0;
    const maxIterations = 100;

    function step() {
        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[j].x - nodes[i].x;
                const dy = nodes[j].y - nodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 3000 / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                nodes[i].vx -= fx;
                nodes[i].vy -= fy;
                nodes[j].vx += fx;
                nodes[j].vy += fy;
            }
        }

        // Attraction along edges
        edges.forEach(e => {
            const dx = e.target.x - e.source.x;
            const dy = e.target.y - e.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 120;
            const force = (dist - targetDist) * 0.01;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            e.source.vx += fx;
            e.source.vy += fy;
            e.target.vx -= fx;
            e.target.vy -= fy;
        });

        // Center gravity
        nodes.forEach(n => {
            n.vx += (width / 2 - n.x) * 0.001;
            n.vy += (height / 2 - n.y) * 0.001;
            n.vx *= 0.9;
            n.vy *= 0.9;
            n.x += n.vx;
            n.y += n.vy;
            n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
            n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
        });

        drawGraph(svg, nodes, edges, width, height);

        iteration++;
        if (iteration < maxIterations) {
            requestAnimationFrame(step);
        }
    }

    step();
}

function drawGraph(svg, nodes, edges, width, height) {
    const edgeColors = {
        update: '#3b82f6',
        contradiction: '#ef4444',
        related: '#a855f7',
        semantic: '#10b981',
        similar_topic: '#a855f7'
    };

    let html = '';

    // Edges
    edges.forEach(e => {
        const color = edgeColors[e.type] || '#94a3b8';
        const opacity = 0.3 + (e.confidence * 0.5);
        html += `<line x1="${e.source.x}" y1="${e.source.y}" x2="${e.target.x}" y2="${e.target.y}" stroke="${color}" stroke-width="2" opacity="${opacity}" class="graph-edge" />`;
    });

    // Nodes
    nodes.forEach(n => {
        html += `
            <g class="graph-node" onclick="showArticleDetail(${n.id})" style="cursor:pointer">
                <circle cx="${n.x}" cy="${n.y}" r="${n.radius}" fill="var(--accent)" opacity="0.85" stroke="var(--bg-surface)" stroke-width="3" />
                <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="white" font-size="11" font-weight="600" font-family="var(--font-sans)">${n.id}</text>
                <text x="${n.x}" y="${n.y + n.radius + 14}" text-anchor="middle" class="graph-label">${esc(n.title).substring(0, 25)}${n.title.length > 25 ? '...' : ''}</text>
            </g>
        `;
    });

    svg.innerHTML = html;
}

// ─── Timeline ──────────────────────────────────────────────────────────────
function renderTimeline() {
    const container = $('#timeline-container');
    if (state.articles.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No articles yet. Add your first article!</p></div>';
        return;
    }

    const sorted = [...state.articles].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    container.innerHTML = sorted.map(article => `
        <div class="timeline-item" onclick="showArticleDetail(${article.id})">
            <div class="timeline-date">${fmtDate(article.created_at)}</div>
            <div class="timeline-title">${esc(article.title)}</div>
            <div class="timeline-summary">${esc(article.eli5_summary || '')}</div>
            <div class="timeline-topics">
                ${(article.topics || []).map(t => `<span class="topic-tag">${esc(t)}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// ─── Dashboard ────────────────────────────────────────────────────────────
async function renderDashboard() {
    try {
        const stats = await api('GET', '/api/stats');
        const topics = await api('GET', '/api/topics');

        $('#dash-total').textContent = stats.total_articles;
        $('#dash-links').textContent = stats.total_links;
        $('#dash-confidence').textContent = `${Math.round(stats.avg_confidence * 100)}%`;
        $('#dash-mod').textContent = `${Math.round(stats.avg_modification * 100)}%`;

        // Topic bars
        const topicEntries = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const maxCount = topicEntries.length > 0 ? topicEntries[0][1] : 1;

        $('#topic-bars').innerHTML = topicEntries.map(([topic, count]) => `
            <div class="topic-bar">
                <span class="topic-bar-label">${esc(topic)}</span>
                <div class="topic-bar-track">
                    <div class="topic-bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
                </div>
                <span class="topic-bar-count">${count}</span>
            </div>
        `).join('');

        // Recent activity
        const recent = [...state.articles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
        $('#activity-list').innerHTML = recent.map(a => `
            <div class="activity-item" onclick="showArticleDetail(${a.id})">
                <span>${esc(a.title).substring(0, 50)}${a.title.length > 50 ? '...' : ''}</span>
                <time>${fmtDate(a.created_at)}</time>
            </div>
        `).join('');
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// ─── Modals ───────────────────────────────────────────────────────────────
function openAddModal() {
    $('#add-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openImportModal() {
    $('#import-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAddModal() {
    $('#add-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function closeImportModal() {
    $('#import-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function closeDetailModal() {
    $('#detail-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function closeAllModals() {
    closeAddModal();
    closeDetailModal();
    closeImportModal();
}

async function showArticleDetail(articleId) {
    try {
        const data = await api('GET', `/api/articles/${articleId}`);
        const article = data.article;
        const links = data.links || [];

        $('#detail-title').textContent = article.title;

        const ethical = article.ethical_flags || {};

        $('#detail-body').innerHTML = `
            <div class="detail-meta">
                <span>${fmtDate(article.created_at)}</span>
                <span>${article.word_count || 0} words</span>
                <span>${article.reading_time || 1} min read</span>
                ${article.source_url ? `<a href="${esc(article.source_url)}" target="_blank" class="source-link">View Original Source ↗</a>` : ''}
            </div>

            <div class="detail-section">
                <h3>ELI5 Summary</h3>
                <div class="eli5-box">${esc(article.eli5_summary || 'No summary available.')}</div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-tertiary);">
                    <strong style="color: var(--success)">${Math.round((article.confidence_level || 0)*100)}% confidence</strong> in accuracy
                    · <strong style="color: var(--warning)">${Math.round((article.modification_level || 0)*100)}% modified</strong> from original
                </div>
            </div>

            <div class="detail-section">
                <h3>Topics</h3>
                <div class="article-topics">
                    ${(article.topics || []).map(t => `<span class="topic-tag">${esc(t)}</span>`).join('')}
                </div>
            </div>

            ${links.length > 0 ? `
            <div class="detail-section">
                <h3>Connections (${links.length})</h3>
                <div class="detail-links">
                    ${links.map(l => `
                        <span class="link-badge link-${l.link_type}">
                            ${l.link_type}: ${esc(l.description)} (${Math.round((l.confidence || 0)*100)}%)
                        </span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <h3>Original Text</h3>
                <div class="original-box">${esc(article.original_text)}</div>
            </div>

            <div class="detail-section">
                <h3>Ethical Considerations</h3>
                <div class="ethical-box">
                    <div class="ethical-item">
                        <h4>Potential Bias</h4>
                        <p>${esc(ethical.potential_bias || 'No analysis available.')}</p>
                    </div>
                    <div class="ethical-item">
                        <h4>Missing Context</h4>
                        <p>${esc(ethical.missing_context || 'No analysis available.')}</p>
                    </div>
                    <div class="ethical-item">
                        <h4>Reliability Concern</h4>
                        <p>${esc(ethical.reliability_concern || 'Please verify independently.')}</p>
                    </div>
                    <div class="ethical-item">
                        <h4>Echo Chamber Risk</h4>
                        <p>${esc(ethical.echo_chamber_risk || 'Consider seeking diverse sources.')}</p>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 8px;">
                <button class="delete-btn" onclick="deleteArticle(${article.id})">Delete Article</button>
            </div>
        `;

        $('#detail-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ─── Import / Export ──────────────────────────────────────────────────────
async function doExport() {
    try {
        const data = await api('GET', '/api/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eli5-news-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Export downloaded!', 'success');
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function doImport() {
    const raw = $('#import-data').value.trim();
    if (!raw) return;

    try {
        const data = JSON.parse(raw);
        const result = await api('POST', '/api/import', data);
        toast(`Imported ${result.imported_articles} articles and ${result.imported_links} links`, 'success');
        closeImportModal();
        $('#import-data').value = '';
        await loadArticles();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function debounce(fn, ms) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
}

function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text) text.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
}

function toast(message, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions globally accessible for onclick handlers
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.closeDetailModal = closeDetailModal;
window.closeImportModal = closeImportModal;
window.showArticleDetail = showArticleDetail;
window.deleteArticle = deleteArticle;
window.doImport = doImport;
