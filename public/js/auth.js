document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const empId = document.getElementById('empId').value.trim();
            const authKey = document.getElementById('authKey').value;
            const btn = document.getElementById('authBtn');
            const errorMsg = document.getElementById('errorMsg');

            btn.textContent = "Verifying Credentials...";
            btn.disabled = true;
            errorMsg.style.display = "none";

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ empId, passkey: authKey })
                });

                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('nexora_session_role', result.role);
                    localStorage.setItem('nexora_session_name', result.name);

                    window.location.href = (result.role === 'MD' || result.role === 'Manager') ? 'dashboard.html' : 'tasks.html';
                } else {
                    errorMsg.textContent = result.message || "Authentication failed.";
                    errorMsg.style.display = "block";
                    btn.textContent = "Authenticate";
                    btn.disabled = false;
                }
            } catch (error) {
                errorMsg.textContent = "Unable to connect to authentication server.";
                errorMsg.style.display = "block";
                btn.textContent = "Authenticate";
                btn.disabled = false;
            }
        });
    }
});