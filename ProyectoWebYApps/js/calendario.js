// URL de la API (puedes cambiar la zona horaria)
const apiUrl = 'https://worldtimeapi.org/api/timezone/Europe/Madrid';

async function getCurrentDate() {
    const response = await fetch(apiUrl);
    const data = await response.json();
    // data.datetime suele ser algo como "2024-12-10T14:52:29+01:00"
    const currentDate = new Date(data.datetime);
    return currentDate;
}

function generateCalendar(currentDate) {
    const calendarContainer = document.getElementById('calendar');
    calendarContainer.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0 = Enero, 11 = Diciembre
    const today = currentDate.getDate();

    // Días del mes actual
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Día de la semana del primer día (0=Domingo, 1=Lunes,...)
    // Queremos que la semana empiece en Lunes
    let startDay = firstDayOfMonth.getDay(); 
    // Ajuste: Si queremos que el lunes sea el primer día de la semana:
    // Por defecto getDay()=0 es Domingo.
    // Podemos ajustar la base para que Lunes=0, Martes=1, ... Domingo=6
    startDay = (startDay === 0) ? 6 : startDay - 1;

    // Nombres de los días de la semana (empezando en Lunes)
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Crear la fila de encabezados
    for (let d of weekDays) {
        const div = document.createElement('div');
        div.classList.add('header');
        div.textContent = d;
        calendarContainer.appendChild(div);
    }

    // Añadir espacios en blanco antes del primer día del mes
    for (let i = 0; i < startDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarContainer.appendChild(emptyDiv);
    }

    // Rellenar los días del mes
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = day;

        // Marcar el día actual
        if (day === today) {
            dayDiv.classList.add('today');
        }

        calendarContainer.appendChild(dayDiv);
    }
}

(async function init() {
    const currentDate = await getCurrentDate();
    generateCalendar(currentDate);
})();
