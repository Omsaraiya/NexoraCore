document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const empId = document.getElementById('empId').value.trim();
    const authKey = document.getElementById('authKey').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.style.display = 'none';

    if (empId === 'MD001' && authKey === 'admin123') {

        localStorage.setItem('nexora_session_role', 'super_admin');
        localStorage.setItem('nexora_session_id', empId);

        window.location.href = 'dashboard.html';

    } else {
        errorMsg.textContent = 'Invalid Employee ID or Access Key. Access Denied.';
        errorMsg.style.display = 'block';
    }
});