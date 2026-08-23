document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const empId = document.getElementById('empId').value.trim();
            const authKey = document.getElementById('authKey').value;
            const btn = document.getElementById('authBtn');
            const errorMsg = document.getElementById('errorMsg');

            // UI UX Feedback: Visual loading state
            btn.textContent = "Verifying MFA...";
            btn.disabled = true;
            errorMsg.style.display = "none";

            // Simulate lightweight local network check (zero API cost)
            setTimeout(() => {
                // MD / Admin Access Route (God View)
                if (empId === 'MD001' && authKey === 'admin123') {
                    localStorage.setItem('nexora_session_role', 'MD');
                    window.location.href = 'dashboard.html';
                }
                // Floor Staff Access Route (Restricted to Task View)
                else if (empId === 'STAFF' && authKey === 'staff123') {
                    localStorage.setItem('nexora_session_role', 'Staff');
                    window.location.href = 'tasks.html';
                }
                // Authentication Failed Route
                else {
                    errorMsg.textContent = "Authentication Failed. Invalid ID or Passkey.";
                    errorMsg.style.display = "block";
                    btn.textContent = "Authenticate";
                    btn.disabled = false;
                }
            }, 600); // 600ms delay for premium feel
        });
    }
});