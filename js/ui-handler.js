if (localStorage.getItem('nexora_session_role') !== 'super_admin') {
    window.location.href = 'index.html'; // Kick out unauthorized users
}

document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('nexora_session_role');
    localStorage.removeItem('nexora_session_id');
    window.location.href = 'index.html';
});