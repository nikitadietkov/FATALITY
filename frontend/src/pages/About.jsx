import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  FaPlaystation, FaSkull, FaWrench, FaMicrochip, 
  FaTemperatureLow, FaShieldAlt, FaGamepad, FaGhost, 
  FaChevronDown, FaTerminal, FaTrophy, FaBolt, 
  FaSyncAlt, FaFingerprint, FaCrosshairs, FaCheckCircle
} from 'react-icons/fa';
import styles from './About.module.css';

// ─── СТАТИЧНІ ДАНІ (Винесено за межі компонента для продуктивності) ────────
const statsData = [
  { id: 1, icon: <FaTrophy />, value: 3450, label: "Врятованих консолей", suffix: "+" },
  { id: 2, icon: <FaTemperatureLow />, value: 15, label: "Градусів нижче норми", suffix: "°C" },
  { id: 3, icon: <FaShieldAlt />, value: 100, label: "Гарантія якості", suffix: "%" },
  { id: 4, icon: <FaGhost />, value: 0, label: "Шанс на 'Синій екран'", suffix: "%" }
];

const processSteps = [
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
    description: "Консоль відправляється в 'пекло'. 12 годин безперервної роботи у найважчих іграх (Cyberpunk 2077 / RDR2) для перевірки стабільності.",
    techDetails: ["Моніторинг температур", "Тест на артефакти GPU", "Перевірка дроселів на писк"]
  }
];

const faqs = [
  { q: "Чи є ризик бану консолі в PSN?", a: "Абсолютно нульовий. Кожна приставка перевіряється на чистоту MAC-адреси та відсутність банів у базі Sony. Ми гарантуємо 100% доступ до онлайну." },
  { q: "Чому б/в у вас краще, ніж з рук на OLX?", a: "Купуючи з рук, ви граєте в рулетку. У нас ви отримуєте консоль після повного ТО, із заміненою термопастою та офіційною гарантією магазину." },
  { q: "Чи оригінальні геймпади в комплекті?", a: "Так. Ми суворо відбраковуємо китайські репліки. Ви отримуєте лише оригінальні DualShock 4 або DualSense з перевіреними стіками." }
];

const fullText = "Ініціалізація системи... FATALITY Protocol: ACTIVE. \nЗавантаження модулів пам'яті... [ОК]. \nПригнічення системного перегріву... [ОК]. \nГотовність до гри: 100%.";

// ─── КОМПОНЕНТ ─────────────────────────────────────────────────────────────
export default function About() {
  const [activeStep, setActiveStep] = useState(processSteps[0]);
  const [openFaq, setOpenFaq] = useState(null);
  const [typedText, setTypedText] = useState("");
  
  // Використовуємо useRef замість стану для 3D ефекту (уникає рендеру 60 разів/сек)
  const hero3DRef = useRef(null);

  useEffect(() => {
    let i = 0;
    let timer;
    const typeWriter = () => {
      if (i < fullText.length) {
        setTypedText(prev => prev + fullText.charAt(i));
        i++;
        timer = setTimeout(typeWriter, 30);
      }
    };
    typeWriter();
    return () => clearTimeout(timer);
  }, []);

  // Оптимізована функція паралаксу без перемальовування компонента
  const handleMouseMove = (e) => {
    if (!hero3DRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Пряма маніпуляція DOM для максимальної продуктивності
    requestAnimationFrame(() => {
      if (hero3DRef.current) {
        hero3DRef.current.style.transition = 'none';
        hero3DRef.current.style.transform = `perspective(1000px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (!hero3DRef.current) return;
    requestAnimationFrame(() => {
      hero3DRef.current.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      hero3DRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    });
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className={styles.aboutPageWrapper}>
      <Helmet>
          <title>Про магазин | FATALITY</title>
          <meta name="description" content="Дізнайтеся більше про FATALITY. Професійне відновлення та тестування вживаних консолей." />
        </Helmet>
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
                Ми не просто продаємо консолі. Ми повертаємо їх до життя. 
                Кожна приставка у FATALITY — це кібернетичний організм, 
                який пройшов повне очищення, заміну "крові" (термопасти) 
                та жорсткий стрес-тест.
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
          <div className={styles.terminalWindow}>
            <div className={styles.terminalHeader}>
              <span className={`${styles.macBtn} ${styles.redBtn}`}></span>
              <span className={`${styles.macBtn} ${styles.yellowBtn}`}></span>
              <span className={`${styles.macBtn} ${styles.greenBtn}`}></span>
              <div className={styles.terminalTitle}>root@fatality-server:~</div>
            </div>
            <div className={styles.terminalBody}>
              <pre className={styles.typewriterText}>
                {typedText}
                <span className={styles.cursor}>_</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 3. СТАТИСТИКА */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {statsData.map((stat) => (
              <div key={stat.id} className={styles.statBox}>
                <div className={styles.statIconWrapper}>{stat.icon}</div>
                <div className={styles.statValueCounter}>
                  <span className={styles.counterNumber}>{stat.value}</span>
                  <span className={styles.counterSuffix}>{stat.suffix}</span>
                </div>
                <div className={styles.statLabelText}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ІНТЕРАКТИВНИЙ ПРОТОКОЛ */}
      <section className={styles.processSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.glitchHeading}>ПРОТОКОЛ <span className={styles.redText}>ВІДНОВЛЕННЯ</span></h2>
            <p className={styles.sectionSubtext}>Наш 4-рівневий стандарт підготовки вживаних консолей. Жодних компромісів.</p>
          </div>

          <div className={styles.processInteractive}>
            <div className={styles.processTabs} role="tablist">
              {processSteps.map((step) => (
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
              <div className={styles.stepContentBox}>
                <div className={styles.stepWatermark} aria-hidden="true">{activeStep.id.split('-')[1]}</div>
                <h3 className={styles.stepTitle}>{activeStep.title}</h3>
                <p className={styles.stepDescription}>{activeStep.description}</p>
                
                <div className={styles.techDetailsBlock}>
                  <h4 className={styles.techDetailsTitle}><FaFingerprint /> Технічні протоколи:</h4>
                  <ul className={styles.techDetailsList}>
                    {activeStep.techDetails.map((detail, idx) => (
                      <li key={idx}><FaCheckCircle className={styles.checkIconMin} /> {detail}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ЦІННОСТІ */}
      <section className={styles.valuesSection}>
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
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>СИСТЕМНІ <span className={styles.redText}>ЗАПИТАННЯ</span></h2>
          </div>
          
          <div className={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`${styles.faqItem} ${openFaq === index ? styles.faqOpen : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <button 
                  className={styles.faqQuestion}
                  aria-expanded={openFaq === index}
                >
                  <FaTerminal className={styles.faqQIcon} />
                  <h4>{faq.q}</h4>
                  <FaChevronDown className={styles.faqArrow} />
                </button>
                <div className={styles.faqAnswer}>
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
            <Link to="/" className={styles.ctaGlitchBtn}>
              ВІДКРИТИ КАТАЛОГ
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}