#!/usr/bin/env bash
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

echo "== $BASE =="
check /                        200
check /storyboard.html         200
check /storyboard/manifest.json 200
check /favicon.svg             200
# Несуществующий путь обязан быть 404, а не 200: если тут 200, значит где-то
# включился SPA-фолбэк на index.html и любая опечатка в ссылке молча
# показывает главную вместо честной ошибки.
check /nope-does-not-exist     404

echo "-- заголовки / --"
curl -sSI --max-time 20 "$BASE/" | grep -iE '^(HTTP/|content-type|cache-control|content-security-policy|x-frame-options|strict-transport)' | sed 's/^/  /'

exit $FAIL
