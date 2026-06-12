import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaSearch, FaBoxOpen, FaTruck, FaCheck, FaTimesCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './TrackOrder.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TrackOrder() {
  const [formData, setFormData] = useState({ orderId: '', phone: '' });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    const cleanId = formData.orderId.trim();
    const cleanPhone = formData.phone.trim();

    if (!cleanId || !cleanPhone) return toast.error('Заповніть всі поля!');

    setLoading(true);
    const toastId = toast.loading('Пошук у базі даних...');

    try {
      const res = await fetch(`${API_BASE}/api/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cleanId, phone: cleanPhone })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Помилка пошуку');
      }

      setOrder(data);
      toast.success('Замовлення знайдено!', { id: toastId });
    } catch (err) {
      setOrder(null);
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const renderProgress = (status) => {
    if (status === 'Cancelled') {
      return (
        <div className={styles.cancelledState}>
          <FaTimesCircle className={styles.cancelledIcon} />
          <h3>ЗАМОВЛЕННЯ СКАСОВАНО</h3>
          <p>Зв'яжіться з підтримкою для отримання деталей.</p>
        </div>
      );
    }

    // 🔥 ЗАМІНЕНО FaCheckCircle на FaCheck
    const steps = [
      { id: 'Pending', label: 'Очікує оплати', icon: <FaClock /> },
      { id: 'Paid', label: 'Оплачено', icon: <FaCheck /> },
      { id: 'Shipped', label: 'Відправлено', icon: <FaTruck /> }
    ];

    let currentStepIndex = 0;
    if (status === 'Paid') currentStepIndex = 1;
    if (status === 'Shipped') currentStepIndex = 2;

    return (
      <div className={styles.progressContainer}>
        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex;
          const isLastActive = index === currentStepIndex;
          
          return (
            <div key={step.id} className={`${styles.step} ${isActive ? styles.activeStep : ''} ${isLastActive ? styles.pulsingStep : ''}`}>
              <div className={styles.stepIcon}>{step.icon}</div>
              <span className={styles.stepLabel}>{step.label}</span>
              {index < steps.length - 1 && <div className={styles.stepLine}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.trackPage}>
      <Helmet>
        <title>Статус замовлення | FATALITY</title>
      </Helmet>

      <div className={styles.headerBlock}>
        <FaBoxOpen className={styles.headerIcon} />
        <h1 className={styles.pageTitle}>Відстеження замовлення</h1>
        <p className={styles.subtitle}>Введіть ID замовлення та номер телефону для перевірки статусу</p>
      </div>

      <div className={styles.searchContainer}>
        <form onSubmit={handleTrack} className={styles.searchForm}>
          <input
            type="text"
            placeholder="ID Замовлення (напр. 64a2b...)"
            value={formData.orderId}
            onChange={e => setFormData({ ...formData, orderId: e.target.value })}
            className={styles.inputField}
          />
          <input
            type="tel"
            placeholder="Ваш номер телефону"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className={styles.inputField}
          />
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'ПОШУК...' : <><FaSearch /> ЗНАЙТИ</>}
          </button>
        </form>
      </div>

      {order && (
        <div className={styles.resultContainer}>
          <div className={styles.orderMeta}>
            <div className={styles.orderIdBlock}>
              <span className={styles.orderIdLabel}>ID:</span>
              <span className={styles.orderIdBadge}>{order._id}</span>
            </div>
            <span className={styles.orderDate}>
              Створено: {new Date(order.createdAt).toLocaleDateString('uk-UA')}
            </span>
          </div>

          {renderProgress(order.status)}

          {order.status === 'Shipped' && order.trackingNumber && (
            <div className={styles.ttnBlock}>
              <span className={styles.ttnLabel}>ТТН Нової Пошти:</span>
              <span className={styles.ttnNumber}>{order.trackingNumber}</span>
              <p className={styles.ttnHint}>Відстежуйте посилку у додатку Нової Пошти.</p>
            </div>
          )}

          <div className={styles.orderSummary}>
            <h3>Склад замовлення:</h3>
            <ul className={styles.itemsList}>
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <span>{item.title} <b className={styles.itemMultiplier}>x{item.quantity}</b></span>
                  <span className={styles.itemPriceLine}>{item.price * item.quantity} грн</span>
                </li>
              ))}
            </ul>
            <div className={styles.totalBlock}>
              <span>Всього до сплати:</span>
              <span className={styles.totalPrice}>{order.totalAmount} грн</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}