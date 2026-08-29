const app = {
    // STATE & DATA MODELS
    data: {
        items: [],
        inventory: {}, // itemId -> { qty, batches: [{qty, exp}] }
        transactions: [], // { date, type, itemId, qty, user, detail }
        sales30: {}, // itemId -> qty
    },
    currentUser: null,

    // INITIALIZATION
    init() {
        this.loadData();
        if (!this.data.items.length) this.loadDemoData();
        
        const loggedIn = localStorage.getItem('kk_user');
        if (loggedIn) {
            this.currentUser = JSON.parse(loggedIn);
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            this.switchView('dashboard');
        }
    },

    loadData() {
        const stored = localStorage.getItem('kk_inventory_data');
        if (stored) this.data = JSON.parse(stored);
    },

    saveData() {
        localStorage.setItem('kk_inventory_data', JSON.stringify(this.data));
        this.renderAll();
    },

    loadDemoData() {
        this.data.items = [
            { id: 'RM1', name: 'KK Beef Floss - Original', category: 'Raw Material', uom: 'Gram', pic: 'Bar', buffer: 10 },
            { id: 'RM2', name: 'KK Syrup Strawberry', category: 'Raw Material', uom: 'ml', pic: 'Bar', buffer: 10 },
            { id: 'RM3', name: 'KK Fresh Milk', category: 'Raw Material', uom: 'ml', pic: 'Bar', buffer: 5 },
            { id: 'MC1', name: 'KK Merch Cup Hugger Bear', category: 'Merchandise', uom: 'pcs', pic: 'Cashier', price: 'Rp 35.000', buffer: 0 }
        ];
        this.data.inventory = {
            'RM1': { qty: 2000, batches: [{ id: 'b1', qty: 1000, exp: '2026-08-28' }, { id: 'b2', qty: 1000, exp: '2026-10-30' }] },
            'RM2': { qty: 12000, batches: [{ id: 'b3', qty: 2000, exp: '2026-08-29' }, { id: 'b4', qty: 10000, exp: '2026-09-20' }] },
            'RM3': { qty: 3500, batches: [{ id: 'b5', qty: 3500, exp: '2026-09-05' }] },
            'MC1': { qty: 0, batches: [] }
        };
        this.data.sales30 = { 'RM1': 8000, 'RM2': 15000, 'RM3': 20000, 'MC1': 5 };
        this.saveData();
    },

    // AUTH
    login() {
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        if (user === 'manager' && pass === '1234') {
            this.currentUser = { username: 'Manager', role: 'MANAGER' };
            localStorage.setItem('kk_user', JSON.stringify(this.currentUser));
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            this.switchView('dashboard');
        } else {
            alert('Login gagal. Gunakan manager / 1234');
        }
    },
    logout() {
        localStorage.removeItem('kk_user');
        location.reload();
    },

    // NAVIGATION
    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`view-${viewId}`).style.display = 'block';
        
        const navTarget = document.querySelector(`.nav-item[href="#${viewId}"]`);
        if(navTarget) navTarget.classList.add('active');

        this.renderAll();
    },

    // RENDERING
    renderAll() {
        this.renderDashboard();
        this.populateDropdowns();
        this.renderHistory();
        this.renderEstimasi();
    },

    renderDashboard() {
        const rmContainer = document.getElementById('dash-raw-material');
        const mcContainer = document.getElementById('dash-merchandise');
        const warnContainer = document.getElementById('expiry-warning-container');
        
        rmContainer.innerHTML = '';
        mcContainer.innerHTML = '';
        warnContainer.innerHTML = '';

        let warningsHtml = '';

        this.data.items.forEach(item => {
            const inv = this.data.inventory[item.id] || { qty: 0, batches: [] };
            
            // Generate Batches & Expiry warnings for Raw Material
            let batchesHtml = '';
            if (item.category === 'Raw Material') {
                inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp)); // Sort by Expiry
                inv.batches.forEach(b => {
                    const daysToExp = Math.ceil((new Date(b.exp) - new Date()) / (1000 * 60 * 60 * 24));
                    batchesHtml += `<div>Exp ${b.exp} · ${b.qty} ${item.uom}</div>`;
                    
                    if (daysToExp <= 7 && b.qty > 0) {
                        warningsHtml += `
                            <div class="card warning-card">
                                <div class="card-header">${item.name}</div>
                                <div class="card-body">
                                    <span class="warning-text">Exp ${b.exp} · ${daysToExp} hari lagi</span> · ${b.qty} ${item.uom}
                                </div>
                            </div>
                        `;
                    }
                });
            }

            const status = inv.qty > 0 ? 'Available' : 'Habis';
            const cardHtml = `
                <div class="card">
                    <div class="card-header">
                        <span>${item.name}</span>
                        <span>${inv.qty} ${item.uom}</span>
                    </div>
                    <div class="card-body">
                        <div>Status: <strong>${status}</strong></div>
                        ${item.category === 'Merchandise' ? `<div>Harga: ${item.price}</div>` : ''}
                        ${batchesHtml ? `<div class="batch-list">${batchesHtml}</div>` : ''}
                    </div>
                </div>
            `;

            if (item.category === 'Raw Material') rmContainer.innerHTML += cardHtml;
            else mcContainer.innerHTML += cardHtml;
        });

        if (warningsHtml) {
            warnContainer.innerHTML = `<h3 class="category-title warning-text">PERHATIAN · RAW MATERIAL</h3>` + warningsHtml;
        }
    },

    // BUSINESS LOGIC: IN
    submitIn() {
        const itemId = document.getElementById('in-item').value;
        const qty = parseFloat(document.getElementById('in-qty').value);
        const exp = document.getElementById('in-exp').value;
        const item = this.data.items.find(i => i.id === itemId);

        if (!itemId || isNaN(qty) || qty <= 0) return alert('Data tidak valid');
        if (item.category === 'Raw Material' && !exp) return alert('Tanggal Expiry wajib diisi untuk Raw Material');

        if (!this.data.inventory[itemId]) this.data.inventory[itemId] = { qty: 0, batches: [] };
        
        this.data.inventory[itemId].qty += qty;
        
        if (item.category === 'Raw Material') {
            this.data.inventory[itemId].batches.push({
                id: 'b' + Date.now(),
                qty: qty,
                exp: exp
            });
        }

        this.addTransaction('IN', itemId, qty, `Masuk`);
        this.closeModal('modal-in');
        this.saveData();
    },

    // BUSINESS LOGIC: OUT (FEFO)
    submitOut() {
        const itemId = document.getElementById('out-item').value;
        let qty = parseFloat(document.getElementById('out-qty').value);
        const detail = document.getElementById('out-detail').value;
        const item = this.data.items.find(i => i.id === itemId);
        const inv = this.data.inventory[itemId];

        if (!itemId || isNaN(qty) || qty <= 0) return alert('Data tidak valid');
        if (!inv || inv.qty < qty) return alert('Stok tidak mencukupi untuk OUT ini!');

        // FEFO Logic for Raw Material
        if (item.category === 'Raw Material') {
            // Sort batches: oldest expiry first
            inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp));
            
            let remainingOut = qty;
            for (let i = 0; i < inv.batches.length; i++) {
                if (remainingOut <= 0) break;
                let batch = inv.batches[i];
                if (batch.qty > 0) {
                    if (batch.qty >= remainingOut) {
                        batch.qty -= remainingOut;
                        remainingOut = 0;
                    } else {
                        remainingOut -= batch.qty;
                        batch.qty = 0;
                    }
                }
            }
            // Cleanup empty batches
            inv.batches = inv.batches.filter(b => b.qty > 0);
        }

        inv.qty -= qty;
        this.addTransaction('OUT', itemId, qty, detail || 'Terpakai/Terjual');
        this.closeModal('modal-out');
        this.saveData();
    },

    // BUSINESS LOGIC: DAILY SO
    submitSo() {
        const itemId = document.getElementById('so-item').value;
        const actualQty = parseFloat(document.getElementById('so-qty').value);
        const inv = this.data.inventory[itemId];

        if (!itemId || isNaN(actualQty) || actualQty < 0) return alert('Data tidak valid');

        const difference = actualQty - inv.qty;
        inv.qty = actualQty;

        // Sync batch total with SO actual (Simpan selisih ke batch terlama jika kurang, atau buat penyesuaian)
        // Untuk operasional simpel: jika aktual lebih kecil, kurangi dari batch terlama (FEFO logic)
        if (difference < 0) {
            let diffToReduce = Math.abs(difference);
            inv.batches.sort((a, b) => new Date(a.exp) - new Date(b.exp));
            for (let i = 0; i < inv.batches.length; i++) {
                if (diffToReduce <= 0) break;
                if (inv.batches[i].qty >= diffToReduce) {
                    inv.batches[i].qty -= diffToReduce;
                    diffToReduce = 0;
                } else {
                    diffToReduce -= inv.batches[i].qty;
                    inv.batches[i].qty = 0;
                }
            }
            inv.batches = inv.batches.filter(b => b.qty > 0);
        } else if (difference > 0) {
            // Jika lebih, terpaksa dimasukkan ke batch terlama atau buat batch "SO Adj"
            // Dalam prototype ini, kita tambahkan ke batch terdekat agar stok cocok.
            if(inv.batches.length > 0) {
                inv.batches[0].qty += difference;
            } else {
                inv.batches.push({ id: 'adj'+Date.now(), qty: difference, exp: new Date().toISOString().split('T')[0] });
            }
        }

        this.addTransaction('SO', itemId, actualQty, `SO Aktual. Sistem disesuaikan dari ${inv.qty - difference}`);
        this.closeModal('modal-so');
        this.saveData();
        alert('Daily SO berhasil disimpan. Stok sistem telah diperbarui.');
    },

    // BUSINESS LOGIC: ESTIMASI PENGORDERAN
    renderEstimasi() {
        const estContainer = document.getElementById('estimasi-list');
        estContainer.innerHTML = '';

        this.data.items.forEach(item => {
            const inv = this.data.inventory[item.id];
            const stockAktual = inv ? inv.qty : 0;
            const sales = this.data.sales30[item.id] || 0;
            const buffer = item.buffer || 0;
            
            // Formula: Kebutuhan = (Sales 30D + Buffer%) - Stock Aktual
            const targetStock = sales + (sales * (buffer / 100));
            let orderQty = Math.ceil(targetStock - stockAktual);
            if (orderQty < 0) orderQty = 0;

            estContainer.innerHTML += `
                <div class="card">
                    <div class="card-header">
                        <span>${item.name}</span>
                        <span>Order: ${orderQty} ${item.uom}</span>
                    </div>
                    <div class="card-body">
                        <div>PIC: <strong>${item.pic}</strong></div>
                        <div>Stok Akhir Aktual: ${stockAktual} ${item.uom}</div>
                        <div>Sales 30 Hari: ${sales} ${item.uom}</div>
                        <div>Buffer: ${buffer}%</div>
                        <div style="margin-top: 8px; color: var(--kk-red); font-weight: bold;">Rekomendasi Order: ${orderQty} ${item.uom}</div>
                    </div>
                </div>
            `;
        });
    },

    // UTILITIES
    addTransaction(type, itemId, qty, detail) {
        this.data.transactions.unshift({
            date: new Date().toLocaleString('id-ID'),
            type, itemId, qty, detail,
            user: this.currentUser.username
        });
    },

    renderHistory() {
        const renderList = (type, targetId) => {
            const list = this.data.transactions.filter(t => t.type === type).slice(0, 10);
            const container = document.getElementById(targetId);
            container.innerHTML = list.map(t => {
                const item = this.data.items.find(i => i.id === t.itemId);
                return `
                <div class="card" style="padding: 10px;">
                    <div style="font-size: 11px; color: #888;">${t.date} · ${t.user}</div>
                    <div style="font-weight: 600; margin: 4px 0;">${item ? item.name : t.itemId}</div>
                    <div style="color: ${type==='OUT' ? 'red' : (type==='IN' ? 'green' : 'blue')}">
                        ${type==='OUT'?'-':(type==='IN'?'+':'=')} ${t.qty} ${item ? item.uom : ''} 
                        <span style="color:#666; font-size:11px;">(${t.detail})</span>
                    </div>
                </div>`
            }).join('') || '<p style="font-size:12px;">Belum ada history.</p>';
        };
        renderList('IN', 'history-in-list');
        renderList('OUT', 'history-out-list');
        renderList('SO', 'history-so-list');
    },

    populateDropdowns() {
        const items = this.data.items;
        const rmItems = items.filter(i => i.category === 'Raw Material');
        
        const buildOptions = (arr) => arr.map(i => `<option value="${i.id}">${i.name} (${i.uom})</option>`).join('');
        
        document.getElementById('in-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(items);
        document.getElementById('out-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(items);
        document.getElementById('so-item').innerHTML = '<option value="">Pilih Item...</option>' + buildOptions(rmItems); // SO only RM
    },

    checkCategory(modalType) {
        if(modalType === 'in') {
            const itemId = document.getElementById('in-item').value;
            const item = this.data.items.find(i => i.id === itemId);
            document.getElementById('in-batch-group').style.display = (item && item.category === 'Raw Material') ? 'block' : 'none';
        }
    },

    openModal(id) {
        document.getElementById('modal-overlay').style.display = 'block';
        document.getElementById(id).style.display = 'block';
    },

    closeModal(id) {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById(id).style.display = 'none';
        // Clear inputs
        document.querySelectorAll(`#${id} input`).forEach(el => el.value = '');
    },

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "kk_inventory_export.json");
        dlAnchorElem.click();
    },

    resetSystem() {
        if(confirm("Yakin ingin mereset seluruh data? Aksi ini akan mengembalikan data ke Demo Data bawaan.")) {
            localStorage.removeItem('kk_inventory_data');
            this.loadDemoData();
            alert("Sistem berhasil di-reset");
            location.reload();
        }
    }
};

window.onload = () => app.init();
function clearOpening(){if(confirm("Hapus semua Stock Awal?")){d.opening=[];save();show("opening")}}
function newItem(){modal("Tambah Barang Baru",`<div class="field"><label>Nama internal</label><input id="nn"></div><div class="field"><label>Nama display</label><input id="nd"></div><div class="grid2"><div class="field"><label>Kategori</label><select id="nc"><option value="raw">Raw Material</option><option value="kitchen">Kitchen Supplier</option><option value="merch">Merchandise</option></select></div><div class="field"><label>UOM</label><input id="nu"></div><div class="field"><label>Qty awal</label><input id="nq" type="number"></div><div class="field"><label>Harga display merchandise</label><input id="np" type="number"></div></div><button class="btn primary" onclick="doNew()">Tambah</button>`)}
function doNew(){d.items.push({id:Date.now()+"",c:nc.value,n:nn.value,display:nd.value,u:nu.value,q:+nq.value||0,p:+np.value||0,b:[]});save();closeM();show("in")}
function openSales(){modal("Penjualan 30 Hari",`<div class="field"><label>Raw Material</label><select id="sli">${raw().map(i=>`<option value="${i.id}">${i.n}</option>`).join("")}</select></div><div class="grid2"><div class="field"><label>Qty 30 hari</label><input id="slq" type="number"></div><div class="field"><label>UOM order</label><select id="slu"><option>Pac</option><option>Bottle</option><option>CTN</option></select></div><div class="field"><label>Buffer %</label><input id="slb" type="number" value="0"></div></div><button class="btn primary" onclick="doSales()">Simpan</button>`)}
function doSales(){let old=d.sales.find(x=>x.id===sli.value),v={id:sli.value,q:+slq.value,ou:slu.value,buf:+slb.value};if(old)Object.assign(old,v);else d.sales.push(v);save();closeM();show("sales")}
function render(){d.user? (shell()) : login()} render();
