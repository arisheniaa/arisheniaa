// Публикация на claude.ai не принимает символ U+FFFD в файлах. В three.js он
// стоит внутри строк (таблица BOM-символов), поэтому его можно записать
// escape-последовательностью � — значение строки то же.
// Символы собираются из кодов, чтобы экранирование не съела оболочка.
import fs from 'node:fs';

const BAD = String.fromCharCode(0xfffd);
const ESC = String.fromCharCode(92) + 'uFFFD';
const dir = process.argv[2] || 'dist/assets';
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const p = `${dir}/${f}`;
  const s = fs.readFileSync(p, 'utf8');
  const n = s.split(BAD).length - 1;
  if (n) {
    fs.writeFileSync(p, s.split(BAD).join(ESC));
    console.log(f, n);
  }
}
