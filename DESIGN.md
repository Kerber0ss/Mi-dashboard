---
name: Mi Dashboard
description: Self-hosted link dashboard as a night-operations monitoring board
colors:
  primary: "#38c8ff"
  led-up: "#2ee6a8"
  led-down: "#ff5c5c"
  led-warn: "#ffb454"
  ground-dark: "#0b0e11"
  ground-light: "#eef1f4"
  surface-dark: "#12151a"
  surface-light: "#ffffff"
  hairline: "#23282e"
  hairline-strong: "#3a414a"
  text-dark-mode: "#e8ecef"
  text-dim: "#8b949e"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "clamp(32px, 4.5vw, 56px)"
    fontWeight: 600
    letterSpacing: "-0.02em"
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.08em"
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  mono:
    fontFamily: "'SF Mono', ui-monospace, Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tabular-nums"
rounded:
  sm: "2px"
  md: "6px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "32px"
components:
  card-link:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
  telemetry-header:
    backgroundColor: "{colors.ground-dark}"
    textColor: "{colors.text-dark}"
    padding: "28px 32px 20px"
---

# Design System: Mi Dashboard

## Overview

**Creative North Star: «Экран дежурного инженера» (NOC-статусборд)**

Дашборд — стена мониторинга сетевого центра, не витрина. Главный контент — состояние сервисов крупной типографикой; всё остальное — телеметрия по краям. Глубина живёт в контрасте и плотности, не в тенях: матовый почти-чёрный грунт, плоские блоки, волосяные линии 1px. Движение — только ответ на действие; редактирование — «режим обслуживания», где плата не мигает сама.

**Key Characteristics:**
- Flat matte blocks on near-black ground; depth = contrast, never shadows
- LED status language is constant across themes (#2ee6a8 up / #ff5c5c down / #ffb454 warn)
- Every number is monospace tabular (clock, latency, forecasts)
- Label tier: 11px uppercase dim caps; content tier: large, bright
- Accent is a rare signal color (default #38c8ff): focus, drag, active only

## Colors

Тёмный приборный грунт; единственный насыщенный акцент — сигнальный.

### Primary
- **Signal Cyan** (#38c8ff, пользовательски переназначаемый): drag-эскалация, фокус, активная тема. Редкость = ценность.

### Status (constant)
- **LED Up** (#2ee6a8) / **LED Down** (#ff5c5c) / **LED Warn** (#ffb454): только индикация здоровья сервисов; warn также — состояние «проверяется» и drag-эскалация.

### Neutral
- **Board Black** (#0b0e11 / #eef1f4 light): грунт платы
- **Panel** (#12151a / #ffffff): поверхность блока
- **Hairline** (#23282e / #d6dce2): 1px разделители — вся глубина системы
- **Moonlight** (#e8ecef dark / #171a1e light): текст; **Dim** (#8b949e / #5d6670): метки, hosts

### Named Rules
**The Instrument Rule.** Любая цифра — monospace tabular. Пропорциональные цифры в телеметрии — ошибка.

## Typography

**Body Font:** system-ui stack · **Digits:** SF Mono / ui-monospace

**Character:** нативный системный гротеск для меток, моноширинный приборный шрифт для всех чисел — как на настоящем NOC-табло.

### Hierarchy
- **Display** (600, clamp 32–56px, tabular): телеметрийные часы в шапке — самый крупный элемент
- **Content** (600, 18px): имена сервисов
- **Label** (500, 11px, 0.08em tracking, uppercase): метки виджетов, кнопки
- **Data** (400, mono, tabular): hosts, мс, прогнозы, статусы

## Layout

12-колоночная сетка (rowHeight 96 по умолчанию, гэп 12 — настраиваемо). Полоса телеметрии во всю ширину сверху. Контент — без max-width. Мобильный (<768px): одна колонка, модалки — bottom sheet, тулбар — нижний скролл-стрип, safe-area отступы.

## Elevation & Depth

**Плоскость — доктрина.** Тени нет (box-shadow: none во всех темах). Глубина = контраст грунт/панель + 1px хайрлайны. Исключение: LED-свечение (8px halo) — это свет прибора, не тень.

## Shapes

Радиусы малые приборные: 2px (day/patrol) — 6px (night/alert). Пилюли исчезли. Углы — прямые, границы 1px, сетка читается как разметка платы.

## Components

### Status Block (link card — signature)
- **LED** 10px + halo: up/down/pending(warn); в edit-режиме — неактивный (обслуживание)
- **Name** 18px/600 + **host** mono 11.5px dim
- **Hover:** граница к hairline-strong; на тач — accent
- **Drag (signature «эскалация»):** warn-рамка + мигание LED + соседи приглушаются до 40%

### Telemetry Header
- mono clock clamp(32–56px) слева; дата, температура, имя темы справа; волосяная линия снизу

### Widgets
- Метка 11px caps сверху (всегда рендерится, даже в loading), контент крупный tabular

### Edit Toolbar
- Телеметрическая строка: плоская, на всю ширину, caps-кнопки, разделители 1px

## Do's and Don'ts

### Do:
- **Do** держать LED-цвета константными во всех темах
- **Do** использовать mono tabular для любых цифр
- **Do** уважать reduced-motion (все переходы отключаются)

### Don't:
- **Don't** возвращать тени/градиенты/стекло — мир плоский
- **Don't** использовать эмодзи как иконки интерфейса
- **Don't** прятать метки виджетов в loading-состоянии
- **Don't** давать акценту больше ~10% экрана