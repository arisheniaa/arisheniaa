#!/usr/bin/env bash
# Переезд на /ph выполнен 5 октября 2026 (Ф86): файл снова копия сервера.
# Проверка того, что правки видимости реально дошли до посетителя, а не
# просто лежат в исходниках: файлы отдаются с верным типом, а теги есть в
# отданном HTML. Проверять надо именно отданное — vite копирует `public/`
# в корень сборки, и ошибка в этом месте не видна по исходникам.
set -u
B=${1:-https://arisheniaa.194.87.187.207.sslip.io}

echo "== файлы =="
for p in /robots.txt /ph/sitemap.xml /ph/og.jpg; do
  printf '  %-14s ' "$p"
  curl -sS -o /dev/null -w '%{http_code}  %{content_type}  %{size_download} байт\n' --max-time 20 "$B$p"
done

echo
echo "== теги главной фото-сайта (/ph/) =="
curl -sS --max-time 20 "$B/ph/" \
  | grep -oE '<link rel="canonical"[^>]*>|<meta property="og:[^>]*>|<meta name="twitter:card"[^>]*>' \
  | sed 's/^/  /'

echo
echo "== теги страницы раскадровки (/ph/storyboard.html) =="
curl -sS --max-time 20 "$B/ph/storyboard.html" \
  | grep -oE '<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>|<meta property="og:title"[^>]*>' \
  | sed 's/^/  /'

echo
echo "== корневой robots.txt (сайт дизайнера): строка Sitemap фото-сайта =="
curl -sS --max-time 20 "$B/robots.txt" | grep -i '^sitemap:' | sed 's/^/  /'
curl -sS --max-time 20 "$B/robots.txt" | grep -qi '^sitemap: *https://arisheniaa.ru/ph/sitemap.xml' \
  || echo '  НЕТ строки «Sitemap: https://arisheniaa.ru/ph/sitemap.xml» — поисковик сам не найдёт карту фото-сайта'
