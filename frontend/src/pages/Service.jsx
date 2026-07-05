import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaWrench, FaFan, FaGamepad, FaPlug, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './Service.module.css';

const CONSOLES = [
  'Оберіть вашу консоль...',
  'PlayStation 5',
  'PlayStation 4 (Fat / Slim / Pro)',
  'PlayStation 3',
  'Xbox Series X / S',
  'Xbox One (S / X)',
  'Nintendo Switch',
  'Інша (вказати в описі)'
];

export default function Service() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    consoleModel: '',
    problem: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.consoleModel || formData.consoleModel === CONSOLES[0]) {
      return toast.error('Будь ласка, заповніть всі обов\'язкові поля та оберіть консоль.');
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Відправка заявки...');

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BASE_URL}/api/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Помилка сервера при відправленні');
      }

      toast.success('Заявку успішно відправлено! Наш майстер зателефонує вам найближчим часом.', { id: toastId });
      
      setFormData({ name: '', phone: '', consoleModel: '', problem: '' });
      
    } catch (error) {
      console.error(error);
      toast.error('Помилка з\'єднання з сервером. Спробуйте пізніше.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.servicePage}>
      <Helmet>
        <title>Сервіс та Ремонт | FATALITY</title>
      </Helmet>

      {/* Герой-блок */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.iconWrapper}>
            <FaWrench className={styles.heroIcon} />
          </div>
          <h1 className={styles.title}>ПРОФЕСІЙНИЙ <span className={styles.redText}>СЕРВІС</span></h1>
          <p className={styles.subtitle}>
            Ремонт, профілактика та відновлення ігрових консолей будь-якої складності.
            Повертаємо до життя техніку, яку інші списали.
          </p>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Блок опису послуг */}
        <div className={styles.servicesGrid}>
          <div className={styles.serviceCard}>
            <FaFan className={styles.cardIcon} />
            <h3>Чистка та термопаста</h3>
            <p>Повне очищення від пилу, заміна термоінтерфейсу (Arctic MX-4 / Рідкий метал). Зниження температур та усунення шуму кулера.</p>
          </div>
          
          <div className={styles.serviceCard}>
            <FaGamepad className={styles.cardIcon} />
            <h3>Ремонт геймпадів</h3>
            <p>Усунення дрифту стіків (заміна 3D-аналогів), ремонт кнопок, заміна шлейфів, акумуляторів та корпусу DualShock/DualSense.</p>
          </div>

          <div className={styles.serviceCard}>
            <FaPlug className={styles.cardIcon} />
            <h3>Апаратний ремонт</h3>
            <p>Заміна роз'ємів HDMI, USB, Type-C. Відновлення ланцюгів живлення, реболл APU/пам'яті, заміна жорстких дисків та лазерів.</p>
          </div>
        </div>

        {/* Форма заявки */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <h2>Залишити заявку на ремонт</h2>
            <p>Опишіть вашу проблему, і ми зв'яжемося з вами для консультації.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.serviceForm}>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Ваше ім'я *</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Олександр"
                  value={formData.name} 
                  onChange={handleChange}
                  className={styles.inputField}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Номер телефону *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="+38 (000) 000-00-00"
                  value={formData.phone} 
                  onChange={handleChange}
                  className={styles.inputField}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Модель консолі / аксесуару *</label>
              <div className={styles.selectWrapper}>
                <select 
                  name="consoleModel" 
                  value={formData.consoleModel} 
                  onChange={handleChange}
                  className={styles.selectField}
                >
                  {CONSOLES.map((cons, index) => (
                    <option key={index} value={cons} disabled={index === 0}>
                      {cons}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Опис проблеми (опціонально)</label>
              <textarea 
                name="problem" 
                rows="4" 
                placeholder="Наприклад: Консоль сильно шумить і гріється під час гри..."
                value={formData.problem} 
                onChange={handleChange}
                className={styles.textareaField}
              ></textarea>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Відправка...' : 'ВІДПРАВИТИ ЗАЯВКУ'}
            </button>
            <p className={styles.disclaimer}>
              <FaCheckCircle /> Відправляючи заявку, ви погоджуєтесь на обробку контактних даних.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}