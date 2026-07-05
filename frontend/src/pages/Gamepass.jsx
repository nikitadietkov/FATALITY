import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaHardHat, FaHome } from 'react-icons/fa';
import styles from './NotFound.module.css';

export default function Gamepass() {
  return (
    <div className={styles.notFoundPage}>
      <Helmet>
        <title>Gamepass | FATALITY</title>
      </Helmet>

      <div className={styles.backgroundGrid}></div>

      <div className={styles.content}>
        <div className={styles.glitchWrapper}>
          <h1 className={styles.glitchText} data-text="GAMEPASS" style={{ fontSize: '80px' }}>GAMEPASS</h1>
        </div>
        
        <div className={styles.errorMessage}>
          <FaHardHat className={styles.ghostIcon} style={{ color: '#ffbd2e' }} />
          <h2 style={{ color: '#ffbd2e' }}>РОЗДІЛ У РОЗРОБЦІ</h2>
          <p>Наші кібер-інженери зараз шукають найкращих постачальників, щоб надати вам підписки PS Plus та Xbox Gamepass за найнижчими цінами.</p>
        </div>

        <Link to="/" className={styles.homeBtn} style={{ backgroundColor: '#ffbd2e', color: '#111' }}>
          <FaHome /> ПОВЕРНУТИСЯ ДО КАТАЛОГУ
        </Link>
      </div>
    </div>
  );
}