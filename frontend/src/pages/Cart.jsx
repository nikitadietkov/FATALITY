import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  FaMinus, FaPlus, FaTrash, FaShoppingBag,
  FaCheckCircle, FaTag, FaArrowRight, FaExclamationTriangle
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { IMaskInput } from 'react-imask';
import { Link } from 'react-router-dom';
import styles from './Cart.module.css';
import NovaPoshta from './NovaPoshta';
import toast from 'react-hot-toast';

const FORM_STORAGE_KEY = 'fatality_checkout_form';
const FALLBACK_IMAGE = '/images/product-placeholder.png';

const getItemId = (item) => item.id || item._id;

const CartItemRow = memo(function CartItemRow({ item, onIncrement, onDecrement, onRemove }) {
  const itemId = getItemId(item);

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <article className={styles.cartItem}>
      <Link to={`/product/${itemId}`} className={styles.imageWrapper}>
        <img src={item.imageUrl} alt={item.title} loading="lazy" onError={handleImgError} />
      </Link>

      <div className={styles.itemInfo}>
        <Link to={`/product/${itemId}`} className={styles.itemTitleLink}>
          <h3 className={styles.itemTitle}>{item.title}</h3>
        </Link>
        <span className={styles.itemModel}>{item.model} Console</span>
        <span className={styles.itemCondition}>{item.condition}</span>
      </div>

      <div className={styles.quantityControls}>
        <button
          className={styles.quantityBtn}
          onClick={() => onDecrement(itemId)}
          disabled={item.quantity <= 1}
          aria-label={`Зменшити кількість «${item.title}»`}
        >
          <FaMinus />
        </button>
        <span className={styles.quantityValue} aria-live="polite">{item.quantity}</span>
        <button
          className={styles.quantityBtn}
          onClick={() => onIncrement(itemId)}
          aria-label={`Збільшити кількість «${item.title}»`}
        >
          <FaPlus />
        </button>
      </div>

      <div className={styles.itemSubtotal}>
        {(item.price * item.quantity).toLocaleString('uk-UA')} ₴
      </div>

      <button
        className={styles.deleteBtn}
        onClick={() => onRemove(itemId)}
        aria-label={`Видалити «${item.title}» з кошика`}
        title="Видалити"
      >
        <FaTrash />
      </button>
    </article>
  );
});

/* -------------------------------------------------------------------------
   ConfirmClearModal
   Accessible modal: closes on Escape, locks body scroll while open,
   exposes proper dialog semantics for screen readers.
   ------------------------------------------------------------------------- */
function ConfirmClearModal({ onCancel, onConfirm }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div
        className={styles.confirmModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-cart-title"
        onClick={(e) => e.stopPropagation()}
      >
        <FaExclamationTriangle className={styles.warningIcon} aria-hidden="true" />
        <h3 id="clear-cart-title">Очистити кошик?</h3>
        <p>Ви впевнені, що хочете видалити всі товари з кошика? Цю дію неможливо скасувати.</p>
        <div className={styles.confirmActions}>
          <button className={styles.cancelConfirmBtn} onClick={onCancel}>Скасувати</button>
          <button className={styles.proceedConfirmBtn} onClick={onConfirm} autoFocus>Очистити</button>
        </div>
      </div>
    </div>
  );
}

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState(() => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : { name: '', phone: '', email: '', address: '' };
    } catch {
      return { name: '', phone: '', email: '', address: '' };
    }
  });

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const firstFieldRef = useRef(null);
  const messageListenerRef = useRef(null);

  useEffect(() => {
    if (orderSuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [orderSuccess]);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        setIsSubmitting(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (isCheckingOut) firstFieldRef.current?.focus();
  }, [isCheckingOut]);

  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
      } catch {
        // ignore quota/availability errors — persistence is a nice-to-have
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [formData]);

  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, []);

  const finalTotal = useMemo(() => {
    const total = cartTotal - discount;
    return total > 0 ? total : 0;
  }, [cartTotal, discount]);

  const itemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleIncrement = useCallback((id) => updateQuantity(id, 1), [updateQuantity]);
  const handleDecrement = useCallback((id) => updateQuantity(id, -1), [updateQuantity]);
  const handleRemove = useCallback((id) => removeFromCart(id), [removeFromCart]);

  const handleApplyPromo = useCallback(() => {
    if (!promoCode.trim()) {
      toast.error('Введіть промокод');
      return;
    }
    setIsApplyingPromo(true);
    // Mock promo logic — replace with a real API call. NOTE: this is a
    // client-side check only; the discount must still be re-validated
    // server-side before charging, since finalTotal below is client-derived.
    window.setTimeout(() => {
      if (promoCode.toUpperCase() === 'FATALITY10') {
        setDiscount(Math.floor(cartTotal * 0.1));
        toast.success('Промокод успішно застосовано! Знижка 10%');
      } else {
        setDiscount(0);
        toast.error('Недійсний або прострочений промокод');
      }
      setIsApplyingPromo(false);
    }, 300);
  }, [promoCode, cartTotal]);

  const confirmAndClearCart = useCallback(() => {
    clearCart();
    setDiscount(0);
    setShowClearConfirm(false);
    toast('Кошик очищено', { icon: '🗑️' });
  }, [clearCart]);

  const submitOrder = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.address) {
      toast.error('Будь ласка, оберіть місто та відділення Нової Пошти зі списку');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Ініціалізація безпечного з\'єднання...');

    const orderData = {
      customerName: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      items: cartItems.map((item) => ({
        productId: getItemId(item),
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
          messageListenerRef.current = null;
        }
      };

      messageListenerRef.current = handleWidgetClose;
      window.addEventListener('message', handleWidgetClose);

      wayforpay.run({
        merchantAccount: pd.merchantAccount,
        merchantDomainName: pd.merchantDomainName,
        authorizationType: 'SimpleSignature',
        merchantSignature: pd.merchantSignature,
        orderReference: pd.orderReference,
        orderDate: pd.orderDate,
        amount: pd.amount,
        currency: pd.currency,
        productName: pd.productName,
        productPrice: pd.productPrice,
        productCount: pd.productCount,
        clientFirstName: formData.name.split(' ')[0] || 'Клієнт',
        clientLastName: formData.name.split(' ').slice(1).join(' ') || '',
        clientPhone: formData.phone,
        language: 'UA',
        serviceUrl: pd.serviceUrl,
        returnUrl: pd.returnUrl
      },
      function () {
        window.removeEventListener('message', handleWidgetClose);
        messageListenerRef.current = null;
        setOrderSuccess(pd.orderReference);
        clearCart();
        setDiscount(0);
        localStorage.removeItem(FORM_STORAGE_KEY);
        setIsSubmitting(false);
      },
      function () {
        window.removeEventListener('message', handleWidgetClose);
        messageListenerRef.current = null;
        toast.error('Оплата відхилена банком. Перевірте ліміт інтернет-оплат.');
        setIsSubmitting(false);
      },
      function () {
        window.removeEventListener('message', handleWidgetClose);
        messageListenerRef.current = null;
        toast('Оплата в процесі обробки', { icon: '⏳' });
        setIsSubmitting(false);
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Втрачено зв\'язок із сервером.', { id: toastId });
      setIsSubmitting(false);
    }
  }, [cartItems, clearCart, discount, finalTotal, formData, promoCode]);

  if (orderSuccess) {
    return (
      <div className={styles.successContainer}>
        <Helmet><title>Замовлення прийнято | FATALITY</title></Helmet>
        <div className={styles.successIconWrapper}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        <h2 className={styles.successTitle}>ЗАМОВЛЕННЯ ПРИЙНЯТО!</h2>
        <p className={styles.successText}>
          Дякуємо за покупку у FATALITY. Ваш платіж успішно оброблено. <br />
          Кібер-менеджер вже готує вашу консоль до відправки. <br />
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

  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Helmet><title>Кошик порожній | FATALITY</title></Helmet>
        <div className={styles.emptyIconPulse}>
          <FaShoppingBag className={styles.emptyIcon} />
        </div>
        <h2 className={styles.emptyTitle}>Ваш кошик порожній</h2>
        <p className={styles.emptyText}>Час оновити свій геймерський арсенал. <br /> Перегляньте наші пропозиції в каталозі.</p>
        <Link to="/" className={styles.backBtn}>
          Відкрити каталог <FaArrowRight className={styles.btnArrow} />
        </Link>
      </div>
    );
  }

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
              <CartItemRow
                key={getItemId(item)}
                item={item}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onRemove={handleRemove}
              />
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
                <span>Товари ({itemCount} шт.)</span>
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

            {!isCheckingOut && (
              <div className={styles.promoCodeWrapper}>
                <div className={styles.promoInputGroup}>
                  <FaTag className={styles.promoIcon} aria-hidden="true" />
                  <label htmlFor="promoCode" className={styles.visuallyHidden}>Промокод</label>
                  <input
                    id="promoCode"
                    type="text"
                    placeholder="Маєте промокод?"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    className={styles.promoInput}
                  />
                  <button
                    onClick={handleApplyPromo}
                    className={styles.applyPromoBtn}
                    disabled={isApplyingPromo}
                  >
                    {isApplyingPromo ? <span className={styles.spinner} aria-hidden="true" /> : 'Додати'}
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
                    <label htmlFor="name" className={styles.visuallyHidden}>ПІБ отримувача</label>
                    <input ref={firstFieldRef} id="name" type="text" name="name" placeholder="ПІБ отримувача" required className={styles.inputField} value={formData.name} onChange={handleInputChange} disabled={isSubmitting}/>

                    <label htmlFor="email" className={styles.visuallyHidden}>Email</label>
                    <input id="email" type="email" name="email" placeholder="Email (для чеку)" required className={styles.inputField} value={formData.email} onChange={handleInputChange} disabled={isSubmitting} />

                    <label htmlFor="phone" className={styles.visuallyHidden}>Телефон</label>
                    <IMaskInput
                      id="phone"
                      name="phone"
                      type="tel"
                      mask="+38 (000) 000-00-00"
                      placeholder="+38 (0XX) XXX-XX-XX"
                      required
                      className={styles.inputField}
                      value={formData.phone}
                      unmask={false} 
                      onAccept={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="address" className={styles.visuallyHidden}>Адреса доставки</label>
                    <NovaPoshta
                      value={formData.address}
                      onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
                      disabled={isSubmitting}
                      styles={styles}
                    />
                  </div>

                  <div className={styles.termsGroup}>
                    <label className={styles.termsLabel}>
                      <input
                        type="checkbox"
                        className={styles.termsCheckbox}
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <span className={styles.termsText}>
                        Я погоджуюсь з умовами <Link to="/oferta" target="_blank" rel="noopener noreferrer">Публічної оферти</Link> та правилами обробки персональних даних
                      </span>
                    </label>
                  </div>
                  
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => setIsCheckingOut(false)} disabled={isSubmitting}>
                      Назад
                    </button>
                    {/* Кнопка тепер перевіряє agreedToTerms */}
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !agreedToTerms}>
                      {isSubmitting
                        ? <><span className={styles.spinner} aria-hidden="true" /> Обробка...</>
                        : `Оплатити ${finalTotal.toLocaleString('uk-UA')} ₴`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showClearConfirm && (
        <ConfirmClearModal
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={confirmAndClearCart}
        />
      )}
    </div>
  );
}