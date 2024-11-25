const registerButton = document.getElementById('registerButton');
const loginButton = document.getElementById('loginButton');

// Registro de usuario
registerButton.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;

    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    // Enviar datos al backend
    fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: username, contraseña: password, rol: role })
    })
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => console.error('Error:', error));
});

// Inicio de sesión
loginButton.addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    // Enviar datos al backend
    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: username, contraseña: password })
    })
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(error => console.error('Error:', error));
});



// Obtener el formulario
eventForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evitar la recarga de la página

    // Capturar los valores de los campos del formulario
    const titulo = document.getElementById('eventTitle').value.trim();
    const fecha = document.getElementById('eventDate').value;
    const hora = document.getElementById('eventTime').value;
    const ubicacion = document.getElementById('eventLocation').value.trim();
    const organizador = document.getElementById('eventOrganizer').value.trim();
    const descripcion = document.getElementById('eventDescription').value.trim();
    const categoria = document.getElementById('eventCategory').value;

    // Validar que todos los campos estén llenos
    if (!titulo || !fecha || !hora || !ubicacion || !organizador || !descripcion || !categoria) {
        alert('Por favor, completa todos los campos del formulario.');
        return; // Detener el envío si hay campos vacíos
    }

    // Validar que la fecha y la hora no hayan expirado
    const now = new Date(); // Fecha y hora actuales
    const eventDate = new Date(`${fecha}T${hora}`); // Combinar fecha y hora del evento

    if (eventDate < now) {
        alert('La fecha y hora del evento ya han pasado. Por favor, selecciona una fecha y hora futuras.');
        return; // Detener el envío
    }

    // Crear el objeto con los datos
    const eventData = {
        titulo,
        fecha,
        hora,
        ubicacion,
        organizador,
        descripcion,
        categoria
    };

    // Enviar los datos al backend
    fetch('http://localhost:3000/eventRegister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
    })
        .then((response) => response.text())
        .then((data) => {
            // Mostrar la respuesta del servidor
            document.write(data); // Respuesta HTML del backend
        })
        .catch((error) => {
            console.error('Error al enviar el evento:', error);
        });
});



