import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext'; 
import { FaCheckCircle, FaGamepad, FaCopy } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './Success.module.css';

const Success = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('orderReference');
  const { clearCart } = useCart();
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    clearCart();

    if (orderId) {
      const savedOrders = JSON.parse(localStorage.getItem('fatality_my_orders') || '[]');
      if (!savedOrders.includes(orderId)) {
        savedOrders.push(orderId);
        localStorage.setItem('fatality_my_orders', JSON.stringify(savedOrders));
      }
    }
  }, [clearCart, orderId]);
  
  const handleCopy = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      toast.success('ID замовлення скопійовано!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.successPage}>
      <div className={styles.successCard}>
        <div className={styles.iconWrapper}>
          <FaCheckCircle className={styles.checkIcon} />
        </div>

        <h1 className={styles.title}>ОПЛАТА УСПІШНА!</h1>
        <p className={styles.subtitle}>
          Твоя консоль мрії вже готується до відправки. <br/>
          Дякуємо, що обрав <strong>FATALITY</strong>.
        </p>

        <div className={styles.orderIdBox}>
          <span className={styles.orderLabel}>Номер твого замовлення:</span>
          <div className={styles.idContainer} onClick={handleCopy} title="Натисни, щоб скопіювати">
            <span className={styles.orderIdText}>{orderId || 'Обробляється...'}</span>
            <FaCopy className={styles.copyIcon} style={{ color: copied ? '#00ff88' : '#666666' }} />
          </div>
        </div>

        <div className={styles.nextSteps}>
          <p>Ми відправили деталі замовлення на твій email.</p>
          <p>Очікуйте номер накладної (ТТН) найближчим часом!</p>
        </div>

        <div className={styles.actionButtons}>
          <Link to="/" className={styles.primaryBtn}>
            <FaGamepad /> ПОВЕРНУТИСЯ НА ГОЛОВНУ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;