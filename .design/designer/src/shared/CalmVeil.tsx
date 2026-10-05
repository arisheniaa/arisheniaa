import { motion, useScroll, useTransform } from 'motion/react';

/**
 * Затемнение фона после первого экрана — одно на всю страницу (её правка
 * «сделай так, чтобы не видно было этих границ»). Проявляется, когда экран
 * ноутбука уже стал фоном: путь раскрытия в `DeviceHero` — 1.7 высоты окна.
 */
export function CalmVeil() {
  const { scrollY } = useScroll();
  const H = window.innerHeight;
  const opacity = useTransform(scrollY, [H * 1.55, H * 2.2], [0, 1]);
  return <motion.div className="calm-veil" style={{ opacity }} aria-hidden />;
}
