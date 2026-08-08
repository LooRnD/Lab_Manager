// =============================================
//  LAB MANAGER — app.js
//  Firebase Firestore (compat SDK)
// =============================================

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyB4ufmaIuefOUXxnm_YDTmMQ9sh5uOZnuU",
    authDomain: "lab-manager-afb6b.firebaseapp.com",
    projectId: "lab-manager-afb6b",
    storageBucket: "lab-manager-afb6b.firebasestorage.app",
    messagingSenderId: "1073180345476",
    appId: "1:1073180345476:web:f2537195d98a19a96b6ed1",
    measurementId: "G-JZS62RWLTL"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =============================================
// STATE
// =============================================
let inventoryData  = [];
let projectsData   = [];
let deleteCallback = null;

// =============================================
// UTILITY HELPERS
// =============================================
function fmt(num) {
    if (num === undefined || num === null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function fmtNum(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

function toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    el.innerHTML = `<span>${icons[type] || '•'}</span> ${msg}`;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function categoryBadge(cat) {
    const map = {
        'MCU': 'badge-mcu', 'Passive': 'badge-passive',
        'Module': 'badge-module', 'Power': 'badge-power',
        'Display': 'badge-display', 'Connector': 'badge-connector',
        'Other': 'badge-other'
    };
    return `<span class="badge ${map[cat] || 'badge-other'}">${cat}</span>`;
}

function statusBadge(s) {
    const map = {
        'active':    '<span class="badge badge-active">Active</span>',
        'completed': '<span class="badge badge-completed">Completed</span>',
        'paused':    '<span class="badge badge-paused">Paused</span>'
    };
    return map[s] || `<span class="badge">${s}</span>`;
}

// =============================================
// NAVIGATION
// =============================================
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.dataset.target;
        navigate(target);
    });
});

function navigate(target) {
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const navEl = document.getElementById(`nav-${target}`);
    if (navEl) navEl.classList.add('active');
    const viewEl = document.getElementById(`view-${target}`);
    if (viewEl) viewEl.classList.remove('hidden');
    // Re-render on navigate
    if (target === 'reports') renderReports();
}

// =============================================
// SIDEBAR TOGGLE
// =============================================
const sidebar   = document.getElementById('sidebar');
const mainWrap  = document.querySelector('.main-wrap');

document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainWrap.classList.toggle('expanded');
});

// =============================================
// THEME TOGGLE
// =============================================
const themeBtn   = document.getElementById('theme-toggle');
const themeIcon  = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

const savedTheme = localStorage.getItem('labmgr-theme') || 'dark';
document.documentElement.dataset.theme = savedTheme;
updateThemeUI(savedTheme);

themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('labmgr-theme', next);
    updateThemeUI(next);
});

function updateThemeUI(theme) {
    if (theme === 'dark') {
        themeIcon.className = 'fa-solid fa-moon';
        themeLabel.textContent = 'Dark Mode';
    } else {
        themeIcon.className = 'fa-solid fa-sun';
        themeLabel.textContent = 'Light Mode';
    }
}

// =============================================
// DATE
// =============================================
const dateEl = document.getElementById('current-date');
const opts   = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
dateEl.textContent = new Date().toLocaleDateString('en-US', opts);

// =============================================
// MODAL HELPERS
// =============================================
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close buttons
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

// Click overlay to close
document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => {
        if (e.target === ov) ov.classList.remove('active');
    });
});

// =============================================
// FIRESTORE — INVENTORY
// =============================================
db.collection('inventory').orderBy('name').onSnapshot(snap => {
    inventoryData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderInventory();
    renderDashboard();
}, err => {
    console.error(err);
    document.getElementById('conn-status').innerHTML =
        '<span class="dot dot-red"></span> Offline';
});

// Add button
document.getElementById('btn-add-item').addEventListener('click', () => {
    document.getElementById('modal-item-title').textContent = 'Add Component';
    document.getElementById('form-item').reset();
    document.getElementById('item-doc-id').value = '';
    openModal('modal-item');
});

// Save inventory form
document.getElementById('form-item').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('btn-save-item');
    btn.textContent = 'Saving…';
    btn.disabled = true;

    const docId = document.getElementById('item-doc-id').value;
    const data  = {
        sku:      document.getElementById('item-sku').value.trim(),
        name:     document.getElementById('item-name').value.trim(),
        category: document.getElementById('item-category').value,
        qty:      parseInt(document.getElementById('item-qty').value) || 0,
        alertQty: parseInt(document.getElementById('item-alert-qty').value) || 0,
        unitPrice:parseFloat(document.getElementById('item-price').value) || 0,
        notes:    document.getElementById('item-notes').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (docId) {
            await db.collection('inventory').doc(docId).update(data);
            toast('Component updated!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('inventory').add(data);
            toast('Component added!');
        }
        closeModal('modal-item');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        btn.textContent = 'Save Component';
        btn.disabled = false;
    }
});

function editItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;
    document.getElementById('modal-item-title').textContent = 'Edit Component';
    document.getElementById('item-doc-id').value   = id;
    document.getElementById('item-sku').value      = item.sku || '';
    document.getElementById('item-name').value     = item.name || '';
    document.getElementById('item-category').value = item.category || 'Other';
    document.getElementById('item-qty').value      = item.qty ?? 0;
    document.getElementById('item-alert-qty').value= item.alertQty ?? 0;
    document.getElementById('item-price').value    = item.unitPrice ?? 0;
    document.getElementById('item-notes').value    = item.notes || '';
    openModal('modal-item');
}

function deleteItem(id) {
    const item = inventoryData.find(i => i.id === id);
    document.getElementById('confirm-message').textContent =
        `Delete "${item?.name}"? This cannot be undone.`;
    deleteCallback = async () => {
        await db.collection('inventory').doc(id).delete();
        toast('Component deleted.', 'info');
        closeModal('modal-confirm');
    };
    openModal('modal-confirm');
}

// =============================================
// RENDER INVENTORY
// =============================================
function renderInventory() {
    const search  = (document.getElementById('inv-search').value || '').toLowerCase();
    const catFil  = document.getElementById('inv-filter-cat').value;

    let data = inventoryData.filter(item => {
        const matchSearch = !search ||
            (item.name || '').toLowerCase().includes(search) ||
            (item.sku  || '').toLowerCase().includes(search);
        const matchCat = catFil === 'all' || item.category === catFil;
        return matchSearch && matchCat;
    });

    const tbody = document.getElementById('inv-tbody');
    const empty = document.getElementById('inv-empty-row');

    // Clear old rows (except empty)
    Array.from(tbody.querySelectorAll('tr.data-row')).forEach(r => r.remove());

    if (data.length === 0) {
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    data.forEach(item => {
        const isLow = item.qty <= item.alertQty;
        const totalVal = (item.qty || 0) * (item.unitPrice || 0);
        const tr = document.createElement('tr');
        tr.className = 'data-row';
        tr.innerHTML = `
            <td><code style="font-size:12px;opacity:.8">${item.sku || '—'}</code></td>
            <td><strong>${item.name}</strong>${item.notes ? `<br><span style="font-size:11px;color:var(--c-muted)">${item.notes}</span>` : ''}</td>
            <td>${categoryBadge(item.category)}</td>
            <td>
                <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${fmtNum(item.qty)}</span>
            </td>
            <td style="color:var(--c-muted)">${fmtNum(item.alertQty)}</td>
            <td>${fmt(item.unitPrice)}</td>
            <td>${fmt(totalVal)}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button class="btn-icon edit" onclick="editItem('${item.id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteItem('${item.id}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter/search listeners
document.getElementById('inv-search').addEventListener('input', renderInventory);
document.getElementById('inv-filter-cat').addEventListener('change', renderInventory);

// =============================================
// FIRESTORE — PROJECTS
// =============================================
db.collection('projects').orderBy('createdAt', 'desc').onSnapshot(snap => {
    projectsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProjects();
    renderDashboard();
    renderReports();
});

// Add project button
document.getElementById('btn-add-project').addEventListener('click', () => {
    document.getElementById('modal-project-title').textContent = 'New Project';
    document.getElementById('form-project').reset();
    document.getElementById('proj-doc-id').value = '';
    openModal('modal-project');
});

// Save project form
document.getElementById('form-project').addEventListener('submit', async e => {
    e.preventDefault();
    const docId   = document.getElementById('proj-doc-id').value;
    const revenue = parseFloat(document.getElementById('proj-revenue').value) || 0;
    const vatRate = parseInt(document.getElementById('proj-vat').value) || 0;
    const vatAmt  = revenue * (vatRate / 100);

    const data = {
        name:    document.getElementById('proj-name').value.trim(),
        client:  document.getElementById('proj-client').value.trim(),
        revenue: revenue,
        cost:    parseFloat(document.getElementById('proj-cost').value) || 0,
        vatRate: vatRate,
        vatAmt:  vatAmt,
        status:  document.getElementById('proj-status').value,
        desc:    document.getElementById('proj-desc').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (docId) {
            await db.collection('projects').doc(docId).update(data);
            toast('Project updated!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('projects').add(data);
            toast('Project created!');
        }
        closeModal('modal-project');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
});

function editProject(id) {
    const p = projectsData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-project-title').textContent = 'Edit Project';
    document.getElementById('proj-doc-id').value = id;
    document.getElementById('proj-name').value   = p.name    || '';
    document.getElementById('proj-client').value = p.client  || '';
    document.getElementById('proj-revenue').value= p.revenue || 0;
    document.getElementById('proj-cost').value   = p.cost    || 0;
    document.getElementById('proj-vat').value    = p.vatRate || 0;
    document.getElementById('proj-status').value = p.status  || 'active';
    document.getElementById('proj-desc').value   = p.desc    || '';
    openModal('modal-project');
}

function deleteProject(id) {
    const p = projectsData.find(x => x.id === id);
    document.getElementById('confirm-message').textContent =
        `Delete project "${p?.name}"? This cannot be undone.`;
    deleteCallback = async () => {
        await db.collection('projects').doc(id).delete();
        toast('Project deleted.', 'info');
        closeModal('modal-confirm');
    };
    openModal('modal-confirm');
}

// =============================================
// RENDER PROJECTS
// =============================================
function renderProjects() {
    const statusFil = document.getElementById('proj-filter-status').value;
    const grid   = document.getElementById('projects-grid');
    const emptyEl= document.getElementById('proj-empty');

    let data = projectsData.filter(p =>
        statusFil === 'all' || p.status === statusFil
    );

    // Clear old cards
    Array.from(grid.querySelectorAll('.project-card')).forEach(c => c.remove());

    if (data.length === 0) {
        emptyEl.style.display = '';
        return;
    }
    emptyEl.style.display = 'none';

    data.forEach(p => {
        const profit = (p.revenue || 0) - (p.cost || 0);
        const vat    = p.vatAmt || 0;

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="proj-card-header">
                <div>
                    <div class="proj-name">${p.name}</div>
                    <div class="proj-client">${p.client ? `👤 ${p.client}` : 'No client'}</div>
                    ${p.desc ? `<div style="font-size:12px;color:var(--c-muted);margin-top:4px">${p.desc}</div>` : ''}
                </div>
                <div>
                    ${statusBadge(p.status)}
                    <div class="proj-actions" style="margin-top:8px">
                        <button class="btn-icon edit" onclick="editProject('${p.id}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteProject('${p.id}')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="proj-finances">
                <div class="fin-row">
                    <span class="label">Revenue</span>
                    <span class="value" style="color:var(--c-green)">${fmt(p.revenue)}</span>
                </div>
                <div class="fin-row">
                    <span class="label">Cost</span>
                    <span class="value" style="color:var(--c-red)">${fmt(p.cost)}</span>
                </div>
                ${vat > 0 ? `
                <div class="fin-row">
                    <span class="label">VAT (${p.vatRate}%)</span>
                    <span class="value" style="color:var(--c-orange)">${fmt(vat)}</span>
                </div>` : ''}
                <div class="fin-row profit">
                    <span class="label">Profit</span>
                    <span class="value ${profit < 0 ? 'negative' : ''}">${fmt(profit)}</span>
                </div>
            </div>
        `;
        grid.insertBefore(card, emptyEl);
    });
}

document.getElementById('proj-filter-status').addEventListener('change', renderProjects);

// =============================================
// RENDER DASHBOARD
// =============================================
function renderDashboard() {
    // Inventory stats
    const totalQty  = inventoryData.reduce((s, i) => s + (i.qty || 0), 0);
    const totalVal  = inventoryData.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0);
    const lowItems  = inventoryData.filter(i => i.qty <= i.alertQty);

    document.getElementById('stat-total-items').textContent = fmtNum(totalQty);
    document.getElementById('stat-total-sku').textContent   = `${inventoryData.length} SKUs`;
    document.getElementById('stat-inv-value').textContent   = fmt(totalVal);
    document.getElementById('stat-low-stock').textContent   = lowItems.length;

    // Nav badge
    const badge = document.getElementById('nav-badge-low');
    if (lowItems.length > 0) {
        badge.style.display = '';
        badge.textContent   = lowItems.length;
    } else {
        badge.style.display = 'none';
    }

    // Projects
    const active  = projectsData.filter(p => p.status === 'active');
    const revenue = projectsData.reduce((s, p) => s + (p.revenue || 0), 0);
    document.getElementById('stat-active-projects').textContent = active.length;
    document.getElementById('stat-total-revenue').textContent   = `${fmt(revenue)} total revenue`;

    // Low stock quick table
    const lowSection = document.getElementById('low-stock-section');
    const lowTbody   = document.getElementById('low-stock-tbody');
    if (lowItems.length > 0) {
        lowSection.style.display = '';
        lowTbody.innerHTML = lowItems.map(i => `
            <tr>
                <td><code style="font-size:12px">${i.sku || '—'}</code></td>
                <td>${i.name}</td>
                <td>${categoryBadge(i.category)}</td>
                <td><span class="badge badge-low">${i.qty}</span></td>
                <td>${i.alertQty}</td>
            </tr>
        `).join('');
    } else {
        lowSection.style.display = 'none';
    }
}

// =============================================
// RENDER REPORTS
// =============================================
function renderReports() {
    const year  = parseInt(document.getElementById('report-year').value);
    const month = document.getElementById('report-month').value;

    let filtered = projectsData.filter(p => {
        if (!p.createdAt) return true; // include if no date
        const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        if (d.getFullYear() !== year) return false;
        if (month !== 'all' && d.getMonth() + 1 !== parseInt(month)) return false;
        return true;
    });

    const totRevenue = filtered.reduce((s, p) => s + (p.revenue || 0), 0);
    const totCost    = filtered.reduce((s, p) => s + (p.cost    || 0), 0);
    const totVat     = filtered.reduce((s, p) => s + (p.vatAmt  || 0), 0);
    const totProfit  = totRevenue - totCost;

    document.getElementById('rep-revenue').textContent = fmt(totRevenue);
    document.getElementById('rep-cost').textContent    = fmt(totCost);
    document.getElementById('rep-profit').textContent  = fmt(totProfit);
    document.getElementById('rep-vat').textContent     = fmt(totVat);

    const tbody = document.getElementById('report-tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-file-circle-xmark"></i><p>No projects in this period.</p></td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const profit = (p.revenue || 0) - (p.cost || 0);
        return `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.client || '—'}</td>
            <td>${statusBadge(p.status)}</td>
            <td style="color:var(--c-green)">${fmt(p.revenue)}</td>
            <td style="color:var(--c-red)">${fmt(p.cost)}</td>
            <td style="color:var(--c-orange)">${fmt(p.vatAmt)}</td>
            <td style="font-weight:600;color:${profit >= 0 ? 'var(--c-green)' : 'var(--c-red)'}">${fmt(profit)}</td>
        </tr>`;
    }).join('');
}

document.getElementById('report-year').addEventListener('change', renderReports);
document.getElementById('report-month').addEventListener('change', renderReports);

// =============================================
// EXPORT CSV
// =============================================
document.getElementById('btn-export-csv').addEventListener('click', () => {
    const year  = document.getElementById('report-year').value;
    const month = document.getElementById('report-month').value;

    let filtered = projectsData.filter(p => {
        if (!p.createdAt) return true;
        const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        if (d.getFullYear() !== parseInt(year)) return false;
        if (month !== 'all' && d.getMonth() + 1 !== parseInt(month)) return false;
        return true;
    });

    const header = ['Project Name', 'Client', 'Status', 'Revenue (VND)', 'Cost (VND)', 'VAT Rate (%)', 'VAT Amount (VND)', 'Profit (VND)'];
    const rows = filtered.map(p => [
        p.name, p.client || '', p.status,
        p.revenue || 0, p.cost || 0,
        p.vatRate || 0, p.vatAmt || 0,
        (p.revenue || 0) - (p.cost || 0)
    ]);

    const csv = [header, ...rows].map(r =>
        r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `lab-report-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported!');
});

// =============================================
// CONFIRM DELETE
// =============================================
document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
});

// Expose to inline onclick handlers
window.editItem     = editItem;
window.deleteItem   = deleteItem;
window.editProject  = editProject;
window.deleteProject = deleteProject;
