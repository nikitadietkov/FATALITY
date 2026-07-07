import { useState, useEffect, useMemo } from 'react';
import { 
  FaMinus, FaPlus, FaTrash, FaShoppingBag, 
  FaCheckCircle, FaTag, FaArrowRight, FaExclamationTriangle 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './Cart.module.css';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  
  // States
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // User Form State (with LocalStorage persistence for better UX)
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem('fatality_checkout_form');
    return savedData ? JSON.parse(savedData) : { name: '', phone: '', email: '', address: '' };
  });

  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isCheckingOut, orderSuccess]);

  // Persist form data so users don't lose input on accidental refresh
  useEffect(() => {
    localStorage.setItem('fatality_checkout_form', JSON.stringify(formData));
  }, [formData]);

  // Derived Values
  const finalTotal = useMemo(() => {
    const total = cartTotal - discount;
    return total > 0 ? total : 0;
  }, [cartTotal, discount]);

  // Handlers
  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return toast.error('Введіть промокод');
    // Mock Promo Logic (can be replaced with API call)
    if (promoCode.toUpperCase() === 'FATALITY10') {
      const calculatedDiscount = Math.floor(cartTotal * 0.1);
      setDiscount(calculatedDiscount);
      toast.success('Промокод успішно застосовано! Знижка 10%');
    } else {
      setDiscount(0);
      toast.error('Недійсний або прострочений промокод');
    }
  };

  const confirmAndClearCart = () => {
    clearCart();
    setDiscount(0);
    setShowClearConfirm(false);
    toast('Кошик очищено', { icon: '🗑️' });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Ініціалізація безпечного з\'єднання...');
    
    const orderData = {
      customerName: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      items: cartItems.map(item => ({
        productId: item._id || item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: finalTotal,
      appliedPromo: discount > 0 ? promoCode : null
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Помилка при створенні замовлення.');

      const data = await response.json();
      const pd = data.paymentData;
      
      toast.dismiss(toastId);

      if (typeof window.Wayforpay === 'undefined') {
        toast.error('Модуль оплати недоступний. Перевірте підключення або блокувальник реклами.');
        setIsSubmitting(false);
        return;
      }

      const wayforpay = new window.Wayforpay();

      const handleWidgetClose = (event) => {
        if (event.data === 'WfpWidgetEventClose') {
          toast.error('Транзакцію перервано користувачем.', { icon: '✖️' });
          setIsSubmitting(false); 
          window.removeEventListener('message', handleWidgetClose);
        }
      };

      window.addEventListener('message', handleWidgetClose);

      wayforpay.run({
          merchantAccount: pd.merchantAccount,
          merchantDomainName: pd.merchantDomainName,
          authorizationType: "SimpleSignature",
          merchantSignature: pd.merchantSignature,
          orderReference: pd.orderReference,
          orderDate: pd.orderDate,
          amount: pd.amount,
          currency: pd.currency,
          productName: pd.productName,
          productPrice: pd.productPrice,
          productCount: pd.productCount,
          clientFirstName: formData.name.split(' ')[0] || "Клієнт",
          clientLastName: formData.name.split(' ').slice(1).join(' ') || "",
          clientPhone: formData.phone,
          language: "UA",
          serviceUrl: pd.serviceUrl,
          returnUrl: pd.returnUrl
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          setOrderSuccess(pd.orderReference); 
          clearCart();
          setDiscount(0);
          localStorage.removeItem('fatality_checkout_form'); // clear saved data on success
          setIsSubmitting(false);
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          toast.error('Оплата відхилена банком. Перевірте ліміт інтернет-оплат.');
          setIsSubmitting(false);
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          toast('Оплата в процесі обробки', { icon: '⏳' });
          setIsSubmitting(false);
      });

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Втрачено зв\'язок із сервером.', { id: toastId });
      setIsSubmitting(false);
    }
  };

  // --- RENDER SUCCESS STATE ---
  if (orderSuccess) {
    return (
      <div className={styles.successContainer}>
        <Helmet><title>Замовлення прийнято | FATALITY</title></Helmet>
        <div className={styles.successIconWrapper}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        <h2 className={styles.successTitle}>ЗАМОВЛЕННЯ ПРИЙНЯТО!</h2>
        <p className={styles.successText}>
          Дякуємо за покупку у FATALITY. Ваш платіж успішно оброблено. <br/>
          Кібер-менеджер вже готує вашу консоль до відправки. <br/>
          <b className={styles.highlightText}>Збережіть ID замовлення для відстеження статусу.</b>
        </p>
        <div className={styles.orderIdBox}>
          <span className={styles.orderIdLabel}>ID вашого замовлення:</span>
          <span className={styles.orderIdValue}>{orderSuccess}</span>
        </div>
        <div className={styles.successActions}>
          <Link to="/track-order" className={styles.trackBtn}>Відстежити статус</Link>
          <Link to="/" className={styles.homeBtn}>Повернутися до каталогу</Link>
        </div>
      </div>
    );
  }

  // --- RENDER EMPTY STATE ---
  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Helmet><title>Кошик порожній | FATALITY</title></Helmet>
        <div className={styles.emptyIconPulse}>
          <FaShoppingBag className={styles.emptyIcon} />
        </div>
        <h2 className={styles.emptyTitle}>Ваш кошик порожній</h2>
        <p className={styles.emptyText}>Час оновити свій геймерський арсенал. <br/> Перегляньте наші пропозиції в каталозі.</p>
        <Link to="/" className={styles.backBtn}>
          Відкрити каталог <FaArrowRight className={styles.btnArrow} />
        </Link>
      </div>
    );
  }

  // --- RENDER CART STATE ---
  return (
    <div className={styles.cartPage}>
      <Helmet><title>Кошик | FATALITY</title></Helmet>
      
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Ваш кошик</h2>
        <span className={styles.itemsCountBadge}>{cartItems.length} позицій</span>
      </div>
      
      <div className={styles.cartContent}>
        <div className={styles.itemsSection}>
          <div className={styles.itemsList}>
            {cartItems.map((item) => (
              <article key={item.id || item._id} className={styles.cartItem}>
                <Link to={`/product/${item.id || item._id}`} className={styles.imageWrapper}>
                  <img src={item.imageUrl} alt={item.title} loading="lazy" />
                </Link>

                <div className={styles.itemInfo}>
                  <Link to={`/product/${item.id || item._id}`} className={styles.itemTitleLink}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                  </Link>
                  <span className={styles.itemModel}>{item.model} Console</span>
                  <span className={styles.itemCondition}>{item.condition}</span>
                </div>

                <div className={styles.quantityControls}>
                  <button 
                    className={styles.quantityBtn} 
                    onClick={() => updateQuantity(item.id || item._id, -1)}
                    disabled={item.quantity <= 1}
                    aria-label="Зменшити кількість"
                  >
                    <FaMinus />
                  </button>
                  <span className={styles.quantityValue}>{item.quantity}</span>
                  <button 
                    className={styles.quantityBtn} 
                    onClick={() => updateQuantity(item.id || item._id, 1)}
                    aria-label="Збільшити кількість"
                  >
                    <FaPlus />
                  </button>
                </div>

                <div className={styles.itemSubtotal}>
                  {(item.price * item.quantity).toLocaleString('uk-UA')} ₴
                </div>

                <button 
                  className={styles.deleteBtn} 
                  onClick={() => removeFromCart(item.id || item._id)}
                  aria-label="Видалити товар"
                  title="Видалити"
                >
                  <FaTrash />
                </button>
              </article>
            ))}
          </div>
          
          <div className={styles.cartActions}>
            <Link to="/" className={styles.continueShopping}>
              &larr; Продовжити покупки
            </Link>
            <button className={styles.clearCartBtn} onClick={() => setShowClearConfirm(true)}>
              Очистити кошик
            </button>
          </div>
        </div>

        <aside className={styles.summarySection}>
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryTitle}>Підсумок</h3>
            
            <div className={styles.summaryDetails}>
              <div className={styles.summaryRow}>
                <span>Товари ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} шт.)</span>
                <span>{cartTotal.toLocaleString('uk-UA')} ₴</span>
              </div>
              
              {discount > 0 && (
                <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                  <span>Знижка (Промокод)</span>
                  <span>-{discount.toLocaleString('uk-UA')} ₴</span>
                </div>
              )}

              <div className={styles.summaryRow}>
                <span>Доставка НП</span>
                <span className={styles.freeShipping}>За тарифами перевізника</span>
              </div>
            </div>

            {/* Promo Code Box */}
            {!isCheckingOut && (
              <div className={styles.promoCodeWrapper}>
                <div className={styles.promoInputGroup}>
                  <FaTag className={styles.promoIcon} />
                  <input 
                    type="text" 
                    placeholder="Маєте промокод?" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className={styles.promoInput}
                  />
                  <button onClick={handleApplyPromo} className={styles.applyPromoBtn}>
                    Застосувати
                  </button>
                </div>
              </div>
            )}
            
            <hr className={styles.divider} />
            
            <div className={styles.totalRow}>
              <span>До сплати:</span>
              <span className={styles.totalPrice}>{finalTotal.toLocaleString('uk-UA')} ₴</span>
            </div>

            {!isCheckingOut ? (
              <button className={styles.checkoutBtn} onClick={() => setIsCheckingOut(true)}>
                Перейти до оформлення <FaArrowRight className={styles.checkoutArrow} />
              </button>
            ) : (
              <div className={styles.checkoutWrapper}>
                <h4 className={styles.checkoutSubtitle}>Дані отримувача</h4>
                <form className={styles.checkoutForm} onSubmit={submitOrder}>
                  <div className={styles.formGroup}>
                    <input type="text" name="name" placeholder="ПІБ отримувача" required className={styles.inputField} value={formData.name} onChange={handleInputChange} />
                    <input type="email" name="email" placeholder="Email (для чеку)" required className={styles.inputField} value={formData.email} onChange={handleInputChange} />
                    <input type="tel" name="phone" placeholder="+38 (0XX) XXX-XX-XX" required className={styles.inputField} value={formData.phone} onChange={handleInputChange} />
                    <input type="text" name="address" placeholder="Місто, № відділення Нової Пошти" required className={styles.inputField} value={formData.address} onChange={handleInputChange} />
                  </div>
                  
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setIsCheckingOut(false)} disabled={isSubmitting}>
                      Назад
                    </button>
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                      {isSubmitting ? 'Обробка...' : `Оплатити ${finalTotal.toLocaleString('uk-UA')} ₴`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <FaExclamationTriangle className={styles.warningIcon} />
            <h3>Очистити кошик?</h3>
            <p>Ви впевнені, що хочете видалити всі товари з кошика? Цю дію неможливо скасувати.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelConfirmBtn} onClick={() => setShowClearConfirm(false)}>Скасувати</button>
              <button className={styles.proceedConfirmBtn} onClick={confirmAndClearCart}>Очистити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}