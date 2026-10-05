import { lazy, Suspense } from 'react';
import { Mesh } from './Mesh';

const ShaderCanvas = lazy(() => import('./ShaderCanvas'));

/**
 * ШЕЙДЕР — ровно её настройка с shadergradient.co (ссылка из постановки,
 * параметры не тронуты): сфера, бирюза #73bfc4, оранжевый #ff810a, лаванда
 * #8da0ce, зерно включено, скорость 0.3.
 *
 * Карты освещения лежат у нас (`public/hdr`), а не грузятся с github.io:
 * оттуда они идут медленно и могут не открыться без VPN, а CSP боевого
 * сайта (`default-src 'self'`) их и так бы не пустил. Библиотека всегда
 * просит три карты, хотя пресет `city` использует одну, — `dawn` и `lobby`
 * у нас пустышки 1×1 по 49 байт вместо 1.5 МБ каждая.
 *
 * ЛЁГКИЙ РЕЖИМ (`lite`) — для слабых телефонов (вопрос 10, вариант «2»):
 * вместо WebGL снятый кадр этого же шейдера, который медленно дышит в CSS.
 * Батарею не ест, на старте ничего не компилирует.
 */
export const SHADER_URL =
  'https://www.shadergradient.co/customize?animate=on&axesHelper=off&bgColor1=%23000000&bgColor2=%23000000&brightness=0.8&cAzimuthAngle=270&cDistance=0.5&cPolarAngle=180&cameraZoom=15.1&color1=%2373bfc4&color2=%23ff810a&color3=%238da0ce&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide&grain=on&lightType=env&pixelDensity=1&positionX=-0.1&positionY=0&positionZ=0&range=disabled&rangeEnd=40&rangeStart=0&reflection=0.4&rotationX=0&rotationY=130&rotationZ=70&shader=defaults&type=sphere&uAmplitude=3.2&uDensity=0.8&uFrequency=5.5&uSpeed=0.3&uStrength=0.3&uTime=0&wireframe=false';

const B = import.meta.env.BASE_URL;
export const SHADER_POSTER = `${B}shader-poster.webp`;

export function Shader({
  kind = 'mesh',
  density = 1,
  className = '',
}: {
  kind?: 'mesh' | 'shader' | 'lite';
  density?: number;
  className?: string;
}) {
  if (kind === 'mesh') return <Mesh className={className} />;
  if (kind === 'lite') {
    return (
      <div className={`shader-lite ${className}`} aria-hidden>
        <img src={SHADER_POSTER} alt="" draggable={false} />
      </div>
    );
  }
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden>
      <Suspense fallback={null}>
        <ShaderCanvas density={density} />
      </Suspense>
    </div>
  );
}
