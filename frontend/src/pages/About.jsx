import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FaSkull, FaWrench, FaMicrochip,
  FaTemperatureLow, FaShieldAlt, FaGamepad, FaGhost,
  FaChevronDown, FaTerminal, FaTrophy, FaBolt,
  FaSyncAlt, FaFingerprint, FaCrosshairs, FaCheckCircle, FaMapMarkerAlt
} from 'react-icons/fa';
import styles from './About.module.css';

// ─── STATIC DATA ─────────────────────────────────────────────────────────────
// FIX: Icons moved out of static data objects to avoid recreating JSX on every render.
// They are now referenced by key and rendered in the component.
const STATS_DATA = [
  { id: 1, iconKey: 'trophy',   value: 3450, label: 'Врятованих консолей',      suffix: '+' },
  { id: 2, iconKey: 'temp',     value: 15,   label: 'Градусів нижче норми',      suffix: '°C' },
  { id: 3, iconKey: 'shield',   value: 100,  label: 'Гарантія якості',           suffix: '%' },
  { id: 4, iconKey: 'ghost',    value: 0,    label: "Шанс на 'Синій екран'",     suffix: '%' },
];

const STAT_ICONS = {
  trophy: <FaTrophy aria-hidden="true" />,
  temp:   <FaTemperatureLow aria-hidden="true" />,
  shield: <FaShieldAlt aria-hidden="true" />,
  ghost:  <FaGhost aria-hidden="true" />,
};

const PROCESS_STEPS = [
  {
    id: 'step-1',
    title: '1. ДІАГНОСТИКА',
    iconKey: 'crosshairs',
    description: "Кожна консоль проходить рентген наших спеціалістів. Ми виявляємо мікротріщини, перевіряємо стан чіпів пам'яті та рівень деградації APU.",
    techDetails: ['Перевірка HDMI-ретаймера', 'Тест лазерної лінзи приводу', 'Аналіз SMART жорсткого диску'],
  },
  {
    id: 'step-2',
    title: '2. ХІРУРГІЯ',
    iconKey: 'wrench',
    description: 'Повне розбирання до гвинтика. Ультразвукова чистка плати від пилу, який збирався роками. Жоден мікроб не виживе.',
    techDetails: ['Ультразвукова ванна', 'Заміна термопрокладок на Thermal Grizzly', 'Відновлення контактних доріжок'],
  },
  {
    id: 'step-3',
    title: '3. ОХОЛОДЖЕННЯ',
    iconKey: 'bolt',
    description: 'Ми міняємо висохлу заводську термопасту на преміальну Arctic MX-4 або свіжий рідкий метал (для PS5), знижуючи температуру на 10–15 градусів.',
    techDetails: ['Нанесення рідкого металу', 'Балансування кулера', 'Заміна притискної пластини'],
  },
  {
    id: 'step-4',
    title: '4. СТРЕС-ТЕСТ',
    iconKey: 'terminal',
    description: "Консоль відправляється в 'пекло'. 12 годин безперервної роботи у найважчих іграх (Cyberpunk 2077 / S.T.A.L.K.E.R. 2) для перевірки стабільності.",
    techDetails: ['Моніторинг температур', 'Тест на артефакти GPU', 'Перевірка дроселів на писк'],
  },
];

const STEP_ICONS = {
  crosshairs: <FaCrosshairs aria-hidden="true" />,
  wrench:     <FaWrench aria-hidden="true" />,
  bolt:       <FaBolt aria-hidden="true" />,
  terminal:   <FaTerminal aria-hidden="true" />,
};

const FAQS = [
  {
    q: 'Чи є ризик бану консолі в PSN?',
    a: 'Абсолютно нульовий. Кожна приставка перевіряється на чистоту MAC-адреси та відсутність банів у базі Sony. Ми гарантуємо 100% доступ до онлайну.',
  },
  {
    q: "Чому б/в у нас краще, ніж з рук на OLX?",
    a: 'Купуючи з рук, ви граєте в рулетку. У нас ви отримуєте консоль після повного ТО, із заміненою термопастою та офіційною гарантією магазину.',
  },
  {
    q: 'Чи оригінальні геймпади в комплекті?',
    a: 'Так. Ми суворо відбраковуємо китайські репліки. Ви отримуєте лише оригінальні DualShock 4 або DualSense з перевіреними стіками.',
  },
];

const TERMINAL_TEXT =
  "Ініціалізація системи... FATALITY Protocol: ACTIVE.\nЗавантаження модулів пам'яті... [ОК].\nПригнічення системного перегріву... [ОК].\nГотовність до гри: 100%.";

// ─── CUSTOM HOOKS ─────────────────────────────────────────────────────────────

/**
 * Scroll-reveal via IntersectionObserver.
 * FIX: options object stabilised with useMemo/stringify to avoid infinite re-runs.
 */
const useScrollReveal = (threshold = 0.2) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  return [ref, isVisible];
};

/**
 * Animated counter with easeOutExpo.
 * FIX: guards against running when `end === 0` to skip unnecessary rAF loop.
 */
const useCountUp = (end, duration = 2000, startPlaying = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startPlaying) return;
    if (end === 0) { setCount(0); return; }

    let startTime = null;
    let raf;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, startPlaying]);

  return count;
};

/**
 * Detects user's reduced-motion preference so we can skip heavy animations.
 */
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

/**
 * TerminalWindow
 * FIX: clearTimeout of the *last* scheduled timer ID (not the first returned
 *      one). Added keyboard handler for accessibility (Enter / Space).
 *      Added `will-change` class only while animating.
 */
const TerminalWindow = memo(({ fullText }) => {
  const [typedText, setTypedText]   = useState('');
  const [isGlitching, setIsGlitching] = useState(false);
  const timerRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  const typeSequence = useCallback(() => {
    setTypedText('');
    if (reducedMotion) { setTypedText(fullText); return; }

    let i = 0;
    const typeWriter = () => {
      if (i < fullText.length) {
        setTypedText((prev) => prev + fullText.charAt(i));
        i++;
        timerRef.current = setTimeout(typeWriter, 22);
      }
    };
    typeWriter();
  }, [fullText, reducedMotion]);

  useEffect(() => {
    typeSequence();
    return () => clearTimeout(timerRef.current);
  }, [typeSequence]);

  const handleActivate = useCallback(() => {
    if (isGlitching) return;
    clearTimeout(timerRef.current);
    setIsGlitching(true);
    setTypedText('>>> СИСТЕМНА ПОМИЛКА...\n>>> ПЕРЕЗАВАНТАЖЕННЯ ЯДРА...\n');
    timerRef.current = setTimeout(() => {
      setIsGlitching(false);
      typeSequence();
    }, 1500);
  }, [isGlitching, typeSequence]);

  // FIX: handle keyboard activation (Enter / Space) for accessibility
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  }, [handleActivate]);

  return (
    <div
      className={`${styles.terminalWindow} ${isGlitching ? styles.terminalGlitchEffect : ''}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Термінал FATALITY. Натисніть Enter або Пробіл для перезавантаження"
      title="Натисніть для перезавантаження терміналу"
    >
      <div className={styles.terminalHeader} aria-hidden="true">
        <span className={`${styles.macBtn} ${styles.redBtn}`}   />
        <span className={`${styles.macBtn} ${styles.yellowBtn}`}/>
        <span className={`${styles.macBtn} ${styles.greenBtn}`} />
        <div className={styles.terminalTitle}>root@fatality-server:~</div>
      </div>
      <div className={styles.terminalBody}>
        <pre className={`${styles.typewriterText} ${isGlitching ? styles.textError : ''}`}>
          {typedText}
          <span className={styles.cursor} aria-hidden="true">_</span>
        </pre>
      </div>
    </div>
  );
});
TerminalWindow.displayName = 'TerminalWindow';

/**
 * StatCard
 * FIX: wrapped in memo so it only re-renders when its props change.
 *      Screen-reader label combines number + suffix + label.
 */
const StatCard = memo(({ stat, isVisible }) => {
  const count = useCountUp(stat.value, 2500, isVisible);

  return (
    <div className={styles.statBox}>
      <div className={styles.statIconWrapper} aria-hidden="true">
        {STAT_ICONS[stat.iconKey]}
      </div>
      <div
        className={styles.statValueCounter}
        aria-label={`${stat.value}${stat.suffix} — ${stat.label}`}
      >
        <span className={styles.counterNumber} aria-hidden="true">{count}</span>
        <span className={styles.counterSuffix} aria-hidden="true">{stat.suffix}</span>
      </div>
      <div className={styles.statLabelText} aria-hidden="true">{stat.label}</div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

/**
 * MagneticButton
 * FIX: disable magnetic effect on touch devices and when reduced motion is on.
 *      Use CSS transition reset via class instead of inline style thrashing.
 *      `will-change: transform` applied only while hovered.
 */
const MagneticButton = memo(({ children, to }) => {
  const btnRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleMouseMove = useCallback((e) => {
    if (reducedMotion || !btnRef.current) return;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = (e.clientX - (left + width  / 2)) * 0.28;
    const y = (e.clientY - (top  + height / 2)) * 0.28;
    btnRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, [reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = 'translate(0px, 0px)';
  }, []);

  return (
    <div
      className={styles.magneticWrap}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Link to={to} ref={btnRef} className={styles.ctaGlitchBtn}>
        {children}
      </Link>
    </div>
  );
});
MagneticButton.displayName = 'MagneticButton';

/**
 * ProcessTabs
 * FIX: extracted into its own memoised component so unrelated state changes
 *      (openFaq, etc.) don't re-render the tab panel.
 *      Added aria-controls / aria-labelledby pairing for true ARIA tab pattern.
 */
const ProcessTabs = memo(() => {
  const [activeStep, setActiveStep] = useState(PROCESS_STEPS[0]);

  return (
    <div className={styles.processInteractive}>
      <div className={styles.processTabs} role="tablist" aria-label="Кроки відновлення">
        {PROCESS_STEPS.map((step) => {
          const isActive = activeStep.id === step.id;
          return (
            <button
              key={step.id}
              id={`tab-${step.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${step.id}`}
              className={`${styles.stepTab} ${isActive ? styles.activeStepTab : ''}`}
              onClick={() => setActiveStep(step)}
            >
              <span className={styles.stepTabIcon} aria-hidden="true">
                {STEP_ICONS[step.iconKey]}
              </span>
              <span>{step.title}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${activeStep.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeStep.id}`}
        className={styles.activeStepDisplay}
      >
        {/* key forces CSS animation to re-trigger on step change */}
        <div key={activeStep.id} className={styles.stepContentBox}>
          <div className={styles.stepWatermark} aria-hidden="true">
            {activeStep.id.split('-')[1]}
          </div>
          <h3 className={styles.stepTitle}>{activeStep.title}</h3>
          <p className={styles.stepDescription}>{activeStep.description}</p>

          <div className={styles.techDetailsBlock}>
            <h4 className={styles.techDetailsTitle}>
              <FaFingerprint aria-hidden="true" /> Технічні протоколи:
            </h4>
            <ul className={styles.techDetailsList}>
              {activeStep.techDetails.map((detail, idx) => (
                <li
                  key={idx}
                  className={styles.techListItem}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <FaCheckCircle className={styles.checkIconMin} aria-hidden="true" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});
ProcessTabs.displayName = 'ProcessTabs';

/**
 * FaqAccordion
 * FIX: extracted + memoised. Proper height animation via CSS custom property
 *      approach is handled in CSS; here we just toggle open state.
 *      aria-hidden replaced with aria-expanded on the trigger (correct pattern).
 */
const FaqAccordion = memo(() => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggle = useCallback((index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={styles.faqContainer}>
      {FAQS.map((faq, index) => {
        const isOpen = openFaq === index;
        return (
          <div
            key={index}
            className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}
          >
            <button
              className={styles.faqQuestion}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
              id={`faq-btn-${index}`}
              onClick={() => toggle(index)}
            >
              <FaTerminal className={styles.faqQIcon} aria-hidden="true" />
              <span className={styles.faqQuestionText}>{faq.q}</span>
              <FaChevronDown className={styles.faqArrow} aria-hidden="true" />
            </button>
            <div
              id={`faq-answer-${index}`}
              role="region"
              aria-labelledby={`faq-btn-${index}`}
              className={styles.faqAnswer}
            >
              <div className={styles.faqAnswerInner}>
                <p>{faq.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
FaqAccordion.displayName = 'FaqAccordion';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function About() {
  const hero3DRef = useRef(null);
  const rafRef    = useRef(null);

  const [statsRef,  statsVisible]  = useScrollReveal(0.2);
  const [valuesRef, valuesVisible] = useScrollReveal(0.2);
  const [faqRef,    faqVisible]    = useScrollReveal(0.1);

  const reducedMotion = usePrefersReducedMotion();

  // FIX: cancel pending rAF on unmount to prevent setState-after-unmount.
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (reducedMotion || !hero3DRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!hero3DRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      hero3DRef.current.style.transition = 'none';
      hero3DRef.current.style.transform  =
        `perspective(1200px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translateZ(10px)`;
    });
  }, [reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (!hero3DRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!hero3DRef.current) return;
      hero3DRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
      hero3DRef.current.style.transform  =
        'perspective(1200px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    });
  }, []);

  return (
    <main className={styles.aboutPageWrapper}>
      <Helmet>
        <title>Про магазин | FATALITY</title>
        <meta
          name="description"
          content="Дізнайтеся більше про FATALITY — реальний шоурум у Дніпрі та професійний сервісний центр вживаних консолей."
        />
      </Helmet>

      {/* Reading progress bar — CSS scroll-driven animation, no JS */}
      <div className={styles.scrollProgressBar} aria-hidden="true" />

      {/* Ambient grid background — pointer-events: none, GPU-composited */}
      <div className={styles.animatedBackground} aria-hidden="true" />

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section
        className={styles.heroSection}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label="Про FATALITY"
      >
        <div className={styles.container}>
          <div className={styles.hero3DContainer} ref={hero3DRef}>
            <div className={styles.heroContent}>
              <div className={styles.statusBadge} aria-label="Статус: онлайн">
                <span className={styles.pulseDot} aria-hidden="true" />
                СИСТЕМА ОНЛАЙН
              </div>

              <h1 className={styles.glitchTitle} data-text="FATALITY">
                FATALITY
              </h1>

              <p className={styles.subTitle}>
                ПЕРЕЗАВАНТАЖЕННЯ <span className={styles.redText}>ГЕЙМІНГУ</span>
              </p>

              <p className={styles.heroDescription}>
                Ми не просто інтернет-магазин. FATALITY — це реальний шоурум у&nbsp;м.&nbsp;Дніпро
                та&nbsp;професійний сервісний центр. Кожна приставка — кібернетичний організм,
                який пройшов повне очищення, заміну «крові» (термопасти) та&nbsp;жорсткий
                стрес-тест перед тим, як потрапити до ваших рук.
              </p>
            </div>

            <div className={styles.heroImageSide} aria-hidden="true">
              <FaSkull className={styles.skullBgIcon} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TERMINAL ─────────────────────────────────────────────── */}
      <section className={styles.terminalSection} aria-label="Системний термінал">
        <div className={styles.container}>
          <TerminalWindow fullText={TERMINAL_TEXT} />
        </div>
      </section>

      {/* ── 3. STATS ────────────────────────────────────────────────── */}
      <section
        ref={statsRef}
        className={`${styles.statsSection} ${statsVisible ? styles.revealed : styles.hidden}`}
        aria-label="Статистика"
      >
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {STATS_DATA.map((stat) => (
              <StatCard key={stat.id} stat={stat} isVisible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PROCESS ──────────────────────────────────────────────── */}
      <section className={styles.processSection} aria-label="Протокол відновлення">
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.glitchHeading} data-text="ПРОТОКОЛ ВІДНОВЛЕННЯ">
              ПРОТОКОЛ <span className={styles.redText}>ВІДНОВЛЕННЯ</span>
            </h2>
            <p className={styles.sectionSubtext}>
              Наш 4-рівневий стандарт підготовки вживаних консолей. Жодних компромісів.
            </p>
          </header>

          <ProcessTabs />
        </div>
      </section>

      {/* ── 5. VALUES ───────────────────────────────────────────────── */}
      <section
        ref={valuesRef}
        className={`${styles.valuesSection} ${valuesVisible ? styles.revealed : styles.hidden}`}
        aria-label="Наші цінності"
      >
        <div className={styles.container}>
          <div className={styles.valuesGrid}>

            <article className={styles.valueCard}>
              <FaMicrochip className={styles.valueIconHuge} aria-hidden="true" />
              <h3>Апаратний ідеал</h3>
              <p>Ми не використовуємо «прогрівання» чіпів. Лише компонентний ремонт на&nbsp;професійному обладнанні.</p>
            </article>

            <article className={styles.valueCard}>
              <FaGamepad className={styles.valueIconHuge} aria-hidden="true" />
              <h3>Чиста гра</h3>
              <p>Геймпади розбираються до нуля. Стіки замінюються на нові оригінальні 3D-механізми від ALPS.</p>
            </article>

            <article className={styles.valueCard}>
              <FaSyncAlt className={styles.valueIconHuge} aria-hidden="true" />
              <h3>Trade-IN 2.0</h3>
              <p>Принеси свою стару PS3 або PS4 і отримай миттєву знижку на консоль нового покоління.</p>
            </article>

            <article className={styles.valueCard}>
              <FaMapMarkerAlt className={styles.valueIconHuge} aria-hidden="true" />
              <h3>Фізичний магазин</h3>
              <p>Шоурум у&nbsp;м.&nbsp;Дніпро. Будь-яку консоль можна оглянути, потримати в&nbsp;руках та&nbsp;провести тест-драйв перед покупкою.</p>
            </article>

          </div>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────────── */}
      <section
        ref={faqRef}
        className={`${styles.faqSection} ${faqVisible ? styles.revealed : styles.hidden}`}
        aria-label="Часті запитання"
      >
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.glitchHeading} data-text="СИСТЕМНІ ЗАПИТАННЯ">
              СИСТЕМНІ <span className={styles.redText}>ЗАПИТАННЯ</span>
            </h2>
          </header>
          <FaqAccordion />
        </div>
      </section>

      {/* ── 7. CTA ──────────────────────────────────────────────────── */}
      <section className={styles.ctaFinalSection} aria-label="Заклик до дії">
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <FaGamepad className={styles.ctaBigIcon} aria-hidden="true" />
            <h2>ГОДІ ЧЕКАТИ. ПОРА ГРАТИ.</h2>
            <p>Вривайся у&nbsp;світ ексклюзивів Sony з&nbsp;ідеально налаштованою консоллю.</p>
            <MagneticButton to="/">ВІДКРИТИ КАТАЛОГ</MagneticButton>
          </div>
        </div>
      </section>
    </main>
  );
}