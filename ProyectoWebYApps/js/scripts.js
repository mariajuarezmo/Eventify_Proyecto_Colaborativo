/*
const registerButton = document.getElementById('registerButton');
const loginButton = document.getElementById('loginButton');
const adminActions = document.getElementById('adminActions');
const userActions = document.getElementById('userActions');
const approvalList = document.getElementById('approvalList');
const createEventButton = document.getElementById('createEvent');
const createEventButtonAdmin = document.getElementById('createEventButton');
const approveEventButton = document.getElementById('approveEventButton');
const viewEventsButton = document.getElementById('viewEventsButton');

let users = []; // Almacenamiento local de usuarios
let events = []; // Lista de eventos publicados
let pendingEvents = []; // Lista de eventos pendientes de aprobación
let approvedEvents = []; // Lista de eventos aprobados

// Registro de usuario
registerButton.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;

    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    let userExists = users.some(user => user.username === username);

    if (userExists) {
        alert('El usuario ya está registrado.');
    } else {
        users.push({ username, password, role });
        alert('Usuario registrado con éxito.');
        console.log('Usuarios registrados:', users);
    }
});

// Inicio de sesión
loginButton.addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        alert('Inicio de sesión exitoso.');
        if (user.role === 'Admin') {
            adminActions.className = 'visible';
            userActions.className = 'hidden';
            viewEventsButton.className = 'visible';
        } else {
            userActions.className = 'visible';
            adminActions.className = 'hidden';
            viewEventsButton.className = 'visible';
        }
    } else {
        alert('Usuario no registrado o contraseña incorrecta.');
    }
});

// Crear evento por USERS
createEventButton.addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const organizer = document.getElementById('eventOrganizer').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const category = document.getElementById('eventCategory').value;

    if (!title || !date || !time || !location || !organizer || !description || !category) {
        alert('Por favor, completa todos los campos del evento.');
        return;
    }

    const event = {
        title,
        date,
        time,
        location,
        organizer,
        description,
        category,
        status: 'Pendiente',
    };

    pendingEvents.push(event);
    alert('Evento creado y enviado para aprobación.');
    console.log('Eventos pendientes:', pendingEvents);
});

// Crear evento por ADMIN
createEventButtonAdmin.addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const organizer = document.getElementById('eventOrganizer').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const category = document.getElementById('eventCategory').value;

    if (!title || !date || !time || !location || !organizer || !description || !category) {
        alert('Por favor, completa todos los campos del evento.');
        return;
    }

    const event = {
        title,
        date,
        time,
        location,
        organizer,
        description,
        category,
        status: 'Aprobado',
    };

    approvedEvents.push(event); // Agregar evento directamente a los aprobados
    alert('Evento creado y aprobado.');
    console.log('Eventos aprobados:', approvedEvents);
});

// Aprobar eventos
approveEventButton.addEventListener('click', () => {
    adminActions.className = 'hidden';
    approvalList.className = 'visible';
    const eventApprovalList = document.getElementById('eventApprovalList');
    eventApprovalList.innerHTML = '';

    pendingEvents.forEach((event, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${event.title} - ${event.date} - ${event.category}`;

        // Botón para aprobar el evento
        const approveButton = document.createElement('button');
        approveButton.textContent = 'Aprobar';
        approveButton.onclick = () => {
            approvedEvents.push({ ...event, status: 'Publicado' });
            pendingEvents.splice(index, 1);
            alert('Evento aprobado.');
            listItem.remove();
            console.log('Eventos aprobados:', approvedEvents);
        };

        // Botón para denegar el evento
        const denyButton = document.createElement('button');
        denyButton.textContent = 'Denegar';
        denyButton.onclick = () => {
            pendingEvents.splice(index, 1);
            alert('Evento denegado.');
            listItem.remove();
            console.log('Eventos pendientes actualizados:', pendingEvents);
        };

        listItem.appendChild(approveButton);
        listItem.appendChild(denyButton);
        eventApprovalList.appendChild(listItem);
    });
});

// Ver eventos aprobados
viewEventsButton.addEventListener('click', () => {
    let approvedEventsList = 'Eventos Aprobados:\n';
    
    for (let i = 0; i < approvedEvents.length; i++) {
        const event = approvedEvents[i];
        approvedEventsList += `Título: ${event.title}, Fecha: ${event.date}, Hora: ${event.time}, Categoría: ${event.category}\n`;
    }

    if (approvedEvents.length === 0) {
        approvedEventsList += 'No hay eventos aprobados aún.';
    }

    alert(approvedEventsList);
});
*/

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
const eventForm = document.getElementById('eventForm');

// Escuchar el evento 'submit' del formulario
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




