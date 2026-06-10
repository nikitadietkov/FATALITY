import { useState, useEffect, useCallback, useMemo } from 'react';
import { CiFilter } from "react-icons/ci";
import { FaTimes, FaSearch } from "react-icons/fa";
import ReactSlider from 'react-slider';
import ProductCard from '../components/ProductCard';
import styles from './Home.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const MODELS = ['PS5', 'PS4 Pro', 'PS4', 'PS3'];
const CONDITIONS = ['Нова', 'Вживана - Ідеальний стан', 'Вживана - Хороший стан', 'Відновлена (Refurbished)'];
const PRICE_MIN_DEFAULT = 0;
const PRICE_MAX_DEFAULT = 40000;
const API_BASE = 'http://localhost:5000/api/products';
const DEBOUNCE_DELAY = 400;

// ─── Hook: debounced value ─────────────────────────────────────────────────────
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [priceRange, setPriceRange] = useState([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedPriceRange = useDebounced(priceRange, DEBOUNCE_DELAY);
  const debouncedSearch = useDebounced(searchQuery, DEBOUNCE_DELAY);

  useEffect(() => {
    document.body.style.overflow = isMobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileFilterOpen]);

  // ── Fetch products ─────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          minPrice: debouncedPriceRange[0],
          maxPrice: debouncedPriceRange[1],
        });
        if (selectedModels.length)     params.set('models', selectedModels.join(','));
        if (selectedConditions.length) params.set('conditions', selectedConditions.join(','));

        const res = await fetch(`${API_BASE}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Помилка сервера: ${res.status}`);

        setProducts(await res.json());
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort(); 
  }, [selectedModels, selectedConditions, debouncedPriceRange]);

  // ── Client-side search filter ───────────────────────────────────────────────
  const visibleProducts = useMemo(() => {
    if (!debouncedSearch.trim()) return products;
    const q = debouncedSearch.toLowerCase();
    return products.filter(
      (p) => p.title.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
    );
  }, [products, debouncedSearch]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleItem = useCallback((setState) => (value) => {
    setState((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedModels([]);
    setSelectedConditions([]);
    setPriceRange([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT]);
    setSearchQuery('');
  }, []);

  const activeFilterCount =
    selectedModels.length +
    selectedConditions.length +
    (priceRange[0] !== PRICE_MIN_DEFAULT || priceRange[1] !== PRICE_MAX_DEFAULT ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.homeLayout}>

      {isMobileFilterOpen && (
        <div
          className={styles.mobileFilterOverlay}
          onClick={() => setIsMobileFilterOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`${styles.filterContainer} ${isMobileFilterOpen ? styles.open : ''}`}
        aria-label="Панель фільтрів"
      >
        <div className={styles.filterHeaderMobile}>
          <section className={styles.filterTitle}>
            <CiFilter className={styles.filterIcon} aria-hidden="true" />
            <p className={styles.filterName}>Фільтри</p>
          </section>
          <button
            className={styles.closeFilterBtn}
            onClick={() => setIsMobileFilterOpen(false)}
            aria-label="Закрити фільтри"
          >
            <FaTimes />
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {selectedModels.map((m) => (
              <span key={m} className={styles.chip}>
                {m}
                <button onClick={() => toggleItem(setSelectedModels)(m)} aria-label={`Видалити фільтр ${m}`}>
                  <FaTimes />
                </button>
              </span>
            ))}
            {selectedConditions.map((c) => (
              <span key={c} className={styles.chip}>
                {c}
                <button onClick={() => toggleItem(setSelectedConditions)(c)} aria-label={`Видалити фільтр ${c}`}>
                  <FaTimes />
                </button>
              </span>
            ))}
            {(priceRange[0] !== PRICE_MIN_DEFAULT || priceRange[1] !== PRICE_MAX_DEFAULT) && (
              <span className={styles.chip}>
                {priceRange[0]} – {priceRange[1]} грн
                <button onClick={() => setPriceRange([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT])} aria-label="Скинути ціну">
                  <FaTimes />
                </button>
              </span>
            )}
            <button className={styles.clearAll} onClick={clearAllFilters}>
              Скинути все
            </button>
          </div>
        )}

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Модель</h3>
          {MODELS.map((model) => (
            <label key={model} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => toggleItem(setSelectedModels)(model)}
              />
              {model}
            </label>
          ))}
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Стан</h3>
          {CONDITIONS.map((condition) => (
            <label key={condition} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedConditions.includes(condition)}
                onChange={() => toggleItem(setSelectedConditions)(condition)}
              />
              {condition}
            </label>
          ))}
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Ціна (грн)</h3>
          <div className={styles.priceInputsGroup}>
            <input
              type="number"
              placeholder="Min"
              className={styles.priceInput}
              value={priceRange[0]}
              min={PRICE_MIN_DEFAULT}
              max={priceRange[1]}
              onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
            />
            <span className={styles.priceDivider}>–</span>
            <input
              type="number"
              placeholder="Max"
              className={styles.priceInput}
              value={priceRange[1]}
              min={priceRange[0]}
              max={PRICE_MAX_DEFAULT}
              onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
            />
          </div>
          <div className={styles.sliderWrapper}>
            <ReactSlider
              className={styles.dualSlider}
              thumbClassName={styles.thumb}
              trackClassName="track"
              value={priceRange}
              min={PRICE_MIN_DEFAULT}
              max={PRICE_MAX_DEFAULT}
              onChange={setPriceRange}
              ariaLabel={['Мінімальна ціна', 'Максимальна ціна']}
            />
          </div>
        </section>
      </aside>

      {/* ── Products area ───────────────────────────────────────────────────── */}
      <section className={styles.productsArea}>

        <div className={styles.productsAreaHeader}>
          <div className={styles.titleGroup}>
            <h2 className={styles.productsTitle}>Всі товари</h2>
            {!loading && (
              <span className={styles.productCount}>
                {visibleProducts.length} товар{visibleProducts.length === 1 ? '' : 'ів'}
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                placeholder="Пошук консолі..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Пошук товарів"
              />
              {searchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистити пошук"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <button
              className={styles.mobileFilterToggle}
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label={`Відкрити фільтри${activeFilterCount ? ` (${activeFilterCount} активних)` : ''}`}
            >
              <CiFilter size={20} />
              Фільтри
              {activeFilterCount > 0 && (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* States */}
        {loading && products.length === 0 && (
          <div className={styles.statusMessage}>
            <span className={styles.spinner} aria-hidden="true" />
            Завантаження товарів...
          </div>
        )}

        {error && (
          <div className={styles.errorMessage} role="alert">
            ⚠ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && visibleProducts.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>Нічого не знайдено</p>
            <p className={styles.emptyStateText}>
              Спробуйте змінити фільтри або пошуковий запит.
            </p>
            {hasActiveFilters && (
              <button className={styles.emptyStateClear} onClick={clearAllFilters}>
                Скинути фільтри
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!error && visibleProducts.length > 0 && (
          <div className={`${styles.productsGrid} ${loading ? styles.loadingGrid : ''}`}>
            {visibleProducts.map((item, index) => (
              <div
                key={item._id}
                className={styles.animatedCard}
                style={{ animationDelay: `${Math.min(index * 0.06, 0.6)}s` }}
              >
                <ProductCard
                  id={item._id}
                  title={item.title}
                  model={item.model}
                  condition={item.condition}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  imageUrls={item.imageUrls}
                  rating={item.rating}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}