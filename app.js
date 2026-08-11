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
        // Passive
        'Resistor':   'badge-resistor',
        'Capacitor':  'badge-capacitor',
        'Inductor':   'badge-inductor',
        'Transformer':'badge-transformer',
        'Crystal':    'badge-crystal',
        'Fuse':       'badge-fuse',
        // Active
        'Diode':      'badge-diode',
        'LED':        'badge-led',
        'Transistor': 'badge-transistor',
        'MOSFET':     'badge-mosfet',
        'Optocoupler':'badge-optocoupler',
        'OpAmp':      'badge-opamp',
        'ICLogic':    'badge-iclogic',
        'ICDriver':   'badge-icdriver',
        'Memory':     'badge-memory',
        'MCU':        'badge-mcu',
        'Power':      'badge-power',
        // Modules
        'Module':     'badge-module',
        'Sensor':     'badge-sensor',
        'Wireless':   'badge-wireless',
        'Display':    'badge-display',
        // Electro
        'Relay':      'badge-relay',
        'Switch':     'badge-switch',
        'Motor':      'badge-motor',
        'Connector':  'badge-connector',
        // Hardware
        'Battery':    'badge-battery',
        'PCB':        'badge-pcb',
        'Board':      'badge-board',
        'Wire':       'badge-wire',
        'Consumable': 'badge-consumable',
        'Tool':       'badge-tool',
        'Other':      'badge-other'
    };
    const labels = {
        'Resistor': 'Resistor', 'Capacitor': 'Capacitor', 'Inductor': 'Inductor', 
        'Transformer': 'Transformer', 'Crystal': 'Crystal', 'Fuse': 'Fuse',
        'Diode': 'Diode', 'LED': 'LED', 'Transistor': 'Transistor', 'MOSFET': 'MOSFET', 
        'Optocoupler': 'Optocoupler', 'OpAmp': 'Op-Amp', 'ICLogic': 'IC Logic', 
        'ICDriver': 'IC Driver', 'Memory': 'Memory', 'MCU': 'MCU', 'Power': 'Power IC',
        'Module': 'Module', 'Sensor': 'Sensor', 'Wireless': 'Wireless', 'Display': 'Display',
        'Relay': 'Relay', 'Switch': 'Switch', 'Motor': 'Motor', 'Connector': 'Connector',
        'Battery': 'Battery', 'PCB': 'PCB', 'Board': 'Dev Board', 'Wire': 'Wire', 
        'Consumable': 'Consumable', 'Tool': 'Tool', 'Other': 'Other'
    };
    return `<span class="badge ${map[cat] || 'badge-other'}">${labels[cat] || cat}</span>`;
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

// Click overlay to close (DISABLED to prevent accidental data loss)
// document.querySelectorAll('.modal-overlay').forEach(ov => {
//     ov.addEventListener('click', e => {
//         if (e.target === ov) ov.classList.remove('active');
//     });
// });

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
    maybeRefreshPaymentsModal();
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

    const data = {
        name:    document.getElementById('proj-name').value.trim(),
        client:  document.getElementById('proj-client').value.trim(),
        location: document.getElementById('proj-location').value,
        revenue: revenue,
        clientAdvance: parseFloat(document.getElementById('proj-client-advance').value) || 0,
        cost:    parseFloat(document.getElementById('proj-cost').value) || 0,
        type:    document.getElementById('proj-type').value,
        status:  document.getElementById('proj-status').value,
        completionDate: document.getElementById('proj-completion-date').value,
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
    document.getElementById('proj-location').value = p.location || 'domestic';
    document.getElementById('proj-revenue').value= p.revenue || 0;
    document.getElementById('proj-client-advance').value= p.clientAdvance || 0;
    document.getElementById('proj-cost').value   = p.cost    || 0;
    document.getElementById('proj-type').value   = p.type    || 'fixed';
    document.getElementById('proj-status').value = p.status  || 'active';
    document.getElementById('proj-completion-date').value = p.completionDate || '';
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

        let typeBadge = '';
        if (p.type === 'hourly') typeBadge = '<span class="badge badge-hourly"><i class="fa-solid fa-clock"></i> Hourly</span>';
        else if (p.type === 'parttime') typeBadge = '<span class="badge badge-parttime"><i class="fa-solid fa-calendar-week"></i> Part-time</span>';
        else typeBadge = '<span class="badge badge-fixed"><i class="fa-solid fa-box"></i> Fixed Price</span>';

        let advanceHtml = '';
        if (p.clientAdvance > 0) {
            advanceHtml = `<div style="font-size:12px; color:var(--c-orange); margin-top:2px;">
                <i class="fa-solid fa-hand-holding-dollar"></i> Client Adv: ${fmt(p.clientAdvance)}
            </div>`;
        }

        const isIntl = p.location === 'international';
        const locBadge = isIntl ? '🌍 Intl' : '🇻🇳 VN';

        // Payment badge
        const payments   = p.payments || [];
        const received   = payments.reduce((s, pay) => s + (pay.amount || 0), 0);
        const contract   = p.revenue || 0;
        const pct        = contract > 0 ? Math.round((received / contract) * 100) : 0;
        let payBadgeClass = 'none';
        if (received > 0 && received < contract) payBadgeClass = 'partial';
        else if (received >= contract && contract > 0) payBadgeClass = '';
        const payBadgeText = payments.length > 0
            ? `${payments.length} đợt · ${pct}%`
            : 'Thêm đợt';

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="proj-card-header">
                <div>
                    <div class="proj-name">${p.name}</div>
                    <div class="proj-client">${p.client ? `👤 ${p.client}` : 'No client'} <span style="font-size:10px; padding:2px 4px; background:var(--bg-secondary); border-radius:4px; margin-left:4px">${locBadge}</span></div>
                    ${p.desc ? `<div style="font-size:12px;color:var(--c-muted);margin-top:4px">${p.desc}</div>` : ''}
                    ${advanceHtml}
                </div>
                <div style="text-align:right">
                    <div style="display:flex;gap:4px;flex-direction:column;align-items:flex-end">
                        ${statusBadge(p.status)}
                        ${typeBadge}
                    </div>
                    <div class="proj-actions" style="margin-top:8px;justify-content:flex-end">
                        <button class="btn-payments" onclick="openPaymentsModal('${p.id}')" title="Lịch sử thanh toán">
                            <i class="fa-solid fa-money-bill-wave"></i>
                            <span class="pay-received-badge ${payBadgeClass}">${payBadgeText}</span>
                        </button>
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
                    <span class="label">Doanh thu HĐ</span>
                    <span class="value" style="color:var(--c-green)">${fmt(p.revenue)}</span>
                </div>
                <div class="fin-row">
                    <span class="label">Đã nhận</span>
                    <span class="value" style="color:var(--c-blue)">${fmt(received)}</span>
                </div>
                <div class="fin-row">
                    <span class="label">Chi phí linh kiện</span>
                    <span class="value" style="color:var(--c-red)">${fmt(p.cost)}</span>
                </div>
                <div class="fin-row profit">
                    <span class="label">Lợi nhuận</span>
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

function renderTaxReport() {
    const tbody = document.getElementById('tax-report-tbody');
    if (!tbody) return;

    // Group projects by year
    const yearlyData = {};
    projectsData.forEach(p => {
        let year = 'Unknown';
        if (p.completionDate) {
            year = p.completionDate.split('-')[0];
        } else if (p.createdAt) {
            year = new Date(p.createdAt.seconds * 1000).getFullYear().toString();
        }
        
        if (!yearlyData[year]) {
            yearlyData[year] = { domTaxable: 0, domTax: 0, intlTaxable: 0, intlTax: 0 };
        }
        
        const rev = p.revenue || 0;
        const adv = p.clientAdvance || 0;
        
        if (p.location === 'international') {
            const taxable = rev;
            yearlyData[year].intlTaxable += taxable;
            yearlyData[year].intlTax += taxable * 0.07;
        } else {
            const taxable = Math.max(0, rev - adv);
            yearlyData[year].domTaxable += taxable;
            yearlyData[year].domTax += taxable * 0.10;
        }
    });

    tbody.innerHTML = '';
    const years = Object.keys(yearlyData).sort((a,b) => b.localeCompare(a)); // desc
    
    if (years.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--c-muted)">No data available for tax reporting</td></tr>`;
        return;
    }

    years.forEach(y => {
        const d = yearlyData[y];
        const totalTax = d.domTax + d.intlTax;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${y}</strong></td>
            <td>${fmt(d.domTaxable)}</td>
            <td style="color:var(--c-orange)">${fmt(d.domTax)}</td>
            <td>${fmt(d.intlTaxable)}</td>
            <td style="color:var(--c-orange)">${fmt(d.intlTax)}</td>
            <td style="font-weight:bold; color:var(--c-red)">${fmt(totalTax)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Re-render tax when dropdown changes
document.getElementById('tax-rate-select')?.addEventListener('change', renderTaxReport);

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
    const totProfit  = totRevenue - totCost;

    document.getElementById('rep-revenue').textContent = fmt(totRevenue);
    document.getElementById('rep-cost').textContent    = fmt(totCost);
    document.getElementById('rep-profit').textContent  = fmt(totProfit);

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
            <td style="font-weight:600;color:${profit >= 0 ? 'var(--c-green)' : 'var(--c-red)'}">${fmt(profit)}</td>
        </tr>`;
    }).join('');

    renderTaxReport();
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

    const header = ['Project Name', 'Client', 'Status', 'Revenue (VND)', 'Cost (VND)', 'Profit (VND)'];
    const rows = filtered.map(p => [
        p.name, p.client || '', p.status,
        p.revenue || 0, p.cost || 0,
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

// =============================================
// PAYMENT HISTORY + WITHDRAWALS
// =============================================
let currentPayProjectId = null;

function openPaymentsModal(projectId) {
    currentPayProjectId = projectId;
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;

    document.getElementById('pay-proj-name').textContent =
        `📁 ${p.name}${p.client ? ' · ' + p.client : ''}`;

    // Default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pay-date').value   = today;
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-note').value   = '';
    document.getElementById('pay-type').value   = 'labor';
    document.getElementById('wd-date').value    = today;
    document.getElementById('wd-amount').value  = '';
    document.getElementById('wd-desc').value    = '';
    document.getElementById('wd-note').value    = '';

    renderPayments(projectId);
    renderWithdrawals(projectId);
    openModal('modal-payments');
}

function renderPayments(projectId) {
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;

    const payments     = (p.payments     || []).slice().sort((a, b) => a.date > b.date ? -1 : 1);
    const withdrawals  = (p.withdrawals  || []);
    const contract     = p.revenue || 0;
    const received     = payments.reduce((s, pay) => s + (pay.amount || 0), 0);
    const spent        = withdrawals.reduce((s, w) => s + (w.amount || 0), 0);
    const cashOnHand   = received - spent;
    const pct          = contract > 0 ? Math.min(100, (received / contract) * 100) : 0;

    // Summary bar
    document.getElementById('pay-total-contract').textContent = fmt(contract);
    document.getElementById('pay-total-received').textContent = fmt(received);
    document.getElementById('pay-total-spent').textContent    = fmt(spent);

    const cashEl = document.getElementById('pay-cash-on-hand');
    cashEl.textContent = fmt(Math.abs(cashOnHand));
    cashEl.className   = 'pay-sum-val ' + (cashOnHand < 0 ? 'red' : cashOnHand === 0 ? 'green' : 'orange');

    // Progress bar
    document.getElementById('pay-progress-bar').style.width = pct + '%';

    // Payments list
    const tbody  = document.getElementById('pay-tbody');
    const emptyR = document.getElementById('pay-empty-row');
    Array.from(tbody.querySelectorAll('tr.pay-row')).forEach(r => r.remove());

    if (payments.length === 0) {
        emptyR.style.display = '';
    } else {
        emptyR.style.display = 'none';
        payments.forEach(pay => {
            const isLabor   = pay.type !== 'material';
            const typeClass = isLabor ? 'pay-type-labor' : 'pay-type-material';
            const typeLabel = isLabor ? '💼 Labor Fee' : '🔩 Material Advance';
            const tr = document.createElement('tr');
            tr.className = 'pay-row';
            tr.innerHTML = `
                <td style="white-space:nowrap;color:var(--c-muted);font-size:12px;">${pay.date || '—'}</td>
                <td><span class="badge ${typeClass}" style="border-radius:6px;font-size:11px;">${typeLabel}</span></td>
                <td style="font-weight:600;color:${isLabor ? 'var(--c-blue)' : 'var(--c-orange)'}">${fmt(pay.amount)}</td>
                <td style="color:var(--c-muted);font-size:12px;">${pay.note || '—'}</td>
                <td>
                    <button class="btn-icon delete" onclick="deletePayment('${projectId}','${pay.id}')" title="Remove">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderWithdrawals(projectId) {
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;

    const withdrawals = (p.withdrawals || []).slice().sort((a, b) => a.date > b.date ? -1 : 1);
    const tbody  = document.getElementById('wd-tbody');
    const emptyR = document.getElementById('wd-empty-row');
    Array.from(tbody.querySelectorAll('tr.wd-row')).forEach(r => r.remove());

    if (withdrawals.length === 0) {
        emptyR.style.display = '';
        return;
    }
    emptyR.style.display = 'none';

    withdrawals.forEach(w => {
        const tr = document.createElement('tr');
        tr.className = 'wd-row';
        tr.innerHTML = `
            <td style="white-space:nowrap;color:var(--c-muted);font-size:12px;">${w.date || '—'}</td>
            <td style="font-weight:500;">${w.desc || '—'}</td>
            <td style="font-weight:600;color:var(--c-orange)">${fmt(w.amount)}</td>
            <td style="color:var(--c-muted);font-size:12px;">${w.note || '—'}</td>
            <td>
                <button class="btn-icon delete" onclick="deleteWithdrawal('${projectId}','${w.id}')" title="Remove">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Add Payment ──
document.getElementById('btn-add-payment').addEventListener('click', async () => {
    if (!currentPayProjectId) return;
    const amount = parseFloat(document.getElementById('pay-amount').value);
    if (!amount || amount <= 0) {
        toast('Please enter a valid amount!', 'error');
        return;
    }

    const btn = document.getElementById('btn-add-payment');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
    btn.disabled  = true;

    const newPayment = {
        id:     crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        date:   document.getElementById('pay-date').value || new Date().toISOString().split('T')[0],
        type:   document.getElementById('pay-type').value,
        amount: amount,
        note:   document.getElementById('pay-note').value.trim()
    };

    const p       = projectsData.find(x => x.id === currentPayProjectId);
    const updated = [...(p?.payments || []), newPayment];

    try {
        await db.collection('projects').doc(currentPayProjectId).update({ payments: updated });
        toast('Payment recorded!');
        document.getElementById('pay-amount').value = '';
        document.getElementById('pay-note').value   = '';
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Payment';
        btn.disabled  = false;
    }
});

// ── Delete Payment ──
async function deletePayment(projectId, paymentId) {
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;
    const updated = (p.payments || []).filter(pay => pay.id !== paymentId);
    try {
        await db.collection('projects').doc(projectId).update({ payments: updated });
        toast('Payment removed.', 'info');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

// ── Add Withdrawal ──
document.getElementById('btn-add-withdrawal').addEventListener('click', async () => {
    if (!currentPayProjectId) return;
    const amount = parseFloat(document.getElementById('wd-amount').value);
    if (!amount || amount <= 0) {
        toast('Please enter a valid amount!', 'error');
        return;
    }

    const btn = document.getElementById('btn-add-withdrawal');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
    btn.disabled  = true;

    const newWithdrawal = {
        id:     crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        date:   document.getElementById('wd-date').value || new Date().toISOString().split('T')[0],
        amount: amount,
        desc:   document.getElementById('wd-desc').value.trim(),
        note:   document.getElementById('wd-note').value.trim()
    };

    const p            = projectsData.find(x => x.id === currentPayProjectId);
    const updatedWd    = [...(p?.withdrawals || []), newWithdrawal];
    const newTotalCost = updatedWd.reduce((s, w) => s + (w.amount || 0), 0);

    try {
        // Save withdrawals + auto-update Material Cost
        await db.collection('projects').doc(currentPayProjectId).update({
            withdrawals: updatedWd,
            cost: newTotalCost
        });
        toast('Purchase logged! Material Cost updated.');
        document.getElementById('wd-amount').value = '';
        document.getElementById('wd-desc').value   = '';
        document.getElementById('wd-note').value   = '';
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Log Purchase';
        btn.disabled  = false;
    }
});

// ── Delete Withdrawal ──
async function deleteWithdrawal(projectId, withdrawalId) {
    const p = projectsData.find(x => x.id === projectId);
    if (!p) return;
    const updatedWd    = (p.withdrawals || []).filter(w => w.id !== withdrawalId);
    const newTotalCost = updatedWd.reduce((s, w) => s + (w.amount || 0), 0);
    try {
        await db.collection('projects').doc(projectId).update({
            withdrawals: updatedWd,
            cost: newTotalCost
        });
        toast('Purchase removed.', 'info');
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    }
}

// Patch: after projectsData updates, re-render payment modal if open
function maybeRefreshPaymentsModal() {
    if (currentPayProjectId && document.getElementById('modal-payments').classList.contains('active')) {
        renderPayments(currentPayProjectId);
        renderWithdrawals(currentPayProjectId);
    }
}

// Expose to inline onclick handlers
window.editItem           = editItem;
window.deleteItem         = deleteItem;
window.editProject        = editProject;
window.deleteProject      = deleteProject;
window.openPaymentsModal  = openPaymentsModal;
window.deletePayment      = deletePayment;
window.deleteWithdrawal   = deleteWithdrawal;


