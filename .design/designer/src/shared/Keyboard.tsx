/**
 * Корпус ноутбука из aceternity MacbookScroll: клавиатура, решётки динамиков,
 * тачпад. Иконки tabler на F-клавишах заменены подписями — ради двух
 * десятков пиктограмм размером 6 px тянуть библиотеку иконок незачем.
 * Ряды собраны из массивов вместо ста строк ручной разметки; размеры клавиш
 * и подсветка — как в оригинале.
 */
type K = string | { l: string; w: string; a?: 'start' | 'end' };

const ROWS: K[][] = [
  [{ l: 'esc', w: 'w-10', a: 'start' }, 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', '●'],
  ['~`', '!1', '@2', '#3', '$4', '%5', '^6', '&7', '*8', '(9', ')0', '_—', '+=', { l: 'delete', w: 'w-10', a: 'end' }],
  [{ l: 'tab', w: 'w-10', a: 'start' }, 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{[', '}]', '|\\'],
  [{ l: 'caps lock', w: 'w-[2.8rem]', a: 'start' }, 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':;', `"'`, { l: 'return', w: 'w-[2.85rem]', a: 'end' }],
  [{ l: 'shift', w: 'w-[3.65rem]', a: 'start' }, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<,', '>.', '?/', { l: 'shift', w: 'w-[3.65rem]', a: 'end' }],
  ['fn', 'control', 'option', { l: 'command', w: 'w-8' }, { l: '', w: 'w-[8.2rem]' }, { l: 'command', w: 'w-8' }, 'option', '◂', '▾', '▸'],
];

function KBtn({ k }: { k: K }) {
  const o = typeof k === 'string' ? { l: k, w: '' } : k;
  const two = typeof k === 'string' && k.length === 2 && !/^F\d$/.test(k);
  const align = o.a === 'start' ? 'items-end justify-start pb-[2px] pl-[4px]' : o.a === 'end' ? 'items-end justify-end pr-[4px] pb-[2px]' : 'items-center justify-center';
  return (
    <div className="rounded-[4px] bg-white/[0.2] p-[0.5px] shadow-xl shadow-white">
      <div
        className={`flex h-6 w-6 rounded-[3.5px] bg-[#0A090D] ${o.w} ${align}`}
        style={{ boxShadow: '0px -0.5px 2px 0 #0D0D0F inset, -0.5px 0px 2px 0 #0D0D0F inset' }}
      >
        <div className="flex flex-col items-center justify-center text-[5px] leading-[1.3] text-white">
          {two ? (
            <>
              <span>{o.l[0]}</span>
              <span>{o.l[1]}</span>
            </>
          ) : (
            <span>{o.l}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Keypad() {
  return (
    <div className="mx-1 h-full rounded-md bg-[#050505] p-1">
      {ROWS.map((r, i) => (
        <div key={i} className="mb-[2px] flex w-full shrink-0 gap-[2px]">
          {r.map((k, j) => (
            <KBtn key={j} k={k} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SpeakerGrid() {
  return (
    <div
      className="mt-2 flex h-40 gap-[2px] px-[0.5px]"
      style={{ backgroundImage: 'radial-gradient(circle, #08080A 0.5px, transparent 0.5px)', backgroundSize: '3px 3px' }}
    />
  );
}

export function Trackpad() {
  return <div className="mx-auto my-1 h-32 w-[40%] rounded-xl" style={{ boxShadow: '0px 0px 1px 1px #00000020 inset' }} />;
}
