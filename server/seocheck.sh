#!/usr/bin/env bash
# Проверка того, что правки видимости реально дошли до посетителя, а не
# просто лежат в исходниках: файлы отдаются с верным типом, а теги есть в
# отданном HTML. Проверять надо именно отданное — vite копирует `public/`
# в корень сборки, и ошибка в этом месте не видна по исходникам.
set -u
B=${1:-https://arisheniaa.194.87.187.207.sslip.io}

echo "== файлы =="
for p in /robots.txt /sitemap.xml /og.jpg; do
  printf '  %-14s ' "$p"
  curl -sS -o /dev/null -w '%{http_code}  %{content_type}  %{size_download} байт\n' --max-time 20 "$B$p"
done

echo
echo "== теги главной =="
curl -sS --max-time 20 "$B/" \
  | grep -oE '<link rel="canonical"[^>]*>|<meta property="og:[^>]*>|<meta name="twitter:card"[^>]*>' \
  | sed 's/^/  /'

echo
echo "== теги страницы раскадровки =="
curl -sS --max-time 20 "$B/storyboard.html" \
  | grep -oE '<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>|<meta property="og:title"[^>]*>' \
  | sed 's/^/  /'

echo
echo "== содержимое robots.txt =="
curl -sS --max-time 20 "$B/robots.txt" | grep -v '^#' | grep -v '^$' | sed 's/^/  /'
