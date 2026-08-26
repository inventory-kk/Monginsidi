document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.getElementById('page-title');
    const mainContent = document.getElementById('main-content');

    // Logic Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        loginView.classList.remove('active');
        loginView.classList.add('hidden');
        
        appView.classList.remove('hidden');
        appView.classList.add('active');

        renderDashboard();
    });

    // Logic Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('data-target');
            pageTitle.textContent = target.charAt(0).toUpperCase() + target.slice(1);

            if (target === 'dashboard') {
                renderDashboard();
            } else if (target === 'inventory') {
                mainContent.innerHTML = '<h3>Master Item & Stock</h3><p>Modul inventory akan tampil di sini.</p>';
            } else if (target === 'operations') {
                mainContent.innerHTML = '<h3>Operations</h3><p>Modul Daily SO & Orders akan tampil di sini.</p>';
            }
        });
    });

    function renderDashboard() {
        mainContent.innerHTML = `
            <div style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h4 style="color: #6B7280; font-size: 13px; margin-bottom: 8px;">TOTAL ITEMS</h4>
                <div style="font-size: 28px; font-weight: bold; color: #3E2723;">126</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="color: #6B7280; font-size: 12px; margin-bottom: 4px;">RAW MATERIAL</h4>
                    <div style="font-size: 20px; font-weight: bold;">82</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h4 style="color: #6B7280; font-size: 12px; margin-bottom: 4px;">LOW STOCK</h4>
                    <div style="font-size: 20px; font-weight: bold; color: #D84315;">8</div>
                </div>
            </div>
        `;
    }
});
