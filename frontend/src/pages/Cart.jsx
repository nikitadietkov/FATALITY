import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FaMinus, FaPlus, FaTrash, FaShoppingBag, FaCheckCircle } from 'react-icons/fa';
import styles from './Cart.module.css';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  
  // Стейт для форми оформлення
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    
    // Формуємо об'єкт замовлення
    const orderData = {
      customerName: formData.name,
      phone: formData.phone,
      address: formData.address,
      items: cartItems.map(item => ({
        productId: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      })),
      totalAmount: cartTotal
    };

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        setOrderSuccess(true);
        clearCart(); 
      } else {
        alert('Помилка при оформленні замовлення. Спробуйте ще раз.');
      }
    } catch (error) {
      console.error(error);
      alert('Помилка з\'єднання з сервером.');
    }
  };

  if (orderSuccess) {
    return (
      <div className={styles.emptyContainer}>
        <FaCheckCircle className={styles.successIcon} />
        <h2>Замовлення прийнято!</h2>
        <p>Дякуємо за покупку у FATALITY. Наш менеджер скоро зв'яжеться з вами.</p>
        <Link to="/" className={styles.backBtn}>
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <FaShoppingBag className={styles.emptyIcon} />
        <h2>Ваш кошик порожній</h2>
        <p>Ви поки не додали жодної консолі до списку покупок.</p>
        <Link to="/" className={styles.backBtn}>
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.cartPage}>
      <h2 className={styles.pageTitle}>Ваш кошик</h2>
      
      <div className={styles.cartContent}>
        <div className={styles.itemsList}>
          {cartItems.map((item) => (
            <div key={item.id} className={styles.cartItem}>
              <div className={styles.imageWrapper}>
                <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.title} />
              </div>
              
              <div className={styles.itemInfo}>
                <h4 className={styles.itemTitle}>{item.title}</h4>
                <span className={styles.itemModel}>{item.model} Console</span>
                <span className={styles.itemPrice}>${item.price}</span>
              </div>

              <div className={styles.quantityControls}>
                <button 
                  className={styles.quantityBtn} 
                  onClick={() => updateQuantity(item.id, -1)}
                  disabled={item.quantity <= 1}
                >
                  <FaMinus />
                </button>
                <span className={styles.quantityValue}>{item.quantity}</span>
                <button 
                  className={styles.quantityBtn} 
                  onClick={() => updateQuantity(item.id, 1)}
                >
                  <FaPlus />
                </button>
              </div>

              <div className={styles.itemSubtotal}>
                ${item.price * item.quantity}
              </div>

              <button className={styles.deleteBtn} onClick={() => removeFromCart(item.id)}>
                <FaTrash />
              </button>
            </div>
          ))}
          <button className={styles.clearCartBtn} onClick={clearCart}>
            Очистити кошик
          </button>
        </div>

        <aside className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Підсумок</h3>
          <div className={styles.summaryRow}>
            <span>Товари ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} шт.)</span>
            <span>${cartTotal}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span className={styles.freeShipping}>Безкоштовно</span>
          </div>
          <hr className={styles.divider} />
          <div className={styles.totalRow}>
            <span>До сплати:</span>
            <span className={styles.totalPrice}>${cartTotal}</span>
          </div>

          {!isCheckingOut ? (
            <button className={styles.checkoutBtn} onClick={() => setIsCheckingOut(true)}>
              Оформити замовлення
            </button>
          ) : (
            <form className={styles.checkoutForm} onSubmit={submitOrder}>
              <input 
                type="text" 
                name="name"
                placeholder="Ваше ім'я" 
                required 
                className={styles.inputField}
                value={formData.name}
                onChange={handleInputChange}
              />
              <input 
                type="tel" 
                name="phone"
                placeholder="Номер телефону" 
                required 
                className={styles.inputField}
                value={formData.phone}
                onChange={handleInputChange}
              />
              <input 
                type="text" 
                name="address"
                placeholder="Адреса доставки (Місто, Відділення НП)" 
                required 
                className={styles.inputField}
                value={formData.address}
                onChange={handleInputChange}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsCheckingOut(false)}>
                  Скасувати
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Підтвердити
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}