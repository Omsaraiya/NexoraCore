document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const empId = document.getElementById('empId').value.trim();
            const authKey = document.getElementById('authKey').value;
            const btn = document.getElementById('authBtn');
            const errorMsg = document.getElementById('errorMsg');

            // UI UX Feedback
            btn.textContent = "Verifying Credentials...";
            btn.disabled = true;
            errorMsg.style.display = "none";

            try {
                // Call our real Node.js Backend
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ empId: empId, passkey: authKey })
                });

                const result = await response.json();

                if (result.success) {
                    // FIX: We must store BOTH the role AND the name!
                    localStorage.setItem('nexora_session_role', result.role);
                    localStorage.setItem('nexora_session_name', result.name);

                    // Route based on real database designation
                    if (result.role === 'MD' || result.role === 'Manager') {
                        window.location.href = 'dashboard.html';
                    } else {
                        window.location.href = 'tasks.html';
                    }
                } else {
                    // Show exact error message from server
                    errorMsg.textContent = result.message;
                    errorMsg.style.display = "block";
                    btn.textContent = "Authenticate";
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Auth Error:", error);
                errorMsg.textContent = "Unable to connect to authentication server.";
                errorMsg.style.display = "block";
                btn.textContent = "Authenticate";
                btn.disabled = false;
            }
        });
    }
});