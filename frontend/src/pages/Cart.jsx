import { useState, useEffect } from 'react';
import { FaMinus, FaPlus, FaTrash, FaShoppingBag, FaCheckCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './Cart.module.css';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isCheckingOut, orderSuccess]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Створення замовлення...');
    
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
      totalAmount: cartTotal
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
        toast.error('Модуль оплати недоступний. Перевірте підключення до інтернету.');
        setIsSubmitting(false);
        return;
      }

      const wayforpay = new window.Wayforpay();

      const handleWidgetClose = (event) => {
        if (event.data === 'WfpWidgetEventClose') {
          toast.error('Оплата скасована. Ви закрили вікно.', { icon: '✖️' });
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
          serviceUrl: pd.serviceUrl
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          setOrderSuccess(pd.orderReference); 
          clearCart();
          setIsSubmitting(false);
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          toast.error('Оплата була відхилена банком або забракло коштів.');
          setIsSubmitting(false);
      },
      function (response) {
          window.removeEventListener('message', handleWidgetClose);
          toast('Оплата в обробці', { icon: 'ℹ️' });
          setIsSubmitting(false);
      });

    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Помилка з\'єднання з сервером.', { id: toastId });
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className={styles.successContainer}>
        <Helmet>
          <title>Замовлення прийнято | FATALITY</title>
        </Helmet>
        
        <div className={styles.successIconWrapper}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        
        <h2 className={styles.successTitle}>ЗАМОВЛЕННЯ ПРИЙНЯТО!</h2>
        <p className={styles.successText}>
          Дякуємо за покупку у FATALITY. Ваш платіж успішно оброблено. <br/>
          Кібер-менеджер вже пакує вашу консоль. <br/>
          <b>Не забудьте зберегти ID замовлення, щоб відстежити його статус.</b>
        </p>
        
        <div className={styles.orderIdBox}>
          <span className={styles.orderIdLabel}>ID вашого замовлення:</span>
          <span className={styles.orderIdValue}>{orderSuccess}</span>
        </div>
        
        <div className={styles.successActions}>
          <Link to="/track-order" className={styles.trackBtn}>
            Відстежити статус
          </Link>
          <Link to="/" className={styles.homeBtn}>
            Повернутися до каталогу
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <FaShoppingBag className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Ваш кошик порожній</h2>
        <p className={styles.emptyText}>Ви поки не додали жодної консолі до списку покупок.</p>
        <Link to="/" className={styles.backBtn}>
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.cartPage}>
      <Helmet>
        <title>Кошик | FATALITY</title>
      </Helmet>
      <h2 className={styles.pageTitle}>Ваш кошик</h2>
      
      <div className={styles.cartContent}>
        <div className={styles.itemsList}>
          {cartItems.map((item) => (
            <article key={item.id || item._id} className={styles.cartItem}>
              <Link to={`/product/${item.id || item._id}`} className={styles.imageWrapper}>
                <img src={item.imageUrl} alt={item.title} />
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
                {item.price * item.quantity} грн
              </div>

              <button 
                className={styles.deleteBtn} 
                onClick={() => removeFromCart(item.id || item._id)}
                aria-label="Видалити товар"
              >
                <FaTrash />
              </button>
            </article>
          ))}
          
          <button className={styles.clearCartBtn} onClick={clearCart}>
            Очистити кошик
          </button>
        </div>

        <aside className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Підсумок</h3>
          
          <div className={styles.summaryDetails}>
            <div className={styles.summaryRow}>
              <span>Товари ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} шт.)</span>
              <span>{cartTotal} грн</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Доставка</span>
              <span className={styles.freeShipping}>Безкоштовно</span>
            </div>
          </div>
          
          <hr className={styles.divider} />
          
          <div className={styles.totalRow}>
            <span>До сплати:</span>
            <span className={styles.totalPrice}>{cartTotal} грн</span>
          </div>

          {!isCheckingOut ? (
            <button className={styles.checkoutBtn} onClick={() => setIsCheckingOut(true)}>
              Оформити замовлення
            </button>
          ) : (
            <form className={styles.checkoutForm} onSubmit={submitOrder}>
              <div className={styles.formGroup}>
                <input type="text" name="name" placeholder="Ваше ім'я" required className={styles.inputField} value={formData.name} onChange={handleInputChange} />
                <input type="email" name="email" placeholder="Ваш Email (для чеку)" required className={styles.inputField} value={formData.email} onChange={handleInputChange} />
                <input type="tel" name="phone" placeholder="Номер телефону" required className={styles.inputField} value={formData.phone} onChange={handleInputChange} />
                <input type="text" name="address" placeholder="Місто, Відділення НП" required className={styles.inputField} value={formData.address} onChange={handleInputChange} />
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsCheckingOut(false)} disabled={isSubmitting}>
                  Скасувати
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Обробка...' : 'Оплатити'}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}