import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Блокуємо пусті запити або подвійні кліки
    if (isSuccess || isLoading || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        
        setIsSuccess(true);
        
        // Затримка для красивої анімації "ДОСТУП ДОЗВОЛЕНО"
        setTimeout(() => {
          navigate('/admin');
        }, 1000);
      } else {
        setError('Невірний пароль доступу!');
        setErrorKey(prev => prev + 1); // Ключ для перезапуску анімації shake
      }
    } catch (err) {
      setError('Помилка з\'єднання з сервером');
      setErrorKey(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={`${styles.loginCard} ${isSuccess ? styles.successCard : ''}`}>
        <h1 className={`${styles.logo} ${isSuccess ? styles.logoSuccess : ''}`}>
          FATALITY
        </h1>
        <p className={styles.subtitle}>Панель керування</p>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <input 
              type="password" 
              placeholder="Введіть пароль" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              disabled={isSuccess || isLoading}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          
          {error && !isSuccess && (
            <div id="login-error" key={errorKey} className={styles.errorMsg} role="alert">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className={`${styles.submitBtn} ${isSuccess ? styles.submitBtnSuccess : ''}`}
            disabled={isSuccess || isLoading || !password.trim()}
          >
            {isSuccess ? 'ДОСТУП ДОЗВОЛЕНО' : isLoading ? 'ПЕРЕВІРКА...' : 'УВІЙТИ'}
          </button>
        </form>
      </div>
    </div>
  );
}