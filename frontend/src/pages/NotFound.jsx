import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaGhost, FaHome } from 'react-icons/fa';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <Helmet>
        <title>Системна помилка 404 | FATALITY</title>
      </Helmet>

      <div className={styles.backgroundGrid}></div>

      <div className={styles.content}>
        <div className={styles.glitchWrapper}>
          <h1 className={styles.glitchText} data-text="404">404</h1>
        </div>
        
        <div className={styles.errorMessage}>
          <FaGhost className={styles.ghostIcon} />
          <h2>FATAL ERROR: НІЧОГО НЕ ЗНАЙДЕНО</h2>
          <p>Здається, ця сторінка була видалена, або ви вказали неправильну адресу.</p>
        </div>

        <Link to="/" className={styles.homeBtn}>
          <FaHome /> ПОВЕРНУТИСЯ НА БАЗУ
        </Link>
      </div>
    </div>
  );
}