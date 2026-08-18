document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const id = document.getElementById('empId').value.trim();
            const pass = document.getElementById('authKey').value.trim();
            const errorMsg = document.getElementById('errorMsg');
            const btn = document.querySelector('.btn-primary');

            btn.textContent = "Authenticating...";
            btn.disabled = true;
            errorMsg.style.display = 'none';

            setTimeout(() => {
                if (id === 'MD001' && pass === 'admin123') {
                    localStorage.setItem('nexora_session_role', 'super_admin');
                    localStorage.setItem('nexora_user_id', 'MD001');
                    window.location.href = 'dashboard.html';
                }
                else if (id === 'STAFF' && pass === 'staff123') {
                    localStorage.setItem('nexora_session_role', 'operator');
                    localStorage.setItem('nexora_user_id', 'Staff');
                    window.location.href = 'tasks.html';
                }
                else {
                    errorMsg.textContent = "Invalid Credentials. Access Denied.";
                    errorMsg.style.display = 'block';
                    btn.textContent = "Authenticate";
                    btn.disabled = false;
                }
            }, 800);
        });
    }
});