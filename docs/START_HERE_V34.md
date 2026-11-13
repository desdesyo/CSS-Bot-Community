# CSS Bot Community — начать здесь (CS:S v34)

Текущая рабочая ветка — `sdk-foundation`. Целевая платформа — Windows / Win32
(x86). Для сборки используются GitHub Actions и Visual Studio 2022 на runner;
локальные Python и SourceMod не нужны.

## Что собирает CI

- `build-vsp` — нативный VSP `CSSBC_VSP.dll`.
- `build-v34-gamedll` — интегрированную CS:S v34 GameDLL `server.dll`.
- `build-installer` — единый `CSSBC_Setup.exe`, который забирает оба бинарных
  артефакта, проверяет комплектность файлов и упаковывает их через Inno Setup 6.

## Получить установщик

1. Открой https://github.com/desdesyo/CSS-Bot-Community/actions
2. Выбери последний запуск **Build CSSBC native modules (Win32)** для ветки
   `sdk-foundation`.
3. Дождись зелёного статуса у заданий `build-vsp`, `build-v34-gamedll` и
   `build-installer`.
4. Внизу страницы запуска скачай **CSSBC-Setup-Win32**. Если публикация
   prerelease прошла успешно, установщик также приложен к релизу этого запуска.

## Установка

1. Полностью закрой CS:S.
2. Запусти `CSSBC_Setup.exe` от имени администратора.
3. Укажи корневую папку игры — внутри неё должен находиться
   `cstrike\gameinfo.txt`. Путь `C:\Games\Counter-Strike Source v34`
   подставляется автоматически, если он существует и содержит этот файл.
4. Заверши установку.

Установщик размещает GameDLL в `cstrike\bin\server.dll`, VSP в
`cstrike\addons\cssbc\bin\CSSBC_VSP.dll`, а `plugin.vdf` — непосредственно
в `cstrike\addons\cssbc.vdf`, где Source Engine ищет VSP-манифесты.

Перед заменой существующего `server.dll` создаётся резервная копия
`server.dll.cssbc-backup`. Первый оригинал не перезаписывается при повторной
установке.

## Первый запуск и откат

Сначала проверь обычный запуск игры и локальный матч со стандартными ботами.
Успешная компиляция установщика ещё не означает, что запуск на каждой сборке
v34 уже проверен.

Если игра не запускается, закрой её и восстанови оригинальный файл:
переименуй текущий `cstrike\bin\server.dll` в `server.dll.cssbc-test`,
а `server.dll.cssbc-backup` — в `server.dll`. Затем запусти ярлык
**CSSBC — Collect diagnostics** из меню Пуск и передай полученный архив логов.
