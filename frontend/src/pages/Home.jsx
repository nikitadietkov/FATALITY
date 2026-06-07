import { useState, useEffect } from 'react';
import { CiFilter } from "react-icons/ci";
import ReactSlider from 'react-slider';
import ProductCard from '../components/ProductCard';
import styles from './Home.module.css';

export default function Home() {
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toggleSelection = (state, setState, value) => {
    if (state.includes(value)) {
      setState(state.filter(item => item !== value));
    } else {
      setState([...state, value]);
    }
  };
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const queryParams = new URLSearchParams();
        
        if (selectedModels.length > 0) {
          queryParams.append('models', selectedModels.join(','));
        }
        if (selectedConditions.length > 0) {
          queryParams.append('conditions', selectedConditions.join(','));
        }
        queryParams.append('minPrice', priceMin);
        queryParams.append('maxPrice', priceMax);

        const response = await fetch(`http://localhost:5000/api/products?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('can`t load products from server');
        }

        const data = await response.json();
        setProducts(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();

  }, [selectedModels, selectedConditions, priceMin, priceMax]);

  return (
    <div className={styles.homeLayout}>
      <aside className={styles.filterContainer}>
        <section className={styles.filterTitle}>
          <CiFilter className={styles.filterIcon} />
          <p className={styles.filterName}>Фільтри</p>
        </section>
        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Модель</h3>
          {['PS5', 'PS4 Pro', 'PS4', 'PS3'].map((model) => (
            <label key={model} className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={selectedModels.includes(model)} 
                onChange={() => toggleSelection(selectedModels, setSelectedModels, model)} 
              /> 
              {model}
            </label>
          ))}
        </section>
        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Якість</h3>
          {['Як новий', 'В гарному стані', 'Можливі подряпини'].map((condition) => (
            <label key={condition} className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={selectedConditions.includes(condition)} 
                onChange={() => toggleSelection(selectedConditions, setSelectedConditions, condition)} 
              /> 
              {condition}
            </label>
          ))}
        </section>
        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Ціна ($)</h3>
          <div className={styles.priceInputsGroup}>
            <input 
              type="number" 
              placeholder="Min" 
              className={styles.priceInput}
              value={priceMin}
              onChange={(e) => setPriceMin(Number(e.target.value))}
            />
            <span className={styles.priceDivider}>-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className={styles.priceInput}
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
            />
          </div>
          <div className={styles.sliderWrapper}>
            <ReactSlider
              className={styles.dualSlider}
              thumbClassName={styles.thumb}
              trackClassName="track"
              value={[priceMin, priceMax]}
              min={0}
              max={1000}
              onChange={(value) => {
                setPriceMin(value[0]);
                setPriceMax(value[1]);
              }}
            />
          </div>
        </section>
      </aside>
      <section className={styles.productsArea}>
        <h2 className={styles.productsTitle}>Всі товари</h2>
        {loading && products.length === 0 && (
          <div className={styles.statusMessage}>Завантаження товарів...</div>
        )}
        {error && <div className={styles.errorMessage}>Помилка: {error}</div>}
        {!loading && !error && products.length === 0 && (
          <div className={styles.statusMessage}>Товари не знайдено. Спробуйте змінити фільтри.</div>
        )}
        {!error && products.length > 0 && (
          <div className={`${styles.productsGrid} ${loading ? styles.loadingGrid : ''}`}>
            {products.map((item) => (
              <ProductCard 
                key={item._id}
                id={item._id}
                title={item.title}
                model={item.model}
                condition={item.condition}
                price={item.price}
                imageUrl={item.imageUrl}
                rating={item.rating}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}