
function showAlert(type, message) {
    Swal.fire({
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 2000
    });
}

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success')) showAlert('success', urlParams.get('success'));
if (urlParams.get('error')) showAlert('error', urlParams.get('error'));