import React, { useState, useRef } from 'react';
import { FaUpload, FaCamera, FaCheck, FaExclamationTriangle, FaPlus, FaTrash, FaMoneyBillWave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './Buyout.module.css';

const Buyout = () => {
  const [formData, setFormData] = useState({
    name: '', phone: '', consoleName: '', expectedPrice: '', description: '',
  });
  
  const [equipmentOptions, setEquipmentOptions] = useState([
    'Рідна коробка', 'Геймпад (Оригінал)', 'Кабель живлення', 'HDMI кабель', 'Ігри на дисках'
  ]);
  const [equipment, setEquipment] = useState([]);
  const [customEquip, setCustomEquip] = useState('');
  
  const [imageFiles, setImageFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleEquipment = (item) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleAddCustomEquipment = (e) => {
    e.preventDefault();
    const trimmed = customEquip.trim();
    if (!trimmed) return;
    if (equipmentOptions.includes(trimmed)) return toast.error('Такий пункт вже є!');
    
    setEquipmentOptions(prev => [...prev, trimmed]);
    setEquipment(prev => [...prev, trimmed]); 
    setCustomEquip('');
    toast.success('Комплектацію додано!');
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };
  const handleFileSelection = (e) => { if (e.target.files) processFiles(e.target.files); };

  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length + imageFiles.length > 10) return toast.error('Максимум 10 фотографій!');
    setImageFiles(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index, e) => {
    e.stopPropagation(); 
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.consoleName) return toast.error('Заповніть всі обов\'язкові поля!');
    if (imageFiles.length === 0) return toast.error('Завантажте хоча б 1 фото консолі!');

    setIsSubmitting(true);
    const loadingToast = toast.loading('Надсилання заявки на викуп...');

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const submitData = new FormData();
      
      submitData.append('name', formData.name);
      submitData.append('phone', formData.phone);
      submitData.append('consoleName', formData.consoleName);
      submitData.append('expectedPrice', formData.expectedPrice);
      submitData.append('description', formData.description);
      equipment.forEach(item => submitData.append('equipment', item));
      imageFiles.forEach(file => submitData.append('images', file));

      const response = await fetch(`${BASE_URL}/api/buyout`, { method: 'POST', body: submitData });

      if (response.ok) {
        toast.success('Заявку відправлено! Очікуйте дзвінка.', { id: loadingToast });
        setFormData({ name: '', phone: '', consoleName: '', expectedPrice: '', description: '' });
        setEquipment([]); setImageFiles([]);
      } else {
        toast.error('Помилка при відправленні.', { id: loadingToast });
      }
    } catch (error) { toast.error('Помилка сервера.', { id: loadingToast }); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <div className={styles.buyoutPage}>
      <div className={styles.heroSection}>
        <div className={styles.badge}><FaMoneyBillWave /> ШВИДКІ ГРОШІ ЗА ДЕВАЙС</div>
        <h1 className={styles.title}>ВИКУП КОНСОЛЕЙ</h1>
        <p className={styles.subtitle}>
          Терміново потрібна готівка? Ми викупимо твою ігрову приставку за чесною ціною.<br />
          Оцінка онлайн за 15 хвилин. Гроші одразу на карту або готівкою.
        </p>
        
        {/* 🔥 НОВИЙ ВЕЛИКИЙ БАНЕР-ПОПЕРЕДЖЕННЯ */}
        <div className={styles.categoryWarning}>
          <FaExclamationTriangle className={styles.warnIcon} />
          <p>
            <strong>Звертаємо вашу увагу!</strong> Ми здійснюємо викуп <b>ЛИШЕ ігрових консолей та аксесуарів до них</b>. Наша компанія спеціалізується виключно на ігровій тематиці — <b>комп'ютерну техніку (ПК, ноутбуки), телефони та інше ми НЕ приймаємо!</b>
          </p>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.rulesSidebar}>
          <div className={styles.rulesCard}>
            <h3><FaCamera className={styles.iconRed} /> ПРАВИЛА ФОТО</h3>
            <ul className={styles.rulesList}>
              {/* 🔥 ДОДАНО ПУНКТ ПРО ВАГИ */}
              <li><strong>На вагах:</strong> <span>Зробіть фото консолі на вагах, щоб підтвердити цілісність внутрішніх компонентів.</span></li>
              <li><strong>Заводська бирка:</strong> <span>Чітке фото серійного номера.</span></li>
              <li><strong>Стан корпусу:</strong> <span>Фото з різних ракурсів при доброму освітленні.</span></li>
              <li><strong>Дефекти:</strong> <span>Подряпини, сколи або інші нюанси — крупним планом.</span></li>
            </ul>
            <div className={styles.warningBox}>
              <FaExclamationTriangle className={styles.warnIcon}/>
              <p>Не приховуйте дефекти! Чесне фото — це гарантія того, що ми не змінимо ціну при перевірці.</p>
            </div>
          </div>
        </div>

        <form className={styles.buyoutForm} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>ДАНІ ДЛЯ ОЦІНКИ</h3>
          
          <div className={styles.formGrid}>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.4s' }}>
              <label>Модель консолі / Пам'ять *</label>
              <input type="text" name="consoleName" placeholder="Напр. Xbox Series X" value={formData.consoleName} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.5s' }}>
              <label>Очікувана сума (грн)</label>
              <input type="number" name="expectedPrice" placeholder="Скільки хочете отримати?" value={formData.expectedPrice} onChange={handleInputChange} />
            </div>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.6s' }}>
              <label>Ваше ім'я *</label>
              <input type="text" name="name" placeholder="Ім'я" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.7s' }}>
              <label>Телефон *</label>
              <input type="tel" name="phone" placeholder="+38 (000) 000-00-00" value={formData.phone} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.8s' }}>
            <label>Комплектація (що віддаєте разом з консоллю):</label>
            <div className={styles.checkboxGrid}>
              {equipmentOptions.map(item => (
                <div key={item} className={`${styles.checkboxItem} ${equipment.includes(item) ? styles.active : ''}`} onClick={() => toggleEquipment(item)}>
                  <div className={styles.checkIndicator}>{equipment.includes(item) && <FaCheck />}</div>
                  {item}
                </div>
              ))}
            </div>
            <div className={styles.customEquipBox}>
              <input type="text" placeholder="Свій варіант (напр. 2 гри на диску)..." value={customEquip} onChange={(e) => setCustomEquip(e.target.value)} className={styles.customEquipInput} />
              <button type="button" onClick={handleAddCustomEquipment} className={styles.addCustomBtn}><FaPlus /> Додати</button>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.9s' }}>
            <label>Детальний опис стану (обов'язково вкажіть дефекти):</label>
            <textarea name="description" placeholder="Куплена рік тому, не розбиралася. Єдиний мінус - немає рідної коробки..." value={formData.description} onChange={handleInputChange} rows="4" />
          </div>

          <div className={`${styles.photoUploadSection} ${styles.animatedField}`} style={{ animationDelay: '1s' }}>
            <label>Фотографії (до 10 шт) *</label>
            <div className={`${styles.uploadDropzone} ${isDragging ? styles.dropZoneActive : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelection} style={{ display: 'none' }} />
              <FaUpload className={styles.uploadIcon} />
              <p className={styles.uploadText}>Перетягніть файли або <span className={styles.browseLink}>виберіть тут</span></p>
            </div>
            {imageFiles.length > 0 && (
              <div className={styles.imagePreviewGrid}>
                {imageFiles.map((file, idx) => (
                  <div key={idx} className={styles.imagePreview}>
                    <img src={URL.createObjectURL(file)} alt="preview" />
                    <button type="button" onClick={(e) => removeImage(idx, e)} className={styles.deleteImgBtn}><FaTrash /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className={`${styles.submitBtn} ${styles.animatedField}`} style={{ animationDelay: '1.1s' }} disabled={isSubmitting}>
            {isSubmitting ? 'ВІДПРАВКА ДАНИХ...' : 'ЗАПРОСИТИ ОЦІНКУ ВАРТОСТІ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Buyout;