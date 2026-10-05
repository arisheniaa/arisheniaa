# -*- coding: utf-8 -*-
"""Фото «Обо мне» как вырезка ножницами (её правки после показа вариантов).

Рамка ЧЁРНАЯ (вторая правка: «без белой рамки — просто вырежи также
чёрной»), прядь, свисавшая слева вдоль шеи, убрана («без косички слева»).

Запуск:  python scripts/cutout.py

По референсу владелицы: человек вырезан из снимка, вокруг — белая
неровная рамка с заострёнными углами, как будто вырезали из журнала.
  1. rembg отделяет человека от фона: на снимке стена с гирляндой, заливкой
     по цвету фон не снять. Модель — u2net_human_seg (обучена на людях);
     общая isnet-general-use оставляла одно лицо без волос и футболки;
  2. маску раздуваем на ширину рамки и обводим контуром;
  3. контур упрощаем до редких вершин (Дуглас–Пекер) — отсюда прямые
     отрезки и острые углы, — и каждую вершину случайно отодвигаем наружу,
     чтобы рамка шла неровно, как от руки;
  4. многоугольник заливаем белым, сверху кладём вырезанного человека;
  5. рамка идёт и там, где человек упирается в край снимка (футболка
     уходит вправо и вниз): снизу и справа плечо тоже в чёрной рамке.
Случайность с фиксированным зерном: перезапуск даёт ту же рамку.
"""
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove
from scipy import ndimage
from skimage.measure import approximate_polygon, find_contours

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(KOREN, "public", "works", "about.webp")
OUT = os.path.join(KOREN, "public", "works", "about-cutout.webp")
OUT_PNG = os.path.join(KOREN, "_shots", "about-cutout-preview.png")

RAMKA = 26      # ширина белой рамки, px исходника
SHAG = 14.0     # допуск упрощения контура: больше — реже вершины, острее углы
DROZH = 12      # насколько вершины гуляют наружу, px
POLE = 60       # поле вокруг, чтобы рамка не упиралась в край
CVET = (12, 11, 10, 255)  # цвет рамки — почти чёрный, как плотная бумага
PRYAD = 13      # тоньше этого (px) выступы маски срезаются: так уходит прядь

rng = np.random.default_rng(9615)

src = Image.open(SRC).convert("RGB")
W, H = src.size
MODEL = os.environ.get("MODEL", "u2net_human_seg")
cut = remove(src, session=new_session(MODEL))
alpha = np.array(cut.split()[-1]).astype(np.float32) / 255.0

# Самый крупный кусок маски — это человек; мелкие островки (блик гирлянды,
# который сеть сочла «объектом») выбрасываем.
m = alpha > 0.5
lab, n = ndimage.label(m)
if n > 1:
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = lab == (1 + int(np.argmax(sizes)))
m = ndimage.binary_fill_holes(m)
# «Косичка»: тонкая прядь слева вдоль шеи. Морфологическое открытие диском
# срезает всё, что уже 2·PRYAD, а крупные формы (голова, плечи) оставляет
# какими были. Потом снова берём самый крупный кусок.
yy, xx = np.mgrid[-PRYAD:PRYAD + 1, -PRYAD:PRYAD + 1]
m = ndimage.binary_opening(m, structure=(xx * xx + yy * yy) <= PRYAD * PRYAD)
lab, n = ndimage.label(m)
if n > 1:
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = lab == (1 + int(np.argmax(sizes)))
alpha = alpha * m

# Холст с полем со всех сторон; лишнее срежем по краям снимка ниже.
CW, CH = W + 2 * POLE, H + 2 * POLE
mask = np.zeros((CH, CW), bool)
mask[POLE:POLE + H, POLE:POLE + W] = m

grown = ndimage.binary_dilation(mask, iterations=RAMKA)
cont = max(find_contours(grown.astype(float), 0.5), key=len)
poly = approximate_polygon(cont, tolerance=SHAG)

# Вершины — наружу от центра масс, на случайную величину.
cy, cx = ndimage.center_of_mass(grown)
pts = []
for y, x in poly:
    v = np.array([y - cy, x - cx])
    v = v / (np.linalg.norm(v) + 1e-6)
    d = rng.uniform(0, DROZH)
    pts.append((x + v[1] * d, y + v[0] * d))

# Длинные прямые участки (низ под фигурой — одна линия во всю ширину)
# разбиваем на отрезки ~110 px с тем же случайным сдвигом наружу: иначе
# низ выходил ровной полосой, а не вырезанным ножницами краем.
dense = []
for i in range(len(pts)):
    x0, y0 = pts[i]
    x1, y1 = pts[(i + 1) % len(pts)]
    dense.append((x0, y0))
    L = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
    n = int(L // 110)
    for j in range(1, n + 1):
        t = j / (n + 1)
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        v = np.array([y - cy, x - cx])
        v = v / (np.linalg.norm(v) + 1e-6)
        d = rng.uniform(-DROZH * 0.4, DROZH)
        dense.append((x + v[1] * d, y + v[0] * d))
pts = dense

paper = Image.new("L", (CW, CH), 0)
ImageDraw.Draw(paper).polygon(pts, fill=255)
# Края, в которые упирается человек, срезаем ровной линией по краю снимка.
dr = ImageDraw.Draw(paper)
# Низ НЕ срезается (её правка: «обрамить снизу такой же чёрной рамкой»):
# рамка идёт и под фигурой. Сама фигура по низу обрезана ровно — как снимок.
if m[0].any():
    dr.rectangle([0, 0, CW, POLE - 1], fill=0)
# Справа тоже НЕ срезается (её правка: «часть плеча, где нет чёрной
# рамки — добавь туда её»): плечо уходит за край снимка, и рамка
# продолжается за ним, как и снизу.
if m[:, 0].any():
    dr.rectangle([0, 0, POLE - 1, CH], fill=0)

out = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
white = Image.new("RGBA", (CW, CH), CVET)
out.paste(white, (0, 0), paper)
person = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
person.paste(cut, (POLE, POLE))
pa = np.zeros((CH, CW), np.float32)
pa[POLE:POLE + H, POLE:POLE + W] = alpha
person.putalpha(Image.fromarray((pa * 255).astype(np.uint8)))
# Тень фигуры на бумаге — на чёрной рамке почти не видна, но оставлена:
# если цвет рамки снова сменят на светлый, она снова нужна.
shadow = Image.fromarray((pa * 255 * 0.28).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
shadow_rgba = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
shadow_rgba.putalpha(shadow)
shadow_rgba = Image.composite(shadow_rgba, Image.new("RGBA", (CW, CH), (0, 0, 0, 0)), paper)
out = Image.alpha_composite(out, shadow_rgba)
out = Image.alpha_composite(out, person)

# Обрезаем пустое поле вокруг.
bbox = out.getbbox()
out = out.crop(bbox)
out.save(OUT, "WEBP", quality=88, method=6)

# Превью на сером, чтобы видеть белую рамку.
bg = Image.new("RGBA", out.size, (120, 120, 120, 255))
Image.alpha_composite(bg, out).save(OUT_PNG)
print(OUT, out.size, "вершин:", len(pts))
