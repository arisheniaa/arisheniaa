#!/usr/bin/env bash
# Переезд на /ph выполнен 5 октября 2026 (Ф86): файл снова копия сервера.
# С самого хоста внутреннее имя `arisheniaa-site` не разрешается — оттуда
# запускать с адресом: `./smoke.sh https://arisheniaa.ru`.
#
# Смоук-проверка сайта arisheniaa.
#
# Первый аргумент — база. Без аргумента проверяется внутренний адрес в сети
# `edge` (http://arisheniaa-site:8080), то есть сам стек в отрыве от прокси;
# с аргументом — публичный https, то есть весь путь целиком. Разделение
# намеренное: если публичная проверка падает, а внутренняя проходит, виноват
# edge-прокси, а не сайт.
set -uo pipefail

BASE=${1:-http://arisheniaa-site:8080}
FAIL=0

check() { # путь ожидаемый_код
  local path=$1 want=$2 got
  got=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$path" 2>/dev/null) || got=ERR
  if [ "$got" = "$want" ]; then
    printf '  ok   %-32s %s\n' "$path" "$got"
  else
    printf '  FAIL %-32s ожидали %s, получили %s\n' "$path" "$want" "$got"
    FAIL=1
  fi
}

# Перенаправление: путь ожидаемый_Location. Сверяется КОНЕЦ адреса:
# curl отдаёт его абсолютным (`http://…/ph/`), а нам важен путь.
redirect() {
  local path=$1 want=$2 out code loc
  out=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 20 "$BASE$path" 2>/dev/null) || out="ERR -"
  code=${out%% *}; loc=${out#* }
  if [ "$code" = 301 ] && [ "${loc%"$want"}" != "$loc" ]; then
    printf '  ok   %-32s 301 -> %s\n' "$path" "$want"
  else
    printf '  FAIL %-32s ожидали 301 -> %s, получили %s %s\n' "$path" "$want" "$code" "$loc"
    FAIL=1
  fi
}

echo "== $BASE =="
echo "-- фото-сайт под /ph/ --"
check /ph/                         200
check /ph/storyboard.html          200
check /ph/storyboard/manifest.json 200
check /ph/favicon.svg              200
check /ph/og.jpg                   200
check /ph/frames/rassvet.webp      200
# Ассеты сборки: имена с хешем берём из отданной страницы, а не зашиваем —
# они меняются с каждой сборкой.
for a in $(curl -sS --max-time 20 "$BASE/ph/" | grep -oE '/ph/assets/[A-Za-z0-9._-]+\.(js|css)' | sort -u); do
  check "$a" 200
done
echo "-- перенаправления --"
redirect /ph                             /ph/
redirect /storyboard.html                /ph/storyboard.html
redirect '/storyboard.html?povod=lyubov' '/ph/storyboard.html?povod=lyubov'
redirect /design.html                    /
echo "-- корень (сайт дизайнера) и подтверждение прав на домен --"
check /                             200
check /googlebd265f6afcbd754f.html  200
check /yandex_9215e07c4779e6c9.html 200
# Несуществующий путь обязан быть 404, а не 200: если тут 200, значит где-то
# включился SPA-фолбэк на index.html и любая опечатка в ссылке молча
# показывает главную вместо честной ошибки. Проверяется на обоих сайтах.
check /nope-does-not-exist     404
check /ph/nope-does-not-exist  404

echo "-- заголовки /ph/ --"
curl -sSI --max-time 20 "$BASE/ph/" | grep -iE '^(HTTP/|content-type|cache-control|content-security-policy|x-frame-options|strict-transport)' | sed 's/^/  /'

exit $FAIL
