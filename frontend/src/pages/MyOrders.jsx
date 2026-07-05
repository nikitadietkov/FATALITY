import React, { useState, useEffect } from 'react';
import { FaBoxOpen, FaTruck, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import styles from './MyOrders.module.css';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    const savedIds = JSON.parse(localStorage.getItem('fatality_my_orders') || '[]');
    
    if (savedIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BASE_URL}/api/orders/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: savedIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Помилка завантаження замовлень:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status, ttn) => {
    switch(status) {
      case 'Pending': return <span className={`${styles.statusBadge} ${styles.pending}`}><FaClock/> Очікує оплати</span>;
      case 'Paid': return <span className={`${styles.statusBadge} ${styles.paid}`}><FaCheckCircle/> Оплачено</span>;
      case 'Processing': return <span className={`${styles.statusBadge} ${styles.processing}`}><FaBoxOpen/> Готується до відправки</span>;
      case 'Shipped': return (
        <div className={styles.shippedContainer}>
          <span className={`${styles.statusBadge} ${styles.shipped}`}><FaTruck/> Відправлено</span>
          {ttn && <div className={styles.ttnBox}>ТТН: <b>{ttn}</b></div>}
        </div>
      );
      case 'Cancelled': return <span className={`${styles.statusBadge} ${styles.cancelled}`}><FaTimesCircle/> Скасовано</span>;
      default: return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  if (loading) {
    return <div className={styles.loader}>Завантаження ваших даних...</div>;
  }

  return (
    <div className={styles.myOrdersPage}>
      <h1 className={styles.pageTitle}>МОЇ ПОКУПКИ</h1>
      
      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <FaBoxOpen className={styles.emptyIcon} />
          <p>Ви ще не робили замовлень або історія очищена.</p>
          <Link to="/catalog" className={styles.catalogBtn}>ПЕРЕЙТИ В КАТАЛОГ</Link>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {orders.map(order => (
            <div key={order._id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <span className={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <span className={styles.orderId}>ID: {order._id.slice(-6)}</span>
              </div>
              
              <div className={styles.orderBody}>
                <div className={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      <span className={styles.itemName}>{item.title}</span>
                      <span className={styles.itemQty}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.orderTotal}>
                  Сума: <strong>{order.totalAmount} грн</strong>
                </div>
              </div>

              <div className={styles.orderFooter}>
                {renderStatus(order.status, order.trackingNumber)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;