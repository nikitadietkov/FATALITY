import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaArrowLeft } from 'react-icons/fa';
import styles from './ClientCard.module.css'; // ПРАВИЛЬНЕ ПІДКЛЮЧЕННЯ

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Замість useParams, ми тепер приймаємо clientId як пропс з Admin.jsx
export default function ClientCard({ clientId, onBack }) {
    const [client, setClient] = useState(null);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    useEffect(() => {
        const fetchClient = async () => {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/api/crm/clients/${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setClient(data);
        };
        fetchClient();
    }, [clientId]);

    const handleAddTask = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/api/crm/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ client: clientId, type: 'Call', scheduledDate: newTaskDate, description: newTaskDesc })
        });
        
        if (res.ok) {
            toast.success('Нагадування заплановано!');
            setNewTaskDesc('');
            setNewTaskDate('');
        } else {
            toast.error('Помилка планування');
        }
    };

    if (!client) return <div style={{ color: '#fff' }}>Завантаження картки...</div>;

    return (
        <div className={styles.cardWrapper}>
            <button className={styles.backBtn} onClick={onBack}>
                <FaArrowLeft /> Повернутися до списку
            </button>

            <div className={styles.clientHeader}>
                <h1 className={styles.clientName}>{client.name}</h1>
                <span className={styles.clientContact}>📞 {client.phone} {client.email && `| 📧 ${client.email}`}</span>
            </div>

            <div className={styles.grid}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>🛒 Що купив?</h2>
                    {client.orders && client.orders.length > 0 ? (
                        client.orders.map(order => (
                            <div key={order._id} className={styles.orderItem}>
                                <div className={styles.orderHeader}>
                                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                    <span className={styles.orderTotal}>{order.totalAmount} грн</span>
                                </div>
                                <ul style={{ paddingLeft: '20px', margin: 0, color: '#aaa', fontSize: '14px' }}>
                                    {order.items.map((item, idx) => (
                                        <li key={idx}>
                                            <Link to={`/product/${item._id}`} className={styles.productLink}>
                                                {item.title}
                                            </Link> x{item.quantity}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#666' }}>Немає успішних покупок.</p>
                    )}
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ color: '#ff0000' }}>⏰ Запланувати дзвінок</h2>
                    <form onSubmit={handleAddTask}>
                        <div className={styles.formGroup}>
                            <label>Дата та час:</label>
                            <input type="datetime-local" className={styles.input} value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Про що говорили / План:</label>
                            <textarea rows="3" className={styles.input} value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} required placeholder="Запропонувати обмін..." />
                        </div>
                        <button type="submit" className={styles.submitBtn}>Запланувати подію</button>
                    </form>
                </div>
            </div>
        </div>
    );
}