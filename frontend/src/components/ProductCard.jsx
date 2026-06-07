import { FaShoppingCart, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ id, title, model, condition, price, imageUrl, rating }) {
  const { addToCart } = useCart();

  const getConditionClass = (cond) => {
    switch (cond.toLowerCase()) {
      case 'excellent': return styles.excellent;
      case 'good': return styles.good;
      case 'fair': return styles.fair;
      default: return '';
    }
  };

  const handleAddToCart = (e) => {
    addToCart({ id, title, model, price, imageUrl });
    const button = e.currentTarget;
    const card = button.closest('.' + styles.card);
    const img = card.querySelector('img');
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
    flyer.style.backgroundImage = `url(${imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'})`;

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
    if (!rating || rating === 0) {
      return (
        <div className={styles.ratingContainer}>
          <span className={styles.noRatingText}>Ще немає відгуків :(</span>
        </div>
      );
    } 

    const fillPercentage = (rating / 5) * 100;

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
        <span className={styles.ratingText}>{rating}</span>
      </div>
    );
  };

  return (
    <article className={styles.card}>
      <span className={`${styles.conditionBadge} ${getConditionClass(condition)}`}>
        {condition}
      </span>
      
      <Link to={`/product/${id}`} className={styles.imageWrapper}>
        <img src={imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} alt={title} />
      </Link>

      <div className={styles.info}>
        <Link to={`/product/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h4 className={styles.title}>{title}</h4>
        </Link>
        <span className={styles.modelName}>{model} Консоль</span>
        
        {renderStars()}
        
        <div className={styles.footer}>
          <span className={styles.price}>${price}</span>
          <button className={styles.addToCartBtn} title="Add to Cart" onClick={handleAddToCart}>
            <FaShoppingCart />
          </button>
        </div>
      </div>
    </article>
  );
}