export function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-primary'
  };

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white ${colors[type] || 'bg-primary'} border-0 shadow`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Chiudi"></button>
    </div>
  `;

  const container = document.getElementById('toastContainer');
  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}
