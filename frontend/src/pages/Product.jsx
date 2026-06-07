import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaShoppingCart, FaArrowLeft, FaStar } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import styles from './Product.module.css';

export default function Product() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/products/${id}`);
        if (!response.ok) throw new Error('Не вдалося завантажити товар');
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    addToCart({
      id: product._id,
      title: product.title,
      model: product.model,
      price: product.price,
      imageUrl: product.imageUrl
    });

    const img = document.querySelector(`.${styles.mainImage}`);
    const cartBtn = document.querySelector('.cart-button'); 
    
    if (!img || !cartBtn) return;
    
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();
    
    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    
    flyer.style.left = `${imgRect.left}px`;
    flyer.style.top = `${imgRect.top}px`;
    flyer.style.width = `${imgRect.width}px`;
    flyer.style.height = `${imgRect.height}px`;
    flyer.style.borderRadius = '12px';
    flyer.style.backgroundImage = `url(${product.imageUrl || 'https://via.placeholder.com/600x400'})`;

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      flyer.style.left = `${cartRect.left + cartRect.width / 2 - 20}px`;
      flyer.style.top = `${cartRect.top + cartRect.height / 2 - 20}px`;
      flyer.style.width = '40px';
      flyer.style.height = '40px';
      flyer.style.borderRadius = '50%';
      flyer.style.opacity = '0';
    });
    
    setTimeout(() => {
      flyer.remove();
      window.dispatchEvent(new CustomEvent('animate-cart'));
    }, 400); 
  };

  const renderStars = () => {
    if (!product.rating || product.rating === 0) {
      return (
        <div className={styles.ratingContainer}>
          <span className={styles.noRatingText}>Немає відгуків</span>
        </div>
      );
    } 

    const fillPercentage = (product.rating / 5) * 100;

    return (
      <div className={styles.ratingContainer}>
        <div className={styles.starsWrapper}>
          <div className={styles.starsOuter}>
            <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
          </div>
          <div className={styles.starsInner} style={{ width: `${fillPercentage}%` }}>
            <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
          </div>
        </div>
        <span className={styles.ratingText}>{product.rating}</span>
      </div>
    );
  };

  if (loading) return <div className={styles.statusMessage}>Завантаження даних...</div>;
  if (error) return <div className={styles.statusMessage}>Помилка: {error}</div>;
  if (!product) return <div className={styles.statusMessage}>Товар не знайдено</div>;

  return (
    <div className={styles.productPage}>
      <Link to="/" className={styles.backLink}>
        <FaArrowLeft /> Назад до каталогу
      </Link>

      <div className={styles.productContainer}>
        <div className={styles.imageSection}>
          <img 
            src={product.imageUrl || 'https://via.placeholder.com/600x400'} 
            alt={product.title} 
            className={styles.mainImage}
          />
        </div>

        <div className={styles.infoSection}>
          <div className={styles.headerInfo}>
            <span className={styles.conditionBadge}>{product.condition}</span>
            <span className={styles.modelTag}>{product.model}</span>
          </div>

          <h1 className={styles.title}>{product.title}</h1>
          
          {renderStars()}

          <div className={styles.priceBlock}>
            <span className={styles.price}>${product.price}</span>
            <span className={styles.status}>В наявності</span>
          </div>

          <div className={styles.descriptionBlock}>
            <h3>Опис</h3>
            <p>{product.description}</p>
          </div>

          <button className={styles.addToCartBtn} onClick={handleAddToCart}>
            <FaShoppingCart /> Додати в кошик
          </button>
        </div>
      </div>
    </div>
  );
}