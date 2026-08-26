/* ============================================================
   KK INVENTORY — vanilla JS SPA, localStorage-backed
   ============================================================ */

const LS_ITEMS = 'kk_items';
const LS_SETTINGS = 'kk_settings';
const LS_LOG = 'kk_log';

const CATEGORY_LABELS = { raw: 'Raw Material', condiment: 'Condiment / Kitchen', merch: 'Merchandise' };

/* ---------------- Seed data (first run only) ---------------- */
function seedData(){
  return [
    mkItem('Beef Floss - Original','raw','Gram',1000,1,['2026-11-13','2026-11-19'],1000,1500),
    mkItem('Bottle Plastic 1L','raw','Pcs',30,1,[],30,60),
    mkItem('CG Sauce Cheese','raw','Gram',1000,1,[],0,3000),
    mkItem('Coffee Kenangan Blend','raw','Gram',1000,25,['2027-04-16','2027-04-17','2027-05-05'],0,130000),
    mkItem('Condensed Milk (SKM)','raw','Gram',1000,16,['2027-01-01'],-16000,160000),
    mkItem('Evaporated Milk (Carnation)','raw','Mililiter',405,48,['2027-02-01'],-19440,450000),
    mkItem('Hibiscus Tea','raw','Gram',100,1,['2029-02-19'],-100,150),
    mkItem('KK Cup Hot 16 Oz','raw','Pcs',25,20,[],25,200),
    mkItem('KK Cup Ice 14 Oz','raw','Pcs',50,40,[],50,15000),
    mkItem('KK Boba Straw Plastic','condiment','Pac',1,1,[],19,0),
    mkItem('KK Trash Bag Besar','condiment','Pac',1,1,[],22,0),
    mkItem('KK Core Merch Press Cup','merch','Pcs',1,1,[],12,0),
  ];
}
function mkItem(name,category,uom,gramPerPac,pacPerCarton,expiryDates,stock,sales30){
  return { id: uid(), name, category, uom, gramPerPac, pacPerCarton, expiryDates, stock, sales30 };
}
function uid(){ return 'i'+Math.random().toString(36).slice(2,10); }

/* ---------------- State ---------------- */
let state = {
  items: load(LS_ITEMS, null) ?? seedData(),
  settings: load(LS_SETTINGS, null) ?? { leadTime:14, siklusOrder:14, hariAman:28 },
  log: load(LS_LOG, null) ?? [],
  tab: 'dashboard',
  search: ''
};
save(LS_ITEMS, state.items);
save(LS_SETTINGS, state.settings);
save(LS_LOG, state.log);

function load(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function persistItems(){ save(LS_ITEMS, state.items); }
function persistSettings(){ save(LS_SETTINGS, state.settings); }
function persistLog(){ save(LS_LOG, state.log); }

/* ---------------- Calculations ---------------- */
function ads(item){ return item.sales30 / 30; }

function daysToExpiry(dateStr){
  if(!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}
function nearestExpiry(item){
  if(!item.expiryDates || item.expiryDates.length===0) return null;
  const valid = item.expiryDates.filter(Boolean);
  if(valid.length===0) return null;
  return valid.map(d=>({d, days:daysToExpiry(d)})).sort((a,b)=>a.days-b.days)[0];
}
function orderCalc(item, settings){
  const a = ads(item);
  const hariAman = settings.hariAman;
  const kebutuhan = a * hariAman;
  const netNeed = kebutuhan - item.stock;
  const pacsNeeded = netNeed > 0 ? Math.ceil(netNeed / (item.gramPerPac || 1)) : 0;
  const cartonsNeeded = pacsNeeded > 0 ? Math.ceil(pacsNeeded / (item.pacPerCarton || 1)) : 0;
  return { ads:a, kebutuhan, netNeed, pacsNeeded, cartonsNeeded };
}
function itemStatus(item, settings){
  const exp = nearestExpiry(item);
  if(exp && exp.days <= 14) return 'danger';
  const a = ads(item);
  const runwayDays = a > 0 ? item.stock / a : Infinity;
  if(runwayDays <= settings.leadTime) return 'warn';
  return 'ok';
}
function fmt(n){
  if(n===null||n===undefined||isNaN(n)) return '0';
  return Math.round(n).toLocaleString('id-ID');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- Tabs / router ---------------- */
document.getElementById('tabs').addEventListener('click', e=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  state.tab = btn.dataset.tab;
  render();
});

function setActiveTabUI(){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===state.tab));
}

function tickClock(){
  const el = document.getElementById('clock');
  const now = new Date();
  el.textContent = now.toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
}
setInterval(tickClock, 60000); tickClock();

/* ---------------- Alert strip ---------------- */
function renderAlerts(){
  const strip = document.getElementById('alertStrip');
  const msgs = [];
  state.items.forEach(it=>{
    const exp = nearestExpiry(it);
    if(exp && exp.days <= 14){
      msgs.push(`<span>⚠ <b>${esc(it.name)}</b> exp ${exp.days<0?'LEWAT':'dlm '+exp.days+' hr'} (${exp.d})</span>`);
    }
  });
  const lowCount = state.items.filter(it=>itemStatus(it,state.settings)==='warn').length;
  if(lowCount>0) msgs.unshift(`<span><b>${lowCount}</b> barang stok menipis, cek Order Warehouse</span>`);
  if(msgs.length===0){ strip.classList.add('hidden'); strip.innerHTML=''; return; }
  strip.classList.remove('hidden');
  strip.innerHTML = msgs.join('<span style="opacity:.4">&nbsp;•&nbsp;</span>');
}

/* ---------------- Render root ---------------- */
function render(){
  setActiveTabUI();
  renderAlerts();
  const c = document.getElementById('content');
  if(state.tab==='dashboard') c.innerHTML = viewDashboard();
  else if(state.tab==='master') c.innerHTML = viewMaster();
  else if(state.tab==='stok') c.innerHTML = viewStok();
  else if(state.tab==='penjualan') c.innerHTML = viewPenjualan();
  else if(state.tab==='order') c.innerHTML = viewOrder();
  else if(state.tab==='settings') c.innerHTML = viewSettings();
  bindTabEvents();
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function viewDashboard(){
  const total = state.items.length;
  const danger = state.items.filter(it=>itemStatus(it,state.settings)==='danger').length;
  const warn = state.items.filter(it=>itemStatus(it,state.settings)==='warn').length;
  const needOrder = state.items.filter(it=>orderCalc(it,state.settings).cartonsNeeded>0).length;

  const rows = [...state.items]
    .map(it=>({it, status:itemStatus(it,state.settings)}))
    .sort((a,b)=>({danger:0,warn:1,ok:2}[a.status]-{danger:0,warn:1,ok:2}[b.status]))
    .slice(0,12);

  return `
    <div class="section-head">
      <div>
        <div class="section-title">Ringkasan Gudang</div>
        <div class="section-sub">Kondisi stok hari ini — ${state.items.length} SKU terdaftar</div>
      </div>
    </div>
    <div class="kpi-row">
      <div class="kpi"><div class="num mono">${total}</div><div class="lbl">Total SKU</div></div>
      <div class="kpi danger"><div class="num mono">${danger}</div><div class="lbl">Mendekati Kadaluarsa</div></div>
      <div class="kpi warn"><div class="num mono">${warn}</div><div class="lbl">Stok Menipis</div></div>
      <div class="kpi ok"><div class="num mono">${needOrder}</div><div class="lbl">Perlu Order</div></div>
    </div>

    <div class="section-title" style="margin-bottom:10px;">Perhatian Utama</div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2.4fr 1fr 1fr 1fr;">
        <div class="ledger-cell">Nama Barang</div>
        <div class="ledger-cell">Stok</div>
        <div class="ledger-cell">Exp Terdekat</div>
        <div class="ledger-cell">Status</div>
      </div>
      ${rows.map(({it,status})=>{
        const exp = nearestExpiry(it);
        return `<div class="ledger-row status-${status}" style="grid-template-columns:2.4fr 1fr 1fr 1fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(CATEGORY_LABELS[it.category])}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stock)} <span style="color:var(--text-dim)">${esc(it.uom)}</span></div>
          <div class="ledger-cell num-cell">${exp? esc(exp.d) + ' ('+exp.days+'h)' : '—'}</div>
          <div class="ledger-cell"><span class="tag ${status}">${status==='danger'?'EXPIRY':status==='warn'?'LOW':'OK'}</span></div>
        </div>`;
      }).join('') || '<div class="empty">Belum ada data barang.</div>'}
    </div>
  `;
}

/* ============================================================
   MASTER BARANG
   ============================================================ */
function viewMaster(){
  const items = filteredItems();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Master Barang</div>
        <div class="section-sub">Data induk raw material, condiment, dan merchandise</div>
      </div>
      <div class="btn-row">
        <button class="btn" id="btnAddItem">+ Tambah Barang</button>
        <button class="btn secondary" id="btnImportCsv">Import CSV</button>
        <button class="btn secondary" id="btnExportCsv">Export CSV</button>
      </div>
    </div>

    <div class="pill-group">
      <span class="pill ${state.catFilter?'':'active'}" data-cat="">Semua</span>
      <span class="pill ${state.catFilter==='raw'?'active':''}" data-cat="raw">Raw Material</span>
      <span class="pill ${state.catFilter==='condiment'?'active':''}" data-cat="condiment">Condiment</span>
      <span class="pill ${state.catFilter==='merch'?'active':''}" data-cat="merch">Merchandise</span>
    </div>

    <div class="searchbar">
      <input type="text" id="searchInput" placeholder="Cari nama barang..." value="${esc(state.search)}">
    </div>

    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.8fr 0.9fr 1.1fr 1fr 0.6fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">UOM</div>
        <div class="ledger-cell">Stok</div>
        <div class="ledger-cell">Konversi</div>
        <div class="ledger-cell">Exp Terdekat</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>{
        const status = itemStatus(it,state.settings);
        const exp = nearestExpiry(it);
        return `<div class="ledger-row status-${status}" style="grid-template-columns:2fr 0.8fr 0.9fr 1.1fr 1fr 0.6fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(CATEGORY_LABELS[it.category])}</span></div>
          <div class="ledger-cell num-cell">${esc(it.uom)}</div>
          <div class="ledger-cell num-cell">${fmt(it.stock)}</div>
          <div class="ledger-cell num-cell" style="font-size:11px;">${fmt(it.gramPerPac)}/pac · ${fmt(it.pacPerCarton)}/ctn</div>
          <div class="ledger-cell num-cell">${exp? esc(exp.d) : '—'}</div>
          <div class="ledger-cell"><button class="btn ghost" data-edit="${it.id}" style="padding:5px 8px;">Edit</button></div>
        </div>`;
      }).join('') || '<div class="empty">Tidak ada barang cocok. Tambah barang baru atau import CSV.</div>'}
    </div>
  `;
}

function filteredItems(){
  return state.items.filter(it=>{
    if(state.catFilter && it.category!==state.catFilter) return false;
    if(state.search && !it.name.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });
}

function openItemModal(itemId){
  const editing = itemId ? state.items.find(i=>i.id===itemId) : null;
  const it = editing ?? { id:null, name:'', category:'raw', uom:'Gram', gramPerPac:1000, pacPerCarton:1, expiryDates:[], stock:0, sales30:0 };
  const modal = `
    <div class="modal-bg" id="modalBg">
      <div class="modal">
        <div class="modal-title">${editing?'Edit Barang':'Tambah Barang'}</div>
        <div class="field">
          <label>Nama Barang</label>
          <input type="text" id="f_name" value="${esc(it.name)}">
        </div>
        <div class="field-row">
          <div class="field">
            <label>Kategori</label>
            <select id="f_category">
              <option value="raw" ${it.category==='raw'?'selected':''}>Raw Material</option>
              <option value="condiment" ${it.category==='condiment'?'selected':''}>Condiment / Kitchen</option>
              <option value="merch" ${it.category==='merch'?'selected':''}>Merchandise</option>
            </select>
          </div>
          <div class="field">
            <label>UOM</label>
            <input type="text" id="f_uom" value="${esc(it.uom)}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Satuan per Pac (gram/ml/pcs)</label>
            <input type="number" id="f_gramPerPac" class="mono" value="${it.gramPerPac}">
          </div>
          <div class="field">
            <label>Pac per Carton</label>
            <input type="number" id="f_pacPerCarton" class="mono" value="${it.pacPerCarton}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Stok Saat Ini</label>
            <input type="number" id="f_stock" class="mono" value="${it.stock}">
          </div>
          <div class="field">
            <label>Penjualan 30 Hari</label>
            <input type="number" id="f_sales30" class="mono" value="${it.sales30}">
          </div>
        </div>
        <div class="field">
          <label>Tanggal Kadaluarsa (pisahkan koma, format YYYY-MM-DD)</label>
          <input type="text" id="f_expiry" value="${esc((it.expiryDates||[]).join(', '))}" placeholder="2027-01-15, 2027-03-09">
        </div>
        <div class="btn-row" style="margin-top:14px;justify-content:space-between;">
          <div>${editing? '<button class="btn danger" id="btnDeleteItem">Hapus</button>' : ''}</div>
          <div class="btn-row">
            <button class="btn ghost" id="btnCancelModal">Batal</button>
            <button class="btn" id="btnSaveItem">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modalRoot').innerHTML = modal;
  document.getElementById('btnCancelModal').onclick = closeModal;
  document.getElementById('modalBg').addEventListener('click', e=>{ if(e.target.id==='modalBg') closeModal(); });
  if(editing){
    document.getElementById('btnDeleteItem').onclick = ()=>{
      if(confirm('Hapus barang ini?')){
        state.items = state.items.filter(i=>i.id!==editing.id);
        persistItems(); closeModal(); render();
      }
    };
  }
  document.getElementById('btnSaveItem').onclick = ()=>{
    const name = document.getElementById('f_name').value.trim();
    if(!name){ alert('Nama barang wajib diisi'); return; }
    const data = {
      name,
      category: document.getElementById('f_category').value,
      uom: document.getElementById('f_uom').value.trim(),
      gramPerPac: parseFloat(document.getElementById('f_gramPerPac').value)||1,
      pacPerCarton: parseFloat(document.getElementById('f_pacPerCarton').value)||1,
      stock: parseFloat(document.getElementById('f_stock').value)||0,
      sales30: parseFloat(document.getElementById('f_sales30').value)||0,
      expiryDates: document.getElementById('f_expiry').value.split(',').map(s=>s.trim()).filter(Boolean)
    };
    if(editing){
      Object.assign(editing, data);
    } else {
      state.items.push({ id: uid(), ...data });
    }
    persistItems();
    closeModal();
    render();
  };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

/* ---------------- CSV import/export ---------------- */
function itemsToCsv(){
  const header = ['name','category','uom','gramPerPac','pacPerCarton','stock','sales30','expiryDates'];
  const rows = state.items.map(it=>[
    it.name, it.category, it.uom, it.gramPerPac, it.pacPerCarton, it.stock, it.sales30,
    (it.expiryDates||[]).join('|')
  ]);
  return [header, ...rows].map(r=>r.map(csvEscape).join(',')).join('\n');
}
function csvEscape(v){
  const s = String(v??'');
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function parseCsv(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  return lines.map(line=>{
    const out=[]; let cur=''; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(inQ){
        if(ch==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else inQ=false; }
        else cur+=ch;
      } else {
        if(ch==='"') inQ=true;
        else if(ch===','){ out.push(cur); cur=''; }
        else cur+=ch;
      }
    }
    out.push(cur);
    return out;
  });
}
function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ============================================================
   STOK HARIAN (In/Out)
   ============================================================ */
function viewStok(){
  const items = filteredItems();
  const todayLog = state.log.slice(-40).reverse();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Stok Harian</div>
        <div class="section-sub">Catat barang masuk / keluar, stok otomatis diperbarui</div>
      </div>
    </div>

    <div class="searchbar"><input type="text" id="searchInput" placeholder="Cari barang..." value="${esc(state.search)}"></div>

    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 0.8fr 0.9fr 1fr 1fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">Stok</div>
        <div class="ledger-cell">Masuk (IN)</div>
        <div class="ledger-cell">Keluar (OUT)</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>`
        <div class="ledger-row status-${itemStatus(it,state.settings)}" style="grid-template-columns:2fr 0.8fr 0.9fr 1fr 1fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)}</span></div>
          <div class="ledger-cell num-cell">${fmt(it.stock)}</div>
          <div class="ledger-cell"><input type="number" class="qty-input in-input" data-id="${it.id}" placeholder="0"></div>
          <div class="ledger-cell"><input type="number" class="qty-input out-input" data-id="${it.id}" placeholder="0"></div>
          <div class="ledger-cell"><button class="btn ghost apply-log" data-id="${it.id}" style="padding:5px 8px;">Simpan</button></div>
        </div>
      `).join('') || '<div class="empty">Tidak ada barang.</div>'}
    </div>

    <div class="section-title" style="margin-bottom:10px;">Riwayat Terakhir</div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:1.1fr 2fr 0.8fr 0.9fr;">
        <div class="ledger-cell">Tanggal</div>
        <div class="ledger-cell">Barang</div>
        <div class="ledger-cell">Tipe</div>
        <div class="ledger-cell">Qty</div>
      </div>
      ${todayLog.map(l=>{
        const it = state.items.find(i=>i.id===l.itemId);
        return `<div class="ledger-row status-${l.type==='in'?'ok':'warn'}" style="grid-template-columns:1.1fr 2fr 0.8fr 0.9fr;">
          <div class="ledger-cell num-cell">${esc(l.date)}</div>
          <div class="ledger-cell">${esc(it? it.name : '(dihapus)')}</div>
          <div class="ledger-cell"><span class="tag ${l.type==='in'?'ok':'warn'}">${l.type.toUpperCase()}</span></div>
          <div class="ledger-cell num-cell">${fmt(l.qty)}</div>
        </div>`;
      }).join('') || '<div class="empty">Belum ada transaksi.</div>'}
    </div>
  `;
}

/* ============================================================
   DATA PENJUALAN
   ============================================================ */
function viewPenjualan(){
  const items = filteredItems();
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Data Penjualan 30 Hari</div>
        <div class="section-sub">Dipakai untuk menghitung ADS (Average Daily Sales) dan kebutuhan order</div>
      </div>
    </div>
    <div class="searchbar"><input type="text" id="searchInput" placeholder="Cari barang..." value="${esc(state.search)}"></div>
    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2.2fr 1.2fr 1fr 0.8fr;">
        <div class="ledger-cell">Nama</div>
        <div class="ledger-cell">Penjualan 30 Hari</div>
        <div class="ledger-cell">ADS</div>
        <div class="ledger-cell">Aksi</div>
      </div>
      ${items.map(it=>`
        <div class="ledger-row" style="grid-template-columns:2.2fr 1.2fr 1fr 0.8fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)}</span></div>
          <div class="ledger-cell"><input type="number" class="qty-input sales-input" data-id="${it.id}" value="${it.sales30}"></div>
          <div class="ledger-cell num-cell">${fmt(ads(it))}</div>
          <div class="ledger-cell"><button class="btn ghost save-sales" data-id="${it.id}" style="padding:5px 8px;">Simpan</button></div>
        </div>
      `).join('') || '<div class="empty">Tidak ada barang.</div>'}
    </div>
  `;
}

/* ============================================================
   ORDER WAREHOUSE
   ============================================================ */
function viewOrder(){
  const s = state.settings;
  const calc = state.items.map(it=>({ it, c: orderCalc(it, s) }));
  const needed = calc.filter(x=>x.c.cartonsNeeded>0).sort((a,b)=>b.c.cartonsNeeded-a.c.cartonsNeeded);
  const today = new Date();
  const delivery = new Date(today.getTime() + s.leadTime*86400000);

  return `
    <div class="section-head">
      <div>
        <div class="section-title">Order Warehouse</div>
        <div class="section-sub">Kebutuhan = ADS × Hari Aman (${s.hariAman} hr) − Stok Toko, dibulatkan ke satuan Carton</div>
      </div>
      <div class="btn-row">
        <button class="btn secondary" id="btnExportOrder">Export CSV</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="num mono">${s.leadTime}</div><div class="lbl">Lead Time (hr)</div></div>
      <div class="kpi"><div class="num mono">${s.siklusOrder}</div><div class="lbl">Siklus Order (hr)</div></div>
      <div class="kpi"><div class="num mono">${s.hariAman}</div><div class="lbl">Hari Aman</div></div>
      <div class="kpi warn"><div class="num mono">${needed.length}</div><div class="lbl">SKU Perlu Order</div></div>
    </div>
    <div class="small-note" style="margin-bottom:14px;">Order hari ini, estimasi barang datang: <b class="mono">${delivery.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</b></div>

    <div class="ledger">
      <div class="ledger-row head" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr;">
        <div class="ledger-cell">SKU</div>
        <div class="ledger-cell">ADS</div>
        <div class="ledger-cell">Stok</div>
        <div class="ledger-cell">Butuh (Pac)</div>
        <div class="ledger-cell">Order (Ctn)</div>
      </div>
      ${needed.map(({it,c})=>`
        <div class="ledger-row status-warn" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr;">
          <div class="ledger-cell">${esc(it.name)}<span class="small-note">${esc(it.uom)}</span></div>
          <div class="ledger-cell num-cell">${fmt(c.ads)}</div>
          <div class="ledger-cell num-cell">${fmt(it.stock)}</div>
          <div class="ledger-cell num-cell">${fmt(c.pacsNeeded)}</div>
          <div class="ledger-cell num-cell" style="color:var(--warn);font-weight:600;">${fmt(c.cartonsNeeded)}</div>
        </div>
      `).join('') || '<div class="empty">Tidak ada barang yang perlu di-order saat ini. 🎉</div>'}
    </div>
  `;
}

/* ============================================================
   SETTINGS
   ============================================================ */
function viewSettings(){
  const s = state.settings;
  return `
    <div class="section-head">
      <div>
        <div class="section-title">Pengaturan</div>
        <div class="section-sub">Parameter perhitungan order &amp; cadangan data</div>
      </div>
    </div>

    <div class="card">
      <div class="field-row">
        <div class="field">
          <label>Lead Time (hari)</label>
          <input type="number" id="s_leadTime" class="mono" value="${s.leadTime}">
        </div>
        <div class="field">
          <label>Siklus Order (hari)</label>
          <input type="number" id="s_siklusOrder" class="mono" value="${s.siklusOrder}">
        </div>
      </div>
      <div class="field">
        <label>Hari Aman (default Lead Time + Siklus Order)</label>
        <input type="number" id="s_hariAman" class="mono" value="${s.hariAman}">
      </div>
      <div class="btn-row">
        <button class="btn" id="btnSaveSettings">Simpan Pengaturan</button>
      </div>
    </div>

    <div class="card">
      <label style="margin-bottom:10px;">Cadangan Data</label>
      <div class="btn-row">
        <button class="btn secondary" id="btnBackup">Export Backup (JSON)</button>
        <button class="btn secondary" id="btnRestore">Import Backup (JSON)</button>
        <button class="btn danger" id="btnResetData">Reset ke Data Contoh</button>
      </div>
      <div class="small-note">Semua data tersimpan di perangkat ini (localStorage). Export backup secara berkala agar data tidak hilang.</div>
    </div>
  `;
}

/* ============================================================
   EVENT BINDING (delegated per re-render)
   ============================================================ */
function bindTabEvents(){
  // search
  const search = document.getElementById('searchInput');
  if(search){
    search.oninput = (e)=>{ state.search = e.target.value; renderKeepFocus('searchInput'); };
  }
  // category pills
  document.querySelectorAll('.pill[data-cat]').forEach(p=>{
    p.onclick = ()=>{ state.catFilter = p.dataset.cat || null; render(); };
  });
  // master: add/edit
  const btnAdd = document.getElementById('btnAddItem');
  if(btnAdd) btnAdd.onclick = ()=>openItemModal(null);
  document.querySelectorAll('[data-edit]').forEach(b=>{
    b.onclick = ()=>openItemModal(b.dataset.edit);
  });
  // master: csv
  const btnImp = document.getElementById('btnImportCsv');
  if(btnImp) btnImp.onclick = importCsvFlow;
  const btnExp = document.getElementById('btnExportCsv');
  if(btnExp) btnExp.onclick = ()=>downloadFile('kk-master-barang.csv', itemsToCsv(), 'text/csv');

  // stok harian: apply
  document.querySelectorAll('.apply-log').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id;
      const inEl = document.querySelector(`.in-input[data-id="${id}"]`);
      const outEl = document.querySelector(`.out-input[data-id="${id}"]`);
      const inQty = parseFloat(inEl.value)||0;
      const outQty = parseFloat(outEl.value)||0;
      if(inQty===0 && outQty===0) return;
      const it = state.items.find(i=>i.id===id);
      const today = new Date().toISOString().slice(0,10);
      if(inQty!==0){ it.stock += inQty; state.log.push({id:uid(),itemId:id,date:today,type:'in',qty:inQty}); }
      if(outQty!==0){ it.stock -= outQty; state.log.push({id:uid(),itemId:id,date:today,type:'out',qty:outQty}); }
      persistItems(); persistLog(); render();
    };
  });

  // penjualan: save
  document.querySelectorAll('.save-sales').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id;
      const input = document.querySelector(`.sales-input[data-id="${id}"]`);
      const val = parseFloat(input.value)||0;
      const it = state.items.find(i=>i.id===id);
      it.sales30 = val;
      persistItems(); render();
    };
  });

  // order export
  const btnOrderExp = document.getElementById('btnExportOrder');
  if(btnOrderExp) btnOrderExp.onclick = ()=>{
    const s = state.settings;
    const rows = state.items.map(it=>{
      const c = orderCalc(it,s);
      return [it.name, it.uom, c.cartonsNeeded];
    }).filter(r=>r[2]>0);
    const csv = [['SKU NAME','UOM','QTY ORDER'], ...rows].map(r=>r.map(csvEscape).join(',')).join('\n');
    downloadFile('order-warehouse.csv', csv, 'text/csv');
  };

  // settings
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  if(btnSaveSettings) btnSaveSettings.onclick = ()=>{
    state.settings.leadTime = parseFloat(document.getElementById('s_leadTime').value)||14;
    state.settings.siklusOrder = parseFloat(document.getElementById('s_siklusOrder').value)||14;
    state.settings.hariAman = parseFloat(document.getElementById('s_hariAman').value)|| (state.settings.leadTime+state.settings.siklusOrder);
    persistSettings();
    render();
  };
  const btnBackup = document.getElementById('btnBackup');
  if(btnBackup) btnBackup.onclick = ()=>{
    const data = JSON.stringify({items:state.items, settings:state.settings, log:state.log}, null, 2);
    downloadFile('kk-inventory-backup.json', data, 'application/json');
  };
  const btnRestore = document.getElementById('btnRestore');
  if(btnRestore) btnRestore.onclick = ()=>{
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.json,application/json';
    inp.onchange = ()=>{
      const file = inp.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const data = JSON.parse(reader.result);
          if(data.items){ state.items=data.items; persistItems(); }
          if(data.settings){ state.settings=data.settings; persistSettings(); }
          if(data.log){ state.log=data.log; persistLog(); }
          render();
          alert('Backup berhasil dimuat.');
        }catch(e){ alert('File backup tidak valid.'); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };
  const btnReset = document.getElementById('btnResetData');
  if(btnReset) btnReset.onclick = ()=>{
    if(confirm('Ini akan menghapus semua data dan mengganti dengan data contoh. Lanjutkan?')){
      state.items = seedData(); state.log = [];
      persistItems(); persistLog(); render();
    }
  };
}

function renderKeepFocus(inputId){
  const el = document.getElementById(inputId);
  const pos = el.selectionStart;
  render();
  const el2 = document.getElementById(inputId);
  if(el2){ el2.focus(); el2.setSelectionRange(pos,pos); }
}

/* ---------------- CSV import flow ---------------- */
function importCsvFlow(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange = ()=>{
    const file = inp.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const rows = parseCsv(reader.result);
      const header = rows[0].map(h=>h.trim().toLowerCase());
      const idx = (name)=>header.indexOf(name);
      let added=0, updated=0;
      for(let i=1;i<rows.length;i++){
        const r = rows[i];
        if(r.length<2 || !r[idx('name')]) continue;
        const name = r[idx('name')];
        const data = {
          name,
          category: r[idx('category')] || 'raw',
          uom: r[idx('uom')] || 'Gram',
          gramPerPac: parseFloat(r[idx('gramperpac')]) || 1,
          pacPerCarton: parseFloat(r[idx('pacpercarton')])||1,
          stock: parseFloat(r[idx('stock')])||0,
          sales30: parseFloat(r[idx('sales30')])||0,
          expiryDates: (r[idx('expirydates')]||'').split('|').map(s=>s.trim()).filter(Boolean)
        };
        const existing = state.items.find(x=>x.name.toLowerCase()===name.toLowerCase());
        if(existing){ Object.assign(existing, data); updated++; }
        else { state.items.push({id:uid(), ...data}); added++; }
      }
      persistItems();
      render();
      alert(`Import selesai: ${added} baru, ${updated} diperbarui.`);
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ---------------- init ---------------- */
render();
