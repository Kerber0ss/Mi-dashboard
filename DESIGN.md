---
name: Mi Dashboard
description: Self-hosted link dashboard dressed as a liquid-glass showcase
colors:
  primary: "#7c5cff"
  status-up: "#22c55e"
  status-down: "#ef4444"
  glass-dark-bg: "linear-gradient(150deg,#0a0f1e,#101828 50%,#0a1020)"
  glass-dark-surface: "rgba(255,255,255,.08)"
  glass-dark-border: "rgba(255,255,255,.18)"
  glass-dark-text: "#f5f7fb"
  glass-dark-text-dim: "#9aa7bd"
  glass-light-bg: "linear-gradient(150deg,#cfe0f2,#eef4fb 50%,#e2ecf7)"
  glass-light-surface: "rgba(255,255,255,.45)"
  glass-light-border: "rgba(255,255,255,.6)"
  glass-light-text: "#182234"
  glass-light-text-dim: "#5a6b85"
typography:
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  card-link:
    backgroundColor: "{colors.glass-dark-surface}"
    textColor: "{colors.glass-dark-text}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  button-toolbar:
    backgroundColor: "{colors.glass-dark-surface}"
    textColor: "{colors.glass-dark-text}"
    rounded: "{rounded.pill}"
  input-modal:
    backgroundColor: "{colors.glass-dark-surface}"
    textColor: "{colors.glass-dark-text}"
    rounded: "{rounded.md}"
---

# Design System: Mi Dashboard

## Overview

**Creative North Star: «Витрина из жидкого стекла»**

Дашборд — это витрина: тёмное помещение, свет за матовым стеклом, объекты парят на разной глубине. Карточки не «боксы», а стеклянные панели с настоящей оптикой — backdrop-blur с saturate даёт эффект стекла, а не серой плашки. Темы — не перекраска, а смена материала витрины: liquid glass меняет преломление, web 2.0 — глянец, web 3.0 — неон на тёмном металле, minimal — матовое стекло. Пользователь меняет материал одним кликом, система обязана выглядеть целостно в любом.

Плотность рабочая, не витринная: дашборд используется ежедневно, воздух есть, но контент первичен. Accent (#7c5cff по умолчанию, переназначаемый пользователем) — драгоценный цвет: он редок и потому заметен.

**Key Characteristics:**
- Depth comes from light behind glass (backdrop-filter blur + saturate), not from black shadows
- Accent is scarce and therefore precious (≤10% of any screen)
- Hover is a tide: lift + glow, spring easing with overshoot (cubic-bezier(0.2, 0.8, 0.2, 1.2))
- Motion only as a response to user action (hover, drag, theme switch) — never ambient
- Everything visible is user-configurable (accent, opacity, blur, background, radius per theme)

## Colors

Палитра — не фиксированные hex, а контракт токенов: каждая тема определяет свой набор для dark и light режима. Канонический пример — liquid glass.

### Primary
- **Imperial Violet** (#7c5cff): accent — пользовательски переназначаемый. Фокус-кольца, активная тема, свечение hover, точки статуса «up», буквы-фолбэки иконок. Единственный насыщенный цвет системы.

### Neutral
- **Smoke Glass** (rgba(255,255,255,.08) dark / rgba(255,255,255,.45) light): поверхность карточек — стекло, а не краска
- **Frost Line** (rgba(255,255,255,.18) / .6): границы — полутон стекла, всегда светлее поверхности
- **Moonlight Text** (#f5f7fb dark / #182234 light): основной текст
- **Dim Moonlight** (#9aa7bd dark / #5a6b85 light): вторичный текст, подписи

### Status
- **Up Green** (#22c55e) / **Down Red** (#ef4444): только точки статуса сервисов, никогда — декор

### Named Rules
**The Precious Accent Rule.** Акцент встречается только на: active-состояниях, drag-подсветке, фокусе, буквах-фолбэках. Если акцент виден больше чем на ~10% экрана — ошибка.

## Typography

**Body Font:** system-ui stack (system-ui, -apple-system, sans-serif)

**Character:** системный шрифт — осознанный выбор self-hosted-инструмента: ноль внешних загрузок, нативный для каждой платформы, «интерфейс как часть ОС».

### Hierarchy
- **Title** (600, 15px): названия сервисов на карточках — единственный выделенный текст
- **Body** (400, 15px): контент карточек, значения виджетов
- **Label** (500, 12px): подписи настроек, вторичный текст, время в статусах

## Layout

12-колоночная сетка, высота ряда 80px, гэп 12px (все три значения — пользовательские настройки). Карточки позиционируются абсолютно по процентам колонок. Контейнер — весь вьюпорт, без max-width: дашборд заполняет экран. Плотность задаёт пользователь через rowHeight/gap.

Responsive: ниже 768px сетка растворяется — карточки становятся статичными колонками в порядке y-then-x, drag/resize отключаются.

## Elevation & Depth

**Глубина от света за стеклом, не от черноты.** Тени деликатные (var(--shadow) — рассеянные 8–32px с низкой альфой), главную работу делает backdrop-filter: blur + saturate на стеклянных темах. Тень — вспомогательный сигнал, стекло — основной.

### Shadow Vocabulary
- **Rest** (`var(--shadow)`): слабая рассеянная тень в покое, принадлежит теме
- **Drag** (`0 12px 32px rgb(0 0 0 / 35%)` + accent-бордер): только во время перетаскивания
- **Hover lift** (`translateY(-3px)` + усиление тени): ответ на курсор

### Named Rules
**The Tide Rule.** Движение — только как ответ: hover, drag, смена темы (View Transition), появление карточек (stagger). Ничто не анимируется само по себе.

## Shapes

Радиус — фирменный признак материала: 8px (minimal) → 12px (web 2.0) → 16px (web 3.0) → 20px (liquid glass), задаётся токеном --radius-base и меняется темой. Пилюли (999px) — для статусов и тумблеров. Границы тонкие (1px) полупрозрачные — «шлифованный край» стекла. Модалки: радиус base+4px, чуть крупнее карточек.

## Components

### Cards / Containers
- **Corner Style:** var(--radius-base) (8–20px по теме)
- **Background:** var(--surface) — цвет ИЛИ градиент, с --opacity поверх
- **Shadow Strategy:** см. Elevation — деликатная в покое
- **Border:** 1px var(--surface-border)
- **Internal Padding:** 14–16px

### Link Card (signature)
- **Shape:** flex-строка: иконка 32×32 + заголовок 15px/600
- **Icon:** авто-каскад favicon → CDN-библиотека → буква на accent-градиенте
- **Hover:** подъём + усиление границы к accent

### Inputs / Fields
- **Style:** поверхность темнее карточки, radius 8–12px, тонкая граница
- **Focus:** border-color к accent

### Navigation (Edit Toolbar)
- Пилюльные кнопки, edit-режим: стеклянная панель поверх сетки; edit-toggle плавающий в углу, всегда доступен

## Do's and Don'ts

### Do:
- **Do** держать акцент редким: active, drag, focus, статусные точки
- **Do** задавать глубину светом и blur, а не толстыми тенями
- **Do** использовать spring-easing `cubic-bezier(0.2, 0.8, 0.2, 1.2)` для hover/drag
- **Do** уважать `prefers-reduced-motion` — отключать все переходы

### Don't:
- **Don't** вводить новые хардкодные цвета — всё через токены (`--surface`, `--accent`, …), иначе пользовательские темы сломаются
- **Don't** анимировать без причины: никакого idle-движения, лупов, «живых фонов»
- **Don't** использовать чёрные непрозрачные поверхности — стекло это alpha поверх градиента
- **Don't** фиксировать радиусы/цвета в компонентах — только var() токены, которые меняются темой