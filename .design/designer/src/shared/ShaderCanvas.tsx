import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { SHADER_URL } from './Shader';

/* Сам WebGL-холст — отдельным модулем, чтобы three.js (≈330 КБ сжатым)
   грузился только когда шейдер живой. Лёгкий режим его не скачивает. */
const B = import.meta.env.BASE_URL;

export default function ShaderCanvas({ density }: { density: number }) {
  return (
    <ShaderGradientCanvas
      pixelDensity={density}
      fov={45}
      pointerEvents="none"
      envBasePath={`${B}hdr/`}
      lazyLoad={false}
      preserveDrawingBuffer={new URLSearchParams(location.search).has('poster')}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ShaderGradient control="query" urlString={SHADER_URL} />
    </ShaderGradientCanvas>
  );
}
