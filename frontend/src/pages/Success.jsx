import React, { useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext'; 

const Success = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('orderReference');
  
  useEffect(() => {
    localStorage.removeItem('cart');
  }, []);

  return (
    <div className="main-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1 style={{ color: 'var(--success-color)', marginBottom: '20px' }}>
        Оплата пройшла успішно! 🎉
      </h1>
      <p style={{ fontSize: '18px', color: 'var(--text-light)', marginBottom: '30px' }}>
        Дякуємо за покупку. Ваш номер замовлення: <br/>
        <strong style={{ fontSize: '24px', color: '#fff' }}>{orderId || 'обробляється...'}</strong>
      </p>
      <Link to="/" className="cart-button" style={{ display: 'inline-block' }}>
        Повернутися до магазину
      </Link>
    </div>
  );
};

export default Success;