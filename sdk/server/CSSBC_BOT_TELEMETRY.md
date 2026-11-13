# CSSBC Bot Telemetry — design and integration

Цель: собирать **структурированные игровые события** для анализа поведения 6 CT vs 6 T. Обычный console log — дополнительный источник, не замена telemetry.

## Формат: JSON Lines (JSONL)

Одна строка = одно событие. UTF-8, файл `telemetry.jsonl`, запись append-only. Каждое событие содержит:

- `schema`: версия схемы (например, `1`)
- `session_id`: идентификатор матча
- `seq`: возрастающий номер события в пределах матча
- `time`: игровое время (секунды), если доступно
- `wall_time`: UTC timestamp
- `event`: имя события
- `actor`, `target`: сущности/боты (если применимо)
- `data`: поля события

Пример:
```json
{"schema":1,"session_id":"match-001","seq":17,"time":42.18,"wall_time":"2026-01-01T12:00:00Z","event":"player_death","actor":{"userid":4,"team":"CT","bot":true},"target":{"userid":9,"team":"T","bot":true},"data":{"weapon":"ak47"}}
```

## Минимальный набор событий (MVP)

### Матч/раунд
- `match_start`, `match_end`
- `round_start`, `round_end` (winner, reason, duration)
- `team_snapshot` (число игроков/ботов CT/T)

### Игроки
- `player_join`, `player_leave`, `player_team`
- `player_spawn`, `player_death`
- `player_damage`, `player_kill`

### Поведение
- `bot_decision` — только из реально доступных точек AI: цель, выбранное действие, причина/utility score (если известны)
- `bot_stuck` — длительность неподвижности, позиция, текущая цель
- `bot_nav` — nav area/route result/ошибка, если движок предоставляет
- `bot_enemy_sensed` — обнаружение противника, источник и дистанция, если доступно

### Бой
- `weapon_fire`, `bullet_impact`, `player_hurt`
- `melee_attack`, `melee_hit`, `melee_miss` (для CSSBC)

## Где подключать в Source SDK

События следует отправлять из серверной Game DLL, а не клиентского HUD:
- игровые события CS:S (round/player/death/hurt/fire) — через серверный game event listener;
- AI decision/nav/stuck — в точках исходного кода Bot AI, где решения реально принимаются;
- CSSBC melee — из runtime/controller после выбора атаки и подтверждения trace/damage.

**Важно:** listener игровых событий не раскрывает автоматически внутренние решения AI. Для навигации/тактики понадобится instrumenting исходников Bot AI. Нельзя писать фиктивные `bot_decision` или `bot_nav` по косвенным догадкам.

## Безопасность и производительность

- Запись асинхронная или через буфер; не блокировать игровой tick на диске.
- Ограничение размера/ротация по матчам.
- При ошибке файла — один warning и отключение telemetry, матч продолжается.
- Не записывать IP, Steam auth tickets, пароли, токены и персональные данные.
- Не собирать каждый tick целиком: события + редкий snapshot (например, 1 Hz) по необходимости.

## Что нужно для реального подключения

1. Source SDK 2013 Multiplayer / CS:S Game DLL исходники и точная версия.
2. Подключить `CSSBC_Telemetry` к серверному проекту Game DLL.
3. Реализовать event listener и безопасный JSONL writer.
4. Добавить AI hooks в decision/nav/stuck участки Bot AI.
5. Сверить схему на тестовом матче и проверить отсутствие заметного влияния на FPS/tick.

До подключения SDK это **спецификация**, не установленный в игре модуль.
