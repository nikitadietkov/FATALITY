import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  FaPlaystation, FaSkull, FaWrench, FaMicrochip, 
  FaTemperatureLow, FaShieldAlt, FaGamepad, FaGhost, 
  FaChevronDown, FaTerminal, FaTrophy, FaBolt, 
  FaSyncAlt, FaFingerprint, FaCrosshairs, FaCheckCircle, FaMapMarkerAlt
} from 'react-icons/fa';
import styles from './About.module.css';

// ─── СТАТИЧНІ ДАНІ ────────────────────────────────────────────────────────
const STATS_DATA = [
  { id: 1, icon: <FaTrophy />, value: 3450, label: "Врятованих консолей", suffix: "+" },
  { id: 2, icon: <FaTemperatureLow />, value: 15, label: "Градусів нижче норми", suffix: "°C" },
  { id: 3, icon: <FaShieldAlt />, value: 100, label: "Гарантія якості", suffix: "%" },
  { id: 4, icon: <FaGhost />, value: 0, label: "Шанс на 'Синій екран'", suffix: "%" }
];

const PROCESS_STEPS = [
  {
    id: 'step-1',
    title: "1. ДІАГНОСТИКА",
    icon: <FaCrosshairs />,
    description: "Кожна консоль проходить рентген наших спеціалістів. Ми виявляємо мікротріщини, перевіряємо стан чіпів пам'яті та рівень деградації APU.",
    techDetails: ["Перевірка HDMI-ретаймера", "Тест лазерної лінзи приводу", "Аналіз SMART жорсткого диску"]
  },
  {
    id: 'step-2',
    title: "2. ХІРУРГІЯ",
    icon: <FaWrench />,
    description: "Повне розбирання до гвинтика. Ультразвукова чистка плати від пилу, який збирався роками. Жоден мікроб не виживе.",
    techDetails: ["Ультразвукова ванна", "Заміна термопрокладок на Thermal Grizzly", "Відновлення контактних доріжок"]
  },
  {
    id: 'step-3',
    title: "3. ОХОЛОДЖЕННЯ",
    icon: <FaBolt />,
    description: "Ми міняємо висохлу заводську термопасту на преміальну Arctic MX-4 або свіжий рідкий метал (для PS5), знижуючи температуру на 10-15 градусів.",
    techDetails: ["Нанесення рідкого металу", "Балансування кулера", "Заміна притискної пластини"]
  },
  {
    id: 'step-4',
    title: "4. СТРЕС-ТЕСТ",
    icon: <FaTerminal />,
    description: "Консоль відправляється в 'пекло'. 12 годин безперервної роботи у найважчих іграх (Cyberpunk 2077 / S.T.A.L.K.E.R. 2) для перевірки стабільності.",
    techDetails: ["Моніторинг температур", "Тест на артефакти GPU", "Перевірка дроселів на писк"]
  }
];

const FAQS = [
  { q: "Чи є ризик бану консолі в PSN?", a: "Абсолютно нульовий. Кожна приставка перевіряється на чистоту MAC-адреси та відсутність банів у базі Sony. Ми гарантуємо 100% доступ до онлайну." },
  { q: "Чому б/в у нас краще, ніж з рук на OLX?", a: "Купуючи з рук, ви граєте в рулетку. У нас ви отримуєте консоль після повного ТО, із заміненою термопастою та офіційною гарантією магазину." },
  { q: "Чи оригінальні геймпади в комплекті?", a: "Так. Ми суворо відбраковуємо китайські репліки. Ви отримуєте лише оригінальні DualShock 4 або DualSense з перевіреними стіками." }
];

const TERMINAL_TEXT = "Ініціалізація системи... FATALITY Protocol: ACTIVE. \nЗавантаження модулів пам'яті... [ОК]. \nПригнічення системного перегріву... [ОК]. \nГотовність до гри: 100%.";

// ─── КАСТОМНІ ХУКИ ────────────────────────────────────────────────────────

// Хук для відслідковування скролу (Scroll Reveal)
const useScrollReveal = (options = { threshold: 0.2 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, options);

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible];
};

// Хук для кібер-лічильника цифр
const useCountUp = (end, duration = 2000, startPlaying = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startPlaying) return;
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, startPlaying]);

  return count;
};

// ─── МІКРО-КОМПОНЕНТИ ─────────────────────────────────────────────────────

// 1. Інтерактивний Термінал (Клікабельний)
const TerminalWindow = ({ fullText }) => {
  const [typedText, setTypedText] = useState("");
  const [isGlitching, setIsGlitching] = useState(false);

  const typeSequence = useCallback(() => {
    setTypedText("");
    let i = 0;
    let timer;
    const typeWriter = () => {
      if (i < fullText.length) {
        setTypedText(prev => prev + fullText.charAt(i));
        i++;
        timer = setTimeout(typeWriter, 25); // Slightly faster typing
      }
    };
    typeWriter();
    return timer;
  }, [fullText]);

  useEffect(() => {
    const timer = typeSequence();
    return () => clearTimeout(timer);
  }, [typeSequence]);

  const handleTerminalClick = () => {
    if (isGlitching) return;
    setIsGlitching(true);
    setTypedText(">>> СИСТЕМНА ПОМИЛКА... \n>>> ПЕРЕЗАВАНТАЖЕННЯ ЯДРА... \n");
    
    setTimeout(() => {
      setIsGlitching(false);
      typeSequence();
    }, 1500);
  };

  return (
    <div 
      className={`${styles.terminalWindow} ${isGlitching ? styles.terminalGlitchEffect : ''}`}
      onClick={handleTerminalClick}
      role="button"
      tabIndex={0}
      title="Натисніть для перезавантаження терміналу"
    >
      <div className={styles.terminalHeader}>
        <span className={`${styles.macBtn} ${styles.redBtn}`}></span>
        <span className={`${styles.macBtn} ${styles.yellowBtn}`}></span>
        <span className={`${styles.macBtn} ${styles.greenBtn}`}></span>
        <div className={styles.terminalTitle}>root@fatality-server:~</div>
      </div>
      <div className={styles.terminalBody}>
        <pre className={`${styles.typewriterText} ${isGlitching ? styles.textError : ''}`}>
          {typedText}
          <span className={styles.cursor}>_</span>
        </pre>
      </div>
    </div>
  );
};

// 2. Статистичний блок з анімацією лічильника
const StatCard = ({ stat, isVisible }) => {
  const currentCount = useCountUp(stat.value, 2500, isVisible);

  return (
    <div className={styles.statBox}>
      <div className={styles.statIconWrapper}>{stat.icon}</div>
      <div className={styles.statValueCounter}>
        <span className={styles.counterNumber}>{currentCount}</span>
        <span className={styles.counterSuffix}>{stat.suffix}</span>
      </div>
      <div className={styles.statLabelText}>{stat.label}</div>
    </div>
  );
};

// 3. Магнітна кнопка (CTA)
const MagneticButton = ({ children, to }) => {
  const btnRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.3; // Strength of pull
    const y = (e.clientY - (top + height / 2)) * 0.3;
    btnRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = `translate(0px, 0px)`;
  };

  return (
    <div className={styles.magneticWrap} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <Link to={to} ref={btnRef} className={styles.ctaGlitchBtn}>
        {children}
      </Link>
    </div>
  );
};

// ─── ГОЛОВНИЙ КОМПОНЕНТ ───────────────────────────────────────────────────
export default function About() {
  const [activeStep, setActiveStep] = useState(PROCESS_STEPS[0]);
  const hero3DRef = useRef(null);
  
  const [statsRef, statsVisible] = useScrollReveal();
  const [valuesRef, valuesVisible] = useScrollReveal();
  const [faqRef, faqVisible] = useScrollReveal({ threshold: 0.1 });

  const [openFaq, setOpenFaq] = useState(null);

  const handleMouseMove = (e) => {
    if (!hero3DRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    requestAnimationFrame(() => {
      if (hero3DRef.current) {
        hero3DRef.current.style.transition = 'none';
        // Enhanced 3D effect
        hero3DRef.current.style.transform = `perspective(1200px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg) translateZ(10px)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (!hero3DRef.current) return;
    requestAnimationFrame(() => {
      hero3DRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
      hero3DRef.current.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    });
  };

  return (
    <main className={styles.aboutPageWrapper}>
      <Helmet>
        <title>Про магазин | FATALITY</title>
        <meta name="description" content="Дізнайтеся більше про FATALITY. Професійне відновлення та тестування вживаних консолей." />
      </Helmet>
      
      {/* Прогрес-бар читання сторінки (Top) */}
      <div className={styles.scrollProgressBar} aria-hidden="true"></div>

      <div className={styles.animatedBackground} aria-hidden="true"></div>

      {/* 1. HERO СЕКЦІЯ */}
      <section 
        className={styles.heroSection} 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.container}>
          <div className={styles.hero3DContainer} ref={hero3DRef}>
            <div className={styles.heroContent}>
              <div className={styles.statusBadge}>
                <span className={styles.pulseDot}></span> СИСТЕМА ОНЛАЙН
              </div>
              <h1 className={styles.glitchTitle} data-text="FATALITY">FATALITY</h1>
              <h2 className={styles.subTitle}>
                ПЕРЕЗАВАНТАЖЕННЯ <span className={styles.redText}>ГЕЙМІНГУ</span>
              </h2>
              <p className={styles.heroDescription}>
                Ми не просто інтернет-магазин. FATALITY — це реальний шоурум у м. Дніпро та професійний сервісний центр. 
                Кожна приставка — це кібернетичний організм, 
                який пройшов повне очищення, заміну "крові" (термопасти) 
                та жорсткий стрес-тест перед тим, як потрапити до ваших рук.
              </p>
            </div>
            
            <div className={styles.heroImageSide} aria-hidden="true">
              <FaSkull className={styles.skullBgIcon} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. ТЕРМІНАЛ */}
      <section className={styles.terminalSection}>
        <div className={styles.container}>
          <TerminalWindow fullText={TERMINAL_TEXT} />
        </div>
      </section>

      {/* 3. СТАТИСТИКА */}
      <section className={`${styles.statsSection} ${statsVisible ? styles.revealed : styles.hidden}`} ref={statsRef}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {STATS_DATA.map((stat) => (
              <StatCard key={stat.id} stat={stat} isVisible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. ІНТЕРАКТИВНИЙ ПРОТОКОЛ */}
      <section className={styles.processSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.glitchHeading} data-text="ПРОТОКОЛ ВІДНОВЛЕННЯ">
              ПРОТОКОЛ <span className={styles.redText}>ВІДНОВЛЕННЯ</span>
            </h2>
            <p className={styles.sectionSubtext}>Наш 4-рівневий стандарт підготовки вживаних консолей. Жодних компромісів.</p>
          </div>

          <div className={styles.processInteractive}>
            <div className={styles.processTabs} role="tablist">
              {PROCESS_STEPS.map((step) => (
                <button 
                  key={step.id} 
                  role="tab"
                  aria-selected={activeStep.id === step.id}
                  className={`${styles.stepTab} ${activeStep.id === step.id ? styles.activeStepTab : ''}`}
                  onClick={() => setActiveStep(step)}
                >
                  <div className={styles.stepTabIcon}>{step.icon}</div>
                  <span>{step.title}</span>
                </button>
              ))}
            </div>

            <div className={styles.activeStepDisplay} role="tabpanel">
              {/* Force re-render of animation by keying the container to the step ID */}
              <div key={activeStep.id} className={styles.stepContentBox}>
                <div className={styles.stepWatermark} aria-hidden="true">{activeStep.id.split('-')[1]}</div>
                <h3 className={styles.stepTitle}>{activeStep.title}</h3>
                <p className={styles.stepDescription}>{activeStep.description}</p>
                
                <div className={styles.techDetailsBlock}>
                  <h4 className={styles.techDetailsTitle}><FaFingerprint /> Технічні протоколи:</h4>
                  <ul className={styles.techDetailsList}>
                    {activeStep.techDetails.map((detail, idx) => (
                      <li key={idx} style={{ animationDelay: `${idx * 0.1}s` }} className={styles.techListItem}>
                        <FaCheckCircle className={styles.checkIconMin} /> {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ЦІННОСТІ */}
      <section className={`${styles.valuesSection} ${valuesVisible ? styles.revealed : styles.hidden}`} ref={valuesRef}>
        <div className={styles.container}>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <FaMicrochip className={styles.valueIconHuge} />
              <h3>Апаратний ідеал</h3>
              <p>Ми не використовуємо "прогрівання" чіпів. Лише компонентний ремонт на професійному обладнанні.</p>
            </div>
            
            <div className={styles.valueCard}>
              <FaGamepad className={styles.valueIconHuge} />
              <h3>Чиста гра</h3>
              <p>Геймпади розбираються до нуля. Стіки замінюються на нові оригінальні 3D-механізми від ALPS.</p>
            </div>

            <div className={styles.valueCard}>
              <FaSyncAlt className={styles.valueIconHuge} />
              <h3>Trade-IN 2.0</h3>
              <p>Принеси свою стару PS3 або PS4 і отримай миттєву знижку на консоль нового покоління.</p>
            </div>

            <div className={styles.valueCard}>
              <FaMapMarkerAlt className={styles.valueIconHuge} />
              <h3>Фізичний магазин</h3>
              <p>Чекаємо на вас у нашому шоурумі в м. Дніпро. Будь-яку консоль можна оглянути, потримати в руках та провести тест-драйв перед покупкою.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className={`${styles.faqSection} ${faqVisible ? styles.revealed : styles.hidden}`} ref={faqRef}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.glitchHeading} data-text="СИСТЕМНІ ЗАПИТАННЯ">
              СИСТЕМНІ <span className={styles.redText}>ЗАПИТАННЯ</span>
            </h2>
          </div>
          
          <div className={styles.faqContainer}>
            {FAQS.map((faq, index) => (
              <div 
                key={index} 
                className={`${styles.faqItem} ${openFaq === index ? styles.faqOpen : ''}`}
              >
                <button 
                  className={styles.faqQuestion}
                  aria-expanded={openFaq === index}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <FaTerminal className={styles.faqQIcon} />
                  <h4>{faq.q}</h4>
                  <FaChevronDown className={styles.faqArrow} />
                </button>
                <div className={styles.faqAnswer} aria-hidden={openFaq !== index}>
                  <div className={styles.faqAnswerInner}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* 7. CTA */}
      <section className={styles.ctaFinalSection}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <FaGamepad className={styles.ctaBigIcon} />
            <h2>ГОДІ ЧЕКАТИ. ПОРА ГРАТИ.</h2>
            <p>Вривайся у світ ексклюзивів Sony з ідеально налаштованою консоллю.</p>
            
            {/* Магнітна Кнопка */}
            <MagneticButton to="/">
              ВІДКРИТИ КАТАЛОГ
            </MagneticButton>

          </div>
        </div>
      </section>

    </main>
  );
}