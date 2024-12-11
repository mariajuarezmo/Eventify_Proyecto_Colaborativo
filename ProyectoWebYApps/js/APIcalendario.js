
/**CONEXION A LA API PARA SACAR DATOS PARA EL CALENDARIO-------------------------------------------------------- */


const apiUrl = 'https://api.timezonedb.com/v2.1/get-time-zone?key=IYEXT5XXYKQI&format=json&by=zone&zone=Europe/Madrid';

async function getCurrentDate() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();

        // La clave "formatted" tiene la fecha y hora en formato "YYYY-MM-DD HH:mm:ss"
        const [datePart, timePart] = data.formatted.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);

        // Crear un objeto Date basado en los datos devueltos
        return new Date(year, month - 1, day, hour, minute, second);
    } catch (error) {
        console.error('No se pudo obtener la fecha actual:', error);
        alert('Hubo un problema al conectarse a la API de tiempo. Revisa tu conexión.');
        return new Date(); // Usa la fecha local como alternativa
    }
}

/**CODIGO JAVASCRIPT FRONT-END------------------------------------------------------------------------------ */

function generateCalendar(currentDate) {
    const calendarContainer = document.getElementById('calendar');
    if (!calendarContainer) {
        console.error('El contenedor del calendario no existe.');
        return;
    }
    calendarContainer.innerHTML = ''; // Limpia el contenido previo

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0 = Enero, 11 = Diciembre
    const today = currentDate.getDate();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startDay = firstDayOfMonth.getDay();
    startDay = (startDay === 0) ? 6 : startDay - 1;

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Crear la fila de encabezados
    for (let d of weekDays) {
        const div = document.createElement('div');
        div.classList.add('header');
        div.textContent = d;
        calendarContainer.appendChild(div);
    }

    // Espacios en blanco antes del primer día
    for (let i = 0; i < startDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarContainer.appendChild(emptyDiv);
    }

    // Días del mes
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = day;

        if (day === today) {
            dayDiv.classList.add('hoy');
        }

        calendarContainer.appendChild(dayDiv);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const currentDate = await getCurrentDate();
    generateCalendar(currentDate);
});
