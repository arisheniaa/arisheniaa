import { useEffect, useState } from 'react';
import type { Device } from './DeviceHero';
import { copy } from './copy';
import { Signature } from './Signature';

/** Плёнка поверх всего: зерно, два засвета, виньетка (вопрос 3). */
export function FilmFx({ grain = 0.14, leak = 0.18, vignette = 0.45 }: { grain?: number; leak?: number; vignette?: number }) {
  return (
    <div
      className="film"
      aria-hidden
      style={{ '--grain': grain, '--leak': leak, '--vignette': vignette } as React.CSSProperties}
    >
      {leak > 0 && (
        <>
          <div className="film-leak l1" />
          <div className="film-leak l2" />
        </>
      )}
      {vignette > 0 && <div className="film-vignette" />}
      <div className="film-grain" />
    </div>
  );
}

/**
 * Режим показа. Фон экрана и сайта:
 *   mesh   — градиент из пятен, меняется при прокрутке (по умолчанию; её
 *            правка «шейдер тяжёлый, сделаем статичнее, как на моём сайте»);
 *   shader — прежний живой WebGL-шейдер, оставлен для сравнения;
 *   lite   — снятый кадр шейдера.
 * Узкий экран → телефон. `phone` — пресет варианта для телефона: 'full'
 * включает наклон в параллаксе (A, C), 'lite' — нет (B, D).
 * Параметры `?device=` и `?fx=` переопределяют.
 */
export type Fx = 'mesh' | 'shader' | 'lite';
export function useMode(phone: 'full' | 'lite') {
  const q = new URLSearchParams(location.search);
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const device: Device = (q.get('device') as Device) || (narrow ? 'phone' : 'laptop');
  const fx = (q.get('fx') as Fx) || 'mesh';
  return { device, fx, tilt: phone === 'full' };
}

export function CmpBar({ fx, variant }: { fx: Fx; variant: string }) {
  const q = (v: string) => {
    const u = new URLSearchParams(location.search);
    u.set('fx', v);
    return `?${u}`;
  };
  return (
    <nav className="cmp-bar" aria-label="Сравнение вариантов">
      <a href="./variants.html">← все</a>
      <span style={{ padding: '7px 6px', opacity: 0.5 }}>{variant}</span>
      <a href={q('mesh')} aria-current={fx === 'mesh'}>градиент</a>
      <a href={q('shader')} aria-current={fx === 'shader'}>шейдер</a>
    </nav>
  );
}

/** Шапка: подпись-логотип слева, разделы и дверь в фотографию справа. */
export function Topbar({ className = '', logoClass = '' }: { className?: string; logoClass?: string }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 1.6);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`topbar ${solid ? 'is-solid' : ''} ${className}`}>
      <a href="#top" aria-label="arisheniaa — наверх" className={`topbar-logo ${logoClass}`}>
        {/* Жёлтая звёздочка слева от ника — та же, что на фото-сайте
            (`../hybrid/src/Stars.tsx`, StarMark, цвет --star-gold). */}
        <svg className="topbar-star" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path d="M20.5 1 L24.2 13.8 L36.5 10.4 L28.9 20.6 L39 26.3 L26.4 27.6 L28.2 39 L19.2 31.2 L10.4 38.4 L12.1 26.6 L1 23.4 L11.6 18.2 L6.2 8.1 L18.1 13.2 Z" fill="currentColor" />
        </svg>
        <span className="block w-[clamp(92px,11vw,128px)]">
          <Signature play duration={0.9} stagger={0.08} pen={false} />
        </span>
      </a>
      <nav aria-label="Разделы" className="topnav">
        {copy.nav.map((n) => (
          <a key={n.href} href={n.href}>
            {n.label}
          </a>
        ))}
        <a href={copy.photoLink.href} className="topnav-ph">
          {copy.photoLink.label} ↗
        </a>
      </nav>
    </header>
  );
}

/** Подпись «черновик текста» у разделов, которые она ещё не писала. */
export function Draft() {
  return <span className="draft-mark">{copy.draftMark}</span>;
}

/**
 * Перенаправление старых фото-якорей (BRIEF: «старые ссылки вида
 * /#uslugi»). Часть адреса после `#` сервер не видит, поэтому 301 тут
 * невозможен — переносит скрипт. Якоря дизайна (`#works` и др.) не
 * трогаются. Список — все `id` разделов фото-ветки в `../hybrid` (сверено grep).
 */
const PHOTO_ANCHORS = ['main', 'hero', 'kadry', 'o-mne', 'raboty', 'uslugi', 'podgotovka', 'raskadrovka', 'kontakt'];
export function redirectPhotoAnchors() {
  const h = location.hash.slice(1);
  if (h && PHOTO_ANCHORS.includes(h) && location.pathname.replace(/\/(index\.html)?$/, '') === '') {
    location.replace(`/ph#${h}`);
  }
}
