import React, { useState, useRef } from 'react';
import { FaUpload, FaCamera, FaCheck, FaExclamationTriangle, FaPlus, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './TradeIn.module.css';

const TradeIn = () => {
  const [formData, setFormData] = useState({
    name: '', phone: '', consoleName: '', description: '',
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
    if (validFiles.length + imageFiles.length > 10) return toast.error('Максимум можна завантажити 10 фотографій!');
    setImageFiles(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index, e) => {
    e.stopPropagation(); 
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.consoleName) return toast.error('Заповніть всі обов\'язкові поля!');
    if (imageFiles.length === 0) return toast.error('Завантажте хоча б 1 фото консолі (обов\'язково з биркою)!');

    setIsSubmitting(true);
    const loadingToast = toast.loading('Надсилання заявки на сервер...');

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const submitData = new FormData();
      
      submitData.append('name', formData.name);
      submitData.append('phone', formData.phone);
      submitData.append('consoleName', formData.consoleName);
      submitData.append('description', formData.description);
      equipment.forEach(item => submitData.append('equipment', item));
      imageFiles.forEach(file => submitData.append('images', file));

      const response = await fetch(`${BASE_URL}/api/trade-in`, { method: 'POST', body: submitData });

      if (response.ok) {
        toast.success('Заявку успішно відправлено в FATALITY!', { id: loadingToast });
        setFormData({ name: '', phone: '', consoleName: '', description: '' });
        setEquipment([]); setImageFiles([]);
      } else {
        toast.error('Помилка при відправленні.', { id: loadingToast });
      }
    } catch (error) { toast.error('Помилка з\'єднання з сервером.', { id: loadingToast }); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <div className={styles.tradeInPage}>
      <div className={styles.heroSection}>
        <div className={styles.badge}>RECYCLE & UPGRADE</div>
        <h1 className={styles.title}>TRADE-IN: ТЕРМІНАЛ ОБМІНУ</h1>
        <p className={styles.subtitle}>
          Оціни свій девайс онлайн. Здай стару консоль та забирай нову з максимальною вигодою.
        </p>
        
        {/* 🔥 НОВИЙ ВЕЛИКИЙ БАНЕР-ПОПЕРЕДЖЕННЯ */}
        <div className={styles.categoryWarning}>
          <FaExclamationTriangle className={styles.warnIcon} />
          <p>
            <strong>Звертаємо вашу увагу!</strong> Ми здійснюємо обмін <b>ЛИШЕ на ігрові консолі та аксесуари до них</b>. Наша компанія спеціалізується виключно на ігровій тематиці — <b>комп'ютерну техніку (ПК, ноутбуки), телефони та інше ми НЕ приймаємо!</b>
          </p>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.rulesSidebar}>
          <div className={styles.rulesCard}>
            <h3><FaCamera className={styles.iconRed} /> ГАЙД З ФОТОФІКСАЦІЇ</h3>
            <ul className={styles.rulesList}>
              <li><strong>Заводська бирка:</strong> <span>Зробіть чітке фото наклейки з серійним номером та ревізією.</span></li>
              <li><strong>Ракурси 360°:</strong> <span>Сфотографуйте консоль, геймпад та кабелі зблизька з обох сторін.</span></li>
              <li><strong>Макро-дефекти:</strong> <span>Якщо є подряпини чи сколи — зафіксуйте їх крупним планом.</span></li>
            </ul>
            <div className={styles.warningBox}>
              <FaExclamationTriangle className={styles.warnIcon}/>
              <p>Максимально чесний опис стану гарантує точну оцінку без її зміни при зустрічі!</p>
            </div>
          </div>
        </div>

        <form className={styles.tradeInForm} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>СПЕЦИФІКАЦІЯ ДЕВАЙСУ</h3>
          
          <div className={styles.formGrid}>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.4s' }}>
              <label>Модель консолі / Об'єм пам'яті *</label>
              <input type="text" name="consoleName" placeholder="Напр. Sony PlayStation 5 Slim 1TB" value={formData.consoleName} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.5s' }}>
              <label>Ваше ім'я *</label>
              <input type="text" name="name" placeholder="Введіть ім'я" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.6s' }}>
              <label>Контактний номер телефону *</label>
              <input type="tel" name="phone" placeholder="+38 (066) 000-00-00" value={formData.phone} onChange={handleInputChange} required />
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.7s' }}>
            <label>Комплектація пристрою:</label>
            <div className={styles.checkboxGrid}>
              {equipmentOptions.map(item => (
                <div key={item} className={`${styles.checkboxItem} ${equipment.includes(item) ? styles.active : ''}`} onClick={() => toggleEquipment(item)}>
                  <div className={styles.checkIndicator}>{equipment.includes(item) && <FaCheck />}</div>
                  {item}
                </div>
              ))}
            </div>
            <div className={styles.customEquipBox}>
              <input type="text" placeholder="Додати свій варіант..." value={customEquip} onChange={(e) => setCustomEquip(e.target.value)} className={styles.customEquipInput} />
              <button type="button" onClick={handleAddCustomEquipment} className={styles.addCustomBtn}><FaPlus /> Додати</button>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.animatedField}`} style={{ animationDelay: '0.8s' }}>
            <label>Додаткова інформація (технічний стан, нюанси):</label>
            <textarea name="description" placeholder="Консоль не шумить, пломби на місці..." value={formData.description} onChange={handleInputChange} rows="4" />
          </div>

          <div className={`${styles.photoUploadSection} ${styles.animatedField}`} style={{ animationDelay: '0.9s' }}>
            <label>Зображення девайсу (від 1 до 10 фотографій) *</label>
            <div className={`${styles.uploadDropzone} ${isDragging ? styles.dropZoneActive : ''}`} onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
              <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelection} style={{ display: 'none' }} />
              <FaUpload className={styles.uploadIcon} />
              <p className={styles.uploadText}>Перетягніть файли сюди або <span className={styles.browseLink}>виберіть на пристрої</span></p>
              <span className={styles.uploadSubtext}>Формати: JPG, PNG. Максимум 10 фото.</span>
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

          <button type="submit" className={`${styles.submitBtn} ${styles.animatedField}`} style={{ animationDelay: '1s' }} disabled={isSubmitting}>
            {isSubmitting ? 'НАДСИЛАННЯ СПЕЦИФІКАЦІЇ...' : 'ВІДПРАВИТИ НА ОЦІНКУ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TradeIn;