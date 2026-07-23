// admin/js/auth.js
async function checkAuth() {
    if (!window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    // If not authenticated and trying to access dashboard, redirect to login
    if (!session && window.location.pathname.endsWith('dashboard.html')) {
        window.location.href = './index.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Logout Button Event Handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
            }
            window.location.href = './index.html';
        });
    }
});