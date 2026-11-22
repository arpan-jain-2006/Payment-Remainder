// Global SweetAlert Toast helper
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1e293b',
  color: '#f8fafc',
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Flash Message Handler via hidden data attributes or query params
document.addEventListener('DOMContentLoaded', () => {
  const flashEl = document.getElementById('flash-data');
  if (flashEl) {
    const successMsg = flashEl.getAttribute('data-success');
    const errorMsg = flashEl.getAttribute('data-error');
    const infoMsg = flashEl.getAttribute('data-info');

    if (successMsg) Toast.fire({ icon: 'success', title: successMsg });
    if (errorMsg) Toast.fire({ icon: 'error', title: errorMsg });
    if (infoMsg) Toast.fire({ icon: 'info', title: infoMsg });
  }

  // Quick live table filter
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      const filter = this.value.toLowerCase();
      const rows = document.querySelectorAll('.customer-row');
      let visibleCount = 0;

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter)) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      const noMatchMsg = document.getElementById('noMatchRow');
      if (noMatchMsg) {
        noMatchMsg.style.display = visibleCount === 0 ? '' : 'none';
      }
    });
  }
});

// Confirm deletion dialog
function confirmDelete(customerName, formId) {
  Swal.fire({
    title: 'Are you sure?',
    text: `Do you want to delete ${customerName}? This action cannot be reversed.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#475569',
    confirmButtonText: 'Yes, delete it!',
    background: '#1e293b',
    color: '#f8fafc'
  }).then((result) => {
    if (result.isConfirmed) {
      document.getElementById(formId).submit();
    }
  });
}

// Send manual email reminder with animated loader
async function sendReminderAjax(customerId, buttonElement) {
  const originalHtml = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sending...';

  try {
    const response = await fetch(`/customers/${customerId}/remind`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      Toast.fire({
        icon: data.simulated ? 'info' : 'success',
        title: data.message
      });
      // Update reminder badge if present
      const badge = document.getElementById(`reminder-badge-${customerId}`);
      if (badge) {
        const currentCount = parseInt(badge.getAttribute('data-count') || '0', 10);
        badge.setAttribute('data-count', currentCount + 1);
        badge.innerHTML = `<i class="fa-solid fa-paper-plane me-1"></i> Sent (${currentCount + 1})`;
        badge.classList.remove('d-none');
      }
    } else {
      Toast.fire({
        icon: 'error',
        title: data.message || 'Failed to send reminder'
      });
    }
  } catch (err) {
    Toast.fire({
      icon: 'error',
      title: 'Network error sending reminder'
    });
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHtml;
  }
}
