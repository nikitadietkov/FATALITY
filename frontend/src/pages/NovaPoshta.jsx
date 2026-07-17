import { useState, useEffect } from 'react';

export default function NovaPoshta({ value, onChange, disabled, styles }) {
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState([]);
  const [cityRef, setCityRef] = useState('');
  const [showCities, setShowCities] = useState(false);

  const [depSearch, setDepSearch] = useState('');
  const [departments, setDepartments] = useState([]);
  const [showDeps, setShowDeps] = useState(false);

  const API_KEY = import.meta.env.VITE_NP_API_KEY || '';

  // Якщо адреса була збережена в localStorage, показуємо її
  useEffect(() => {
    if (value && !citySearch && !depSearch) {
      setDepSearch(value);
    }
  }, [value, citySearch, depSearch]);

  // Шукаємо місто з затримкою (Debounce), щоб не спамити API
  useEffect(() => {
    if (citySearch.length < 2 || cityRef) {
      if (citySearch.length < 2) setCities([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: API_KEY,
            modelName: 'Address',
            calledMethod: 'searchSettlements',
            methodProperties: { CityName: citySearch, Limit: '20' }
          })
        });
        const data = await res.json();
        if (data.success && data.data[0]?.Addresses) {
          setCities(data.data[0].Addresses);
          setShowCities(true);
        }
      } catch (err) {
        console.error('NP API Error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [citySearch, cityRef, API_KEY]);

  // Завантажуємо всі відділення обраного міста
  useEffect(() => {
    if (!cityRef) {
      setDepartments([]);
      return;
    }
    const fetchDeps = async () => {
      try {
        const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: API_KEY,
            modelName: 'Address',
            calledMethod: 'getWarehouses',
            methodProperties: { CityRef: cityRef }
          })
        });
        const data = await res.json();
        if (data.success) {
          setDepartments(data.data);
        }
      } catch (err) {
        console.error('NP API Error:', err);
      }
    };
    fetchDeps();
  }, [cityRef, API_KEY]);

  const handleCitySelect = (city) => {
    setCitySearch(city.Present);
    setCityRef(city.DeliveryCity); // Зберігаємо унікальний ID міста
    setShowCities(false);
    setDepSearch('');
    onChange(''); // Очищаємо фінальну адресу, поки не вибрано відділення
  };

  const handleDepSelect = (dep) => {
    setDepSearch(dep.Description);
    setShowDeps(false);
    onChange(`${citySearch}, ${dep.Description}`); // Передаємо готову адресу в корзину
  };

  return (
    <div className={styles.npWrapper}>
      {/* Інпут для міста */}
      <div className={styles.npDropdownContainer}>
        <input
          type="text"
          placeholder="Місто доставки"
          className={styles.inputField}
          value={citySearch}
          onChange={(e) => {
            setCitySearch(e.target.value);
            setCityRef('');
            onChange('');
          }}
          onFocus={() => { if (cities.length) setShowCities(true) }}
          onBlur={() => setTimeout(() => setShowCities(false), 200)}
          disabled={disabled}
        />
        {showCities && cities.length > 0 && (
          <ul className={styles.npList}>
            {cities.map((city) => (
              <li key={city.Ref} onClick={() => handleCitySelect(city)}>
                {city.Present}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Інпут для відділення */}
      <div className={styles.npDropdownContainer}>
        <input
          type="text"
          placeholder="Відділення або поштомат"
          className={styles.inputField}
          value={depSearch}
          onChange={(e) => setDepSearch(e.target.value)}
          onFocus={() => { if (departments.length) setShowDeps(true) }}
          onBlur={() => setTimeout(() => setShowDeps(false), 200)}
          disabled={disabled || !cityRef}
        />
        {showDeps && departments.length > 0 && (
          <ul className={styles.npList}>
            {departments
              .filter(d => d.Description.toLowerCase().includes(depSearch.toLowerCase()))
              .map((dep) => (
              <li key={dep.Ref} onClick={() => handleDepSelect(dep)}>
                {dep.Description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}