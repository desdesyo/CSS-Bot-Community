# SOLO Engine V2 — рабочие инструкции взаимодействия

## Обязательное правило ссылки на игру
- Каждый ответ пользователю после любой работы над FPS SOLO Engine V2 / CSS-Bot-Community заканчивать ссылкой на актуальную playable-версию игры.
- Основная ссылка: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/
- Ссылка должна быть последней строкой ответа, без текста после неё.
- Перед отправкой проверить актуальный статус GitHub Actions для последнего коммита рабочей ветки и workflow публикации GitHub Pages.
- Если публикация ещё выполняется или завершилась ошибкой, не утверждать, что изменения уже доступны по основной ссылке. Всё равно дать ссылку на последнюю опубликованную версию и явно отметить, что последние изменения пока не опубликованы.
- Не подменять ссылку на игру ссылкой на GitHub, коммит или Actions. Их можно добавить отдельно для отчёта.

## Правила выполнения работ
- Сначала проверить актуальную ветку, HEAD, код, логи и результаты последних проверок; не просить повторно уже известные сведения.
- Сначала выполнять работу, затем кратко сообщать результат. Не выдавать план за реализацию.
- Разделять статусы: изменено в коде, тесты пройдены, опубликовано, проверено непосредственно в игре. Не заявлять о тестировании на устройстве без фактического теста.
- При ошибках искать первопричину, а не маскировать симптом.
- Сохранять совместимость с мобильным браузером Redmi 12 и учитывать производительность.
- Работать поэтапно, не переходить к новым крупным функциям, пока критические проблемы текущего этапа не устранены.
- Ответы — короткие, конкретные, без лишних объяснений, если пользователь их не запросил.


## Автономный бот-разработчик / сбор телеметрии
- Один союзный бот получает роль `field-developer`; он остаётся обычным бойцом и не управляет игроком.
- При старте игры автоматически включается сбор диагностических кадров и событий: FPS/время кадра, положение и ввод игрока, состояние и цели ботов, попадания/урон/смерти, выстрелы, ошибки JavaScript, WebGL и столкновения.
- Каждый завершённый раунд добавляется в локальную очередь. После каждых пяти завершённых раундов клиент формирует JSON-отчёт и отправляет его в `logs/gameplay/field-developer/` рабочей ветки.
- Текущие логи и очередь раундов сохраняются в localStorage; при ошибке GitHub отчёт не удаляется и отправка повторяется при следующей возможности.
- Для прямой записи в GitHub браузеру нужен ранее сохранённый Fine-grained token с Contents: Read and write для `desdesyo/CSS-Bot-Community`. Если токен отсутствует или отозван, кнопка логов показывает необходимость настройки; нельзя утверждать, что автоматическая отправка работает без действительного токена.
- Сбор идёт с интервалом 1 секунда для игровых кадров и ограниченными буферами, чтобы не перегружать Redmi 12. Не включать скриншот каждого кадра или постоянные тяжёлые трассировки.
- Не называть этого бота автономным программистом, способным менять исходники: его роль — автономный полевой QA-наблюдатель, который собирает и передаёт фактическую диагностику для разработчика.


## Field developer: маршрутный атлас и обход карты
- FIELD DEVELOPER records its actual movement as route samples, persists visited 3 m map cells, and explores the nearest unvisited walkable cells using A* navigation.
- The walkable grid is derived from the current map collision geometry. Unreachable cells and stuck/path-blocked events are reported separately; never label inaccessible space as inspected.
- Route samples are saved into a capped route library. Allied and enemy bots can receive randomly selected learned route segments in later rounds, with faction-aware route direction; starting patrol routes are randomized as well.
- Near-obstacle positions during combat or blocked movement are recorded as candidate cover points, including obstacle name, distance and a line-of-sight occlusion observation. This is training data, not an automatic proof that every point is good cover.
- The atlas persists locally across reloads and is attached to each GitHub field-developer report: map coverage, visited/unreachable cells, route library, active route and cover samples. Keep bounded buffers (700 active route points, 30 routes, 350 cover samples).
- Diagnostic upload policy: upload after 5 completed rounds in the current continuous play session. If a play session ends before 5 rounds, retain its reports; accumulate across short sessions and force upload at 8 pending rounds. Successful upload clears the pending round/log batch, never the persistent route atlas. Failed/missing GitHub credentials retain a bounded local queue and must be surfaced to the player.
