import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource/cormorant-garamond/cyrillic-500-italic.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource-variable/onest';
import '@fontsource-variable/jetbrains-mono';
import '../shared/base.css';
import './a.css';
import { mount } from '../shared/mount';
import { copy } from '../shared/copy';
import { DeviceHero } from '../shared/DeviceHero';
import { FilmFx, Topbar, useMode } from '../shared/ui';
import { About, ContactsFinale } from '../shared/Sections';
import { Services } from '../shared/Services';
import { LightboxProvider } from '../shared/Lightbox';
import { Progressive } from '../shared/Progressive';
import { CalmVeil } from '../shared/CalmVeil';

/**
 * ВАРИАНТ A «НОЧНОЙ ПОКАЗ» — ВЫБРАН (4 октября 2026), доработка по её правкам.
 *
 * Тёмная основа, фон — ОДИН градиент её цветов на всю страницу (шейдер
 * убран совсем). Цветные волны на стыках блоков (`Seam`) убраны: у полосы
 * всё равно читались края (её скриншот), а она хочет «единый градиент,
 * чтобы совсем не было видно стыков». Цвет теперь меняет только общий фон
 * при прокрутке — у него краёв нет. Заголовки «Работы» и «Обо мне» —
 * видимые (проба «только с текстом» ей не понравилась), у цен и контактов
 * их нет. Слоты под будущие концепты убраны до появления концептов.
 * Тёплое свечение из «Плёнки» — под ноутбуком и под фотографией.
 * Работы — один экран из трёх услуг (`Services`): нажатие раскрывает
 * услугу на весь экран с параллаксом скринов, скрин раскрывается крупно
 * с подписью и ссылкой (`Lightbox`). Блока цен нет — он слит с работами. Блока «все экраны» больше нет:
 * ни лента, ни веер ей не понравились — убран (её решение). Контакты —
 * финальный кадр с подписью (`ContactsFinale`).
 * Облегчение («полный пакет»): зерно неподвижное, без засветов, без размытия
 * стекла и дальних кадров. Разбор и замеры — README.
 */
function A() {
  const { device, fx, tilt } = useMode('full');
  return (
    <LightboxProvider>
      <FilmFx grain={0.12} leak={0} vignette={0.5} />
      <CalmVeil />
      <Topbar />
      <div id="top" />
      <DeviceHero
        /* Компьютер — ноутбук, который не разбирается: камера наезжает на
           него целиком. Телефон — телефон: лежит, поворачивается экраном,
           экран растёт (её правки 5 октября). Надпись «листайте» — только
           на компьютере: остальной компьютер вернулся к виду до этих правок
           (её правка 5 октября, телефон не трогается). */
        device={device}
        zoomWhole
        fx={fx === 'shader' ? 'mesh' : fx}
        glow
        titleHug={40}
        hint={device === 'laptop' ? copy.hero.scroll : undefined}
        title={
          <>
            <p className="a-slogan" lang="en">
              <span>{copy.hero.slogan[0]}</span> <em>{copy.hero.slogan[1]}</em>
            </p>
            <h1 className="a-h1">{copy.hero.h1}</h1>
          </>
        }
      />

      <main className="content">
        <Progressive>
          <section className="a-intro wrap">
            <p>{copy.hero.lead}</p>
          </section>
          {/* Работы и цены — один экран из трёх услуг (её правка 5 октября),
              разбор в Services.tsx. Отдельного блока цен больше нет. */}
          <section id="works" className="wrap svc">
            {/* Ни заголовка «Работы», ни приписки под ним (её правки); для
                читалок заголовок скрытый. */}
            <h2 className="sr-only">{copy.works.title}</h2>
            <Services tilt={tilt} />
          </section>
          {/* Видимого заголовка «Обо мне» нет (её правка), для читалок — скрытый. */}
          <About titled={false} />
          <ContactsFinale />
        </Progressive>
      </main>
    </LightboxProvider>
  );
}

mount(<A />);
