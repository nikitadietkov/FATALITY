import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './CRMCalendar.module.css';

const locales = { 'uk': uk };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales,
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CRMCalendar() {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch(`${API_BASE}/api/crm/tasks`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                const formattedEvents = data.map(task => ({
                    id: task._id,
                    title: `${task.type === 'Call' ? '📞' : '💬'} ${task.client?.name || 'Клієнт'}`,
                    start: new Date(task.scheduledDate),
                    end: new Date(new Date(task.scheduledDate).getTime() + 60 * 60 * 1000),
                    desc: task.description,
                    status: task.status
                }));
                setTasks(formattedEvents);
            } catch (error) {
                console.error('Помилка завантаження календаря:', error);
            }
        };
        fetchTasks();
    }, []);

    const handleSelectEvent = (event) => {
        alert(`ДЕТАЛІ ЗАВДАННЯ:\n\nОпис: ${event.desc}\nСтатус: ${event.status}`);
    };

    return (
        <div className={styles.calendarContainer}>
            <h2 className={styles.calendarTitle}>📅 Календар Follow-ups</h2>
            <Calendar
                localizer={localizer}
                events={tasks}
                startAccessor="start"
                endAccessor="end"
                onSelectEvent={handleSelectEvent}
                messages={{ next: "Вперед", previous: "Назад", today: "Сьогодні", month: "Місяць", week: "Тиждень", day: "День" }}
            />
        </div>
    );
}