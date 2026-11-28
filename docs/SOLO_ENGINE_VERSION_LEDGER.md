# SOLO Engine V2 — правила учёта версий и обратной связи

Этот документ обязателен для всех последующих изменений проекта.

## 1. Классификация версии

Версия считается **РАБОЧЕЙ**, если игрок может запустить игру и пользоваться её основным игровым циклом, а пользователь обсуждает улучшения, новые функции, баланс, генерацию объектов, детализацию карты, графику или другие некритические изменения.

Версия считается **НЕРАБОЧЕЙ**, если присутствует хотя бы одна критическая проблема:
- игра не запускается или не загружается;
- отсутствует или серьёзно повреждено основное изображение игровой сцены;
- не работает стрельба или базовое управление;
- не работают ключевые кнопки/элементы интерфейса;
- HUD/мини-карта или другая основная механика полностью недоступны, когда это блокирует нормальную игру;
- серьёзный баг делает игровой процесс фактически невозможным.

Запрос «улучшить», «добавить», «починить генерацию объектов», «сделать красивее/детальнее» сам по себе **не означает**, что версия нерабочая. Не понижать статус только из-за списка желаемых улучшений.

Если подтверждена только часть основных функций, указывать это отдельно: например, «РАБОЧАЯ — изображение подтверждено игроком; стрельба/управление отдельно не проверялись». Не заявлять тестирование того, чего игрок не проверял.

## 2. Обязательная карточка каждой версии

Для каждого значимого состояния фиксировать:
- номер версии/идентификатор сборки и commit SHA;
- дату и ветку;
- статус: РАБОЧАЯ / НЕРАБОЧАЯ / НЕ ПРОВЕРЕНА;
- что изменилось;
- какие основные функции реально проверены и кем;
- известные критические ошибки;
- результат автоматических тестов и публикации (это разные статусы);
- ссылку на сборку/деплой и отчёт игрока, если есть.

Не перезаписывать историю. Каждое новое состояние добавлять отдельной записью в журнал.

## 3. Учёт слов игрока

Сохранять в журнале GitHub смысл и, где полезно, точную формулировку каждого значимого пользовательского замечания: что понравилось, что не понравилось, что сломано, что требуется сохранить, какие ограничения заданы. Привязывать запись к версии/commit и времени. Не превращать пожелание в подтверждённый дефект без проверки.

## 4. Правило изменений и регрессий

- Сначала определить последнюю подтверждённую РАБОЧУЮ версию.
- Не откатываться на более раннее состояние без явного основания и проверки того, какие полезные изменения будут потеряны.
- Перед изменением изучить текущие логи, отчёты игрока, diff и связанные коммиты.
- Сохранять понравившиеся игроку элементы и явно перечисленные ограничения.
- После правок запускать относящиеся к ним тесты; отдельно проверять успешность публикации.
- После публикации не объявлять визуальную/игровую проблему решённой до подтверждения игроком.
- При критической регрессии немедленно пометить сборку НЕРАБОЧЕЙ, локализовать регрессию и восстановить последнюю рабочую основу.

## 5. Текущая контрольная запись

### SOLO Engine V2 — состояние после восстановления изображения и HUD
- Ветка: `feature/solo-engine-v2`
- Последний commit на момент записи: `e626bbf1ff51f7834e2590840ec6d865a1d04950`
- Игрок подтвердил: «Отлично картинка есть».
- Изменения в этой серии: явно назначена активная FPS-камера; задан слой камеры; добавлен вызов отрисовки мини-карты при инициализации; изменён URL модуля для обхода старого кэша; добавлен регрессионный тест.
- Автоматические проверки исходников и прототипа: успешно.
- Сборка Pages: успешно; состояние деплоя проверять отдельно при каждом релизе.
- Статус версии: **РАБОЧАЯ (подтверждено игроком отображение основной игровой картинки)**.
- Не утверждать без отдельной проверки игроком, что стрельба, все кнопки, HUD и мини-карта полностью исправны. Если игрок подтвердит/опровергнет их работу, обновить журнал отдельной записью.

## 6. Формат дальнейших записей

Добавлять новую датированную запись с заголовком:
`## YYYY-MM-DD — <commit или версия> — <РАБОЧАЯ/НЕРАБОЧАЯ/НЕ ПРОВЕРЕНА>`

В каждой записи фиксировать пользовательское замечание, действие, результат тестов/публикации и подтверждение игрока. Этот файл — постоянный журнал; не удалять старые записи.


## 2026-11-28 — мобильная оптимизация рендеринга — НЕ ПРОВЕРЕНА ИГРОКОМ
- Основание: игрок сообщил о производительности **6–7 FPS** и запросил максимальную оптимизацию без потери качества картинки.
- Ветка: `feature/solo-engine-v2`.
- Изменения: частота обновления planar reflections на мобильных устройствах увеличена с каждого 4-го до каждого 12-го кадра; разрешение reflection texture оставлено 256×256, интенсивность и материалы не менялись. Отражения остаются включены.
- HUD-таймер и индикатор защиты обновляются 4 раза в секунду вместо каждого кадра; игровая симуляция и частота рендеринга не ограничиваются этим таймером.
- В диагностический отчёт добавлено отдельное время CPU-обновления кадра (`updateMs`) для различения нагрузки симуляции и рендеринга.
- Не менялись разрешение canvas, pixel ratio, текстуры, геометрия, PBR, дождь, свечение и детализация карты.
- Автотесты и публикация: ожидают результата CI; FPS на устройстве игрока: не измерен после изменений.
- Статус: **НЕ ПРОВЕРЕНА ИГРОКОМ** до замера FPS на его устройстве; не заявлять достигнутый прирост без нового отчёта.

### Результат CI для оптимизации (2026-11-28)
- Итоговый кодовый commit: `864968001ee73180f9f8ad996974239532998df1`.
- SOLO Engine V2 source checks: **успешно**, run [46109943836](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46109943836).
- SOLO Engine prototype checks: **успешно**, оба job (server и client) завершились успешно, run [46109943829](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46109943829).
- Предыдущие два запуска с SHA `53227ee` завершились ошибкой из-за чрезмерно экранированных новых тестовых regex; тесты переписаны на точные `includes`-проверки. Повторный CI на `8649680` прошёл полностью.
- Публикация Pages для этого SHA пока отдельно не подтверждена; FPS на устройстве игрока также ещё не измерен.
- Статус: **НЕ ПРОВЕРЕНА ИГРОКОМ**; автоматические тесты успешны, но прирост FPS и качество картинки требуют проверки на реальном устройстве.

### Публикация оптимизированной сборки — 2026-11-28
- GitHub Pages deployment: **успешно**, run [46109957607](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46109957607).
- Build job прошёл unit tests, подготовку Pages artifact и проверку GLB-моделей/анимаций; deploy job завершился успешно.
- Лог build подтверждает checkout именно кодового SHA `864968001ee73180f9f8ad996974239532998df1`, а не старой версии из `main`.
- Сборка опубликована по адресу: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/index.html
- Игрок ещё не проверил FPS после публикации; статус качества/производительности на устройстве остаётся **НЕ ПРОВЕРЕНА ИГРОКОМ**.

### Финальная публикация с cache-busting — 2026-11-28
- Для исключения старого JS-кэша на Android повышены версии URL модулей: `index.html → engine.js?v=20261128-perf1`, `engine.js → wet-ground-map.mjs?v=20261128-perf1`.
- Кодовый SHA с оптимизацией и cache-busting: `2dff3a517611b143e1c5a491564c7b00a17625cb`.
- Дополнительный regression-test SHA: `9c535138e738f4c0eb619fd08f64de59414d4b2a`; source checks [46110126976](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110126976) и prototype checks [46110126970](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110126970) — успешно.
- Pages deployment для кодового SHA `2dff3a5`: [run 46110137203](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110137203), build и deploy jobs — успешно; build log подтверждает checkout указанного SHA.
- URL игры тот же; cache-busting встроен в загрузчик. FPS на Android после обновления не измерен — ожидается проверка игрока.


## 2026-11-28 — GLB загрузка бойцов — НЕРАБОЧАЯ (критический дефект запуска)
- Замечание игрока: при запуске появляется ошибка «Не удалось загрузить обязательные 3D-модели бойцов», все шесть GLB завершаются `Asset timeout`.
- Статус немедленно изменён на **НЕРАБОЧАЯ**: игра не доходит до запуска игрового процесса.
- Проверка сборки предыдущего релиза: Pages artifact действительно содержал шесть GLB моделей и три Biped клипа; общий архив 9 711 000 байт. GLB прошли валидацию (6 skinned 80-bone soldiers + 3 compatible motion clips). Следовательно, в предыдущем build файлы были скачаны и упакованы, а не отсутствовали в сборке.
- Найден дефект загрузчика: шесть моделей импортировались одновременно, каждому импорту отводилось только 12 секунд; путь `./assets/` вычислялся относительно страницы, а не модуля загрузчика. Это согласуется с одновременным таймаутом всех шести моделей на мобильном устройстве.
- Исправление: путь ресурсов строится через `new URL('./assets/', import.meta.url)`; таймаут увеличен до 90 секунд; импорт моделей и клипов ограничен двумя параллельными GLB; диагностические сообщения содержат имя файла и полный URL; URL модуля загрузчика обновлён для сброса кэша.
- 3D-модели и анимации не заменяются и не отключаются. Статус останется НЕРАБОЧЕЙ до успешных тестов, публикации и подтверждения запуска игроком.

### Исправление таймаутов GLB опубликовано — 2026-11-28
- Исправленный кодовый SHA: `c1ab57ae703472030843b5044299223213f9694d`.
- Загрузчик: абсолютная папка assets относительно `human-bots.mjs`, таймаут 90 секунд, не более двух одновременных импортов GLB, расширенные диагностические ошибки; cache-busting `human-bots.mjs?v=20261128-assetsfix1`.
- Source checks: успешно, [run 46110551267](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110551267).
- Prototype checks: успешно, [run 46110551333](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110551333).
- Pages build/deploy: успешно, [run 46110564078](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110564078). Build log подтверждает checkout SHA `c1ab57a`, скачивание шести моделей и трёх клипов, успешную GLB-валидацию и включение всех шести моделей в артефакт Pages (9 711 776 байт).
- Игроку нужно повторно открыть игру с обновлённым модулем; реальный запуск на устройстве пока не подтверждён.
- Статус: **НЕРАБОЧАЯ до подтверждения игроком успешной загрузки сцены**. Не считать проблему окончательно закрытой только по CI/деплою.

### Финальная публикация с обновлённым HTML cache key — 2026-11-28
- Последний проверенный исходный SHA: `41d4d3ce193f787c8600493f957b684a872c8d29`.
- В `index.html` обновлён URL движка до `engine.js?v=20261128-assetsfix1`, чтобы мобильный браузер гарантированно загрузил свежий engine.js, который в свою очередь импортирует исправленный `human-bots.mjs?v=20261128-assetsfix1`.
- Regression test проверяет актуальный cache key; source checks [46110679104](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110679104) и prototype checks [46110679113](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110679113) — успешно.
- Pages build/deploy [46110691992](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46110691992) — успешно. Build checkout подтверждает SHA `41d4d3c`; шесть GLB и три клипа повторно скачаны, проверены и включены в Pages artifact (9 711 817 байт).
- Финальный адрес с принудительным обновлением HTML: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/index.html?v=20261128-assetsfix1
- Статус версии: **НЕРАБОЧАЯ до подтверждения игроком, что сцена запускается и модели отображаются на устройстве**. CI/деплой успешны, но реальная мобильная загрузка пока не подтверждена.


## 2026-11-28 — ошибка sourceGroup.clone — НЕРАБОЧАЯ
- Точное сообщение игрока: "Ошибка запуска: sourceGroup.clone is not a function"; игрок подтвердил, что версия не работает.
- Корневая причина установлена по коду: SceneLoader.LoadAssetContainerAsync возвращает Babylon AssetContainer, но код сохранял контейнер в assets.animations как будто это AnimationGroup, а затем вызывал у него clone(). Метод clone() есть у объектов AnimationGroup внутри свойства контейнера animationGroups, но не у самого контейнера.
- Предыдущая проверка валидировала наличие GLB-файлов, но не проверяла реальный тип результата импорта и контракт между AssetContainer и AnimationGroup. Это пробел тестирования.
- Обязательное правило на будущее: для каждого Babylon LoadAssetContainerAsync явно проверять тип возвращаемого контейнера и извлекать сущности из его свойств (animationGroups, meshes, skeletons и т. д.); не считать AssetContainer самим объектом сущности. Перед вызовом методов проверять их тип/наличие. Добавлять контрактные тесты на реальную форму результата API, а не только проверки строк/наличия файлов.
- Исправление: извлекать первый cloneable AnimationGroup из container.animationGroups; отсутствующий/невалидный клип безопасно пропускать с диагностикой; добавить защиту перед sourceGroup.clone(); добавить regression tests для AssetContainer, пустого контейнера и неверного значения.
- Cache-busting повышен до assetsfix2 в HTML и engine module.
- Статус остаётся НЕРАБОЧАЯ до успешных автопроверок, публикации и подтверждения игроком реального запуска на устройстве.

- Примечание по CI: первый запуск source checks после исправления завершился ошибкой на этапе unit tests. Выявлена устаревшая проверка cache key, которая всё ещё ожидала assetsfix1 после намеренного перехода на assetsfix2. Проверка обновлена; до повторного успешного CI и публикации версия остаётся НЕРАБОЧЕЙ.

- Повторный результат после обновления устаревших cache assertions: commit e49eee82f9cdb71141eb77248d9f218f7a8c26e2. Source checks [46111757990](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46111757990) — успешно; prototype checks [46111758035](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46111758035) — успешно. Publish build [46111773904](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46111773904): unit tests и подготовка Pages artifact — успешно; deploy job завершился успешно. Эти результаты подтверждают прохождение автоматических проверок и публикацию, но не подтверждают запуск на телефоне игрока.


## 2026-11-28 — отчёт игрока issue-mwzz9oxc: боты проваливаются в пол и неудобное управление
- Отчёт: [issue-mwzz9oxc](https://github.com/desdesyo/CSS-Bot-Community/blob/feature/solo-engine-v2/logs/issues/2026-11-28T05-36-39-785Z-issue-mwzz9oxc.json), скриншот: [PNG](https://github.com/desdesyo/CSS-Bot-Community/blob/feature/solo-engine-v2/logs/issues/2026-11-28T05-36-39-785Z-issue-mwzz9oxc.png). Описание: «боты ходят внутри пола». В диагностике 11 живых ботов имели root Y=0; на устройстве отчёта было около 7 FPS.
- Причина дёрганья FIRE найдена в коде: pointerdown задавал начало дельты в центре кнопки, а не в точке касания. Первый pointermove принимал смещение пальца от центра за движение камеры. Исправлено: начало отслеживания берётся из координат pointerdown; микродвижения до 1.5 px фильтруются.
- Мобильное управление сдвинуто к естественной зоне пальцев: левый стик немного внутрь, правый FIRE заметно левее.
- Для каждой GLB-модели вычисляется нижняя граница фактических мешей; индивидуальный vertical offset ставит ноги на уровень пола. Исходные GLB, текстуры и анимации сохраняются. Измерение выполняется один раз при создании бойца.
- Добавлены regression tests на вычисление offset, привязку root, координаты FIRE pointerdown и CSS-положение стиков.
- Статус не повышать до прохождения CI, публикации и проверки игроком. Диагностические 7 FPS зафиксированы отдельно; графическое качество не снижать.

- Результаты публикации исправления commit `622f0f2add3cad0be54d20737c307a00e25ffb85`: source checks [46113488134](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46113488134) — success; prototype checks [46113488106](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46113488106) — success; Pages build/deploy [46113508727](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46113508727) — оба job success. Build log явно подтверждает checkout точного SHA `622f0f2`. Опубликованная ссылка с cache-busting: `?v=20261128-touchfix1`.
- Отчёт игрока подтверждает, что сцена была запущена (`game.started=true)); по правилу журнала статус базовой игры **РАБОЧАЯ с известными дефектами**. Исправления из commit `622f0f2` ещё требуют повторной проверки пальцами на Android; не заявлять, что визуальное положение ног и удобство стиков уже подтверждены игроком.


## 2026-11-28 — увеличение зоны и чувствительности свайпа камеры — НЕ ПРОВЕРЕНА ИГРОКОМ
- Дополнение к отчёту игрока: для разворота требуется около восьми свайпов; активная область сенсора ощущается слишком маленькой, поворот получается коротким и резким, присутствуют промахи по сенсору и задержка реакции.
- Причина по исходникам: зона обзора занимала 52% ширины экрана и была ограничена сверху 116 px и снизу 132 px; чувствительность составляла 0.004 rad/px для обычной зоны и 0.0042 rad/px для FIRE-жеста. При коротких свайпах это давало слишком малый угол за один жест.
- Исправление: зона обзора расширена до 70% ширины, начинается на 84 px от верха и заканчивается за 102 px до низа; чувствительность обоих способов поворота увеличена до 0.0095 rad/px (примерно в 2.3–2.4 раза). Порог фильтра микродвижений FIRE снижен с 1.5 до 0.75 px. Сохранены отдельная кнопка стрельбы, pointer capture и настройка пользовательской чувствительности.
- Графика, разрешение рендера, материалы, текстуры и модели не менялись. Версия JS/HTML cache-busting повышена до `20261128-touchfix2`.
- Добавлены regression tests на повышенную чувствительность и геометрию зоны обзора; результат CI и Pages deployment фиксировать ниже после завершения.
- Статус: **НЕ ПРОВЕРЕНА ИГРОКОМ**. Нужно проверить на Android длину разворота, плавность и отсутствие ложных касаний; FPS отдельно не считается исправленным.


### CI для настройки свайпа (2026-11-28)
- Исправленный тестовый commit: `875b91d5dd33793376b558664b0bacef467eda8a`.
- SOLO Engine V2 source checks [run 46113982317](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46113982317) — **успешно**.
- SOLO Engine prototype checks [run 46113982335](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46113982335) — **успешно**, server и client jobs завершены.
- Первые прогоны выявили устаревший тест, ожидавший deadzone 1.5 px; тест приведён к новой настройке 0.75 px, после чего оба workflow прошли.
- GitHub Pages deployment для этого SHA пока не обнаружен. До публикации изменение недоступно в живой версии игры; не выдавать старую сборку за новую.


## 2026-11-28 — изоляция отчётов от старого игрового отрезка
- Найдена причина: `restoreGameplayLog()` восстанавливал незавершённую запись из IndexedDB после перезагрузки страницы, а `submitIssueReport()` без проверки прикладывал последние записи/события к новому баг-репорту. Из-за этого в отчётах повторялся старый игровой отрезок, даже когда текущая запись не шла.
- Добавлен `gameplay-log-session.mjs`: баг-репорт прикладывает телеметрию только если запись активна, имеет session ID и создана в текущем экземпляре страницы. В остальных случаях `recentGameplayLog` явно содержит `attached:false` и пустые массивы — восстановленные данные больше не выдаются за свежие.
- Новая запись получает уникальный session ID, page ID и абсолютное время начала; метаданные сохраняются в IndexedDB. Ручное восстановление/экспорт старого сеанса остаётся отдельным от нового баг-репорта.
- Добавлены тесты на блокировку старого сеанса после reload и на корректное вложение текущей записи с ограничением размера.
- Обновлён cache key до `20261128-reportfix1`.
- Commit цепочки: `6b15aef` (helper), `a8d596a` (engine), `0954554` (tests), `283a1a8` (cache bust). Статус до CI/deploy: **НЕ ПРОВЕРЕНА**.

### CI для исправления старого игрового отрезка
- Финальный кодовый commit: `97d11a9ea24aa804c7142a2f50978537222125b2`.
- SOLO Engine V2 source checks [run 46115710338](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46115710338) — **success**.
- SOLO Engine prototype checks [run 46115710359](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46115710359) — **success**.
- Первые проверки cache-busting выявили только устаревшие ожидания тестов по версии `touchfix2`; исправлены тесты так, чтобы проверять новый HTML cache key и сохранять отдельный ключ модели бойца. Финальные проверки на SHA `97d11a9` прошли.
- GitHub Pages deployment для feature-ветки не выполнялся и пока не подтверждён. Не просить игрока проверять исправление по старой опубликованной ссылке до фактической публикации.

- Publish SOLO Engine V2 [run 46115742091](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46115742091) — **build и deploy success**. Build log подтверждает checkout точного feature SHA `97d11a9ea24aa804c7142a2f50978537222125b2`; unit tests `# fail 0`; проверка GLB assets также успешна.
- Опубликована версия с cache-busting: `https://desdesyo.github.io/CSS-Bot-Community/engine/v2/index.html?v=20261128-reportfix1`. Исправление опубликовано; проверка поведения на телефоне игрока ещё не получена.


## 2026-11-28 — аудит и улучшение данных QA-кнопок (reportfix2)
- Разделены два потока: кнопка `Отметить баг` → `logs/issues/*.json` + соседний PNG; кнопка `Логи` после ручной записи/отправки → `logs/gameplay/*-game-diagnostics.json`.
- Issue report: добавлены build ID, номер раунда/сторона, краткая карта/field-atlas coverage, AI state/target/nav goal/path failures для каждого бота, текущие сенсорные оси/клавиши/gamepad axes+buttons, runtime/device capability snapshot, текстурные размеры/готовность, render-target/hardware-scaling details.
- Issue report теперь всегда содержит ограниченные свежие кольцевые буферы текущей страницы: до 100 событий, 20 JS/unhandled/WebGL ошибок и до 90 секунд performance samples (1/сек). Это работает и без предварительного включения ручной записи. Средние/максимумы frame/render time считаются только для samples активной игры.
- Управление: добавлены `movement-stick` и `look-swipe` с delta/axes/yaw/pitch/sensitivity не чаще 1 раза в 120 мс; добавлены gamepad connect/disconnect события. Глобальный input trace теперь устанавливается при загрузке меню, а не только после старта записи.
- Убраны шумные/нецелевые данные: произвольные первые 80 коллайдеров заменены максимум 24 ближайшими к игроку в радиусе 18 м; видимые меши ограничены 40 ближайшими вместо 80. Полная геометрия карты и все кадры не отправляются.
- Подробная ручная запись сохранена: до 1200 временных срезов и 1200 событий, до 240 frame/render samples, счётчики hitch и field atlas с маршрутами/укрытиями для AI.
- Добавлена документация `docs/QA_REPORT_SCHEMA.md`; обновлены `docs/WORKING_INSTRUCTIONS.md`.
- Финальный кодовый коммит `7a943af7b2600620d33ef275814aef684b3c8754`. Source checks [46116347147](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46116347147) и prototype checks [46116347150](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46116347150) — success. Publish [46116363140](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46116363140) — build/deploy success; checkout SHA подтверждён, unit tests `# fail 0`.
- Новая опубликованная версия: `https://desdesyo.github.io/CSS-Bot-Community/engine/v2/index.html?v=20261128-reportfix2`. Проверка на устройстве игрока ещё ожидается.


## 2026-11-28 — исправление слайд-шоу при визуальном обзоре карты (mapoverview7)
- Игрок сообщил: после запуска 30 кадров/снимков управление исчезло, игра переключилась на последовательность случайных видов сверху; кнопка отчёта не давала понятного подтверждения результата.
- Корневая причина подтверждена исходниками: `captureMapOverviewScreenshot()` и `captureBotAreaContactSheet()` временно присваивали обзорную/локальную камеру в `scene.activeCamera` на время асинхронного рендеринга. Основной `engine.runRenderLoop()` продолжал работать параллельно и отображал эти временные камеры на игровом экране — отсюда слайд-шоу из 30 ракурсов. Это не режим наблюдения за ботами.
- Исправление: render-target screenshot получает отдельную камеру напрямую; код больше не меняет `scene.activeCamera` и `scene.activeCameras` во время захвата. Игровая камера остаётся активной, временные камеры освобождаются в `finally`. Cache key повышен до `20261128-mapoverview7`.
- Коммиты: engine `34e8de01ec7ce98b870b29b365611cfd69bdec33`; HTML cache-bust `4c3484576d5ff4eb25a67f66540ef8b3f384de60`.
- Статус: **исправлено в feature-ветке, автоматические проверки и Pages deployment ещё не подтверждены; на устройстве игрока не проверено**. Не выдавать новую ссылку как опубликованную до проверки workflow.

- Дополнение к mapoverview7: preflight-вход визуального отчёта теперь сразу меняет подпись кнопки и объясняет отмену/отсутствующий токен; повторное нажатие во время активной отправки сообщает, что нужно дождаться завершения. Cache key повышен до `20261128-mapoverview8`. Коммиты engine `71a3f251afb58dde3ddf43b14548836d96fdea39`, HTML `ace9eeb8b54346b4bded970c2d4bcc9d762470a9`. Это улучшает обратную связь, но не заменяет проверку реального GitHub upload.

## 2026-11-28 — mapoverview10 — РАБОЧАЯ (камера подтверждена игроком; карта обновлена)
- Игрок подтвердил: «Основные баги которые я описывал с камерой ушли, все четко». Критическая регрессия камеры считается устранённой в проверенной игроком сборке.
- Замечание игрока: кнопка «Обзор карты» не меняла состояние и не показывала уведомления; было непонятно, дошли ли снимки.
- Анализ входящих файлов: в ветке найдены `logs/issues/2026-11-28T06-47-57-704Z-map-overview-mx01tds8.{json,png}` (старый `mapoverview1`, снимок содержит сферу неба вместо карты) и `logs/issues/2026-11-28T07-26-10-606Z-issue-mx036izy.{json,png}` плюс `...-topdown.png` (сборка `reportfix3`, реальный верхний вид карты и отмеченная игроком «кривая текстура»). После публикации `mapoverview8` в 07:52 UTC нового map-overview отчёта в `logs/issues/` не обнаружено: последняя отправка кнопки обзора не подтверждена GitHub, поэтому не приписывать её снимки полученным.
- Сверка с главным визуальным референсом «Мокрый Пол»: сохраняется направление узкой старой городской улицы, низкой сине-серой застройки, мокрой брусчатки, холодного blue-hour света и тёплых фонарей.
- Исправление карты: `floor()` теперь задаёт world-scale UV tiling для `stone` поверхностей (3.2 м на повтор) и сохраняет cobblestone scale 2.4 м; это устраняет растягивание каменной текстуры на длинных тротуарах, мостах и площадках. Разрешение текстур и качество рендера не снижались; новые меши не добавлялись.
- Улучшение отчёта: кнопка обзора показывает отдельный `aria-live` статус, этапы съёмки и загрузки, прогресс 30/30 локальных снимков и итоговый commit; статус расположен вне области мобильного джойстика. Аудит исключает `body-*`/`head-*` подмеши бойцов, чтобы не считать их бесматериальными объектами карты.
- Итоговый кодовый SHA: `9fe044a1524307bd7a3464ba68de3a6459f0167c`.
- Source checks: **успешно**, [run 46124325242](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46124325242).
- Prototype checks: **успешно**, [run 46124325253](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46124325253).
- GitHub Pages deployment: **успешно**, [run 46124339203](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46124339203); build job повторно выполнил engine tests (`# fail 0`) и checkout точного SHA `9fe044a1524307bd7a3464ba68de3a6459f0167c`.
- Новая версия опубликована по адресу: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/?v=20261128-mapoverview10
- Остаётся проверить на устройстве игрока: реальное качество мостовой после UV исправления и видимый статус кнопки. Новый map-overview отчёт после этой публикации ещё не получен.


## 2026-11-28 — восстановление канонической публикации mapoverview10
- Восстановленный прямой feature-branch publisher был диагностирован: source checks и regression tests прошли, но копирование опциональной папки `engine/cloud` ломало packaging, поскольку каталога нет. После условного копирования package job стал успешным.
- Прямой feature-branch publisher затем упёрся в GitHub Actions runner provisioning (`runner_id=0`, `BlobNotFound` до первого шага deploy). Этот дублирующий workflow удалён, чтобы не создавать конкурирующие/ложно падающие Pages deployments.
- Канонический путь публикации — `.github/workflows/publish-solo-engine-v2.yml` на `main`, который запускается после успешного `SOLO Engine V2 source checks` для feature-ветки и checkout-ит точный tested SHA.
- Для кода `6bba2fced107fe2af263499c37a9f48a94030195`: SOLO Engine V2 source checks и prototype checks — **success**; canonical Pages publisher [run 46124608961](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46124608961) — build/deploy **success**. Build log подтверждает checkout точного SHA `6bba2fced107fe2af263499c37a9f48a94030195`, unit tests `89 pass / 0 fail`, загрузку шести rigged soldier models и трёх Biped animation clips.
- Опубликованная версия: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/?v=20261128-mapoverview10
- Последующий commit `2439c94f3f30191920cb5717ef23d59f5c9a5332` удаляет только дублирующий publisher workflow; игровые исходники совпадают с опубликованным SHA.
- Карта: mapoverview10 содержит исправление world-scale UV tiling каменной поверхности, не меняющее геометрию, разрешение текстур или качество рендера. Это адресует сообщение «кривая текстура», но визуальное исправление ещё требует проверки игроком.
- Ветка `logs/issues/` не содержит map-overview отчёта, отправленного после публикации mapoverview10. Самый свежий подтверждённый обзор остаётся старым mapoverview1 (его верхний снимок был сферой неба); отдельный issue report `2026-11-28T07-26-10-606Z-issue-mx036izy` содержит top-down PNG и описание «кривая текстура». Не утверждать, что новый контактный лист из 30 зон уже получен.
- Статус: **РАБОЧАЯ — игрок ранее подтвердил исправление камеры; CI и Pages публикация mapoverview10 подтверждены; карта обновлена, визуальное качество после UV fix и новый 30-зонный обзор ещё не подтверждены игроком.**


## 2026-11-28 — map-authoring round-loop fix and mobile menu polish

- Player-uploaded screenshot: [Screenshot_2026-11-28-17-24-15-325_com.yandex.browser.jpg](https://github.com/desdesyo/CSS-Bot-Community/blob/8c68319633439d9612d933a7a26336ea2de390a0/logs/Screenshot_2026-11-28-17-24-15-325_com.yandex.browser.jpg). The engine menu is visible; the uploaded image shows the warm brown primary button and a vertically cramped menu card on a mobile landscape viewport, not a runtime crash.
- Root cause of repeated CT wins in map-authoring mode: `state.bots.every(...)` returns true for an empty roster. The same mode also allowed the round timer and player/team elimination rules to keep running despite having no active bot roster.
- Fix: freeze round countdown and skip AI, enemy-elimination and team-elimination round rules while `MAP_EDIT_MODE` is enabled. Enemy elimination now additionally requires at least one enemy bot.
- UI: modern cool-toned glass buttons; teal primary launch action; mobile menu card can use up to 82dvh and is vertically centered.
- Added regression tests for empty-roster round handling and mobile menu styling/layout.
- Implementation commits: engine `348b81c8f8aee521c40b27e4a31896f8fe89c59e`; regression tests `91b735e1b300117425c48664197540223e2fcab1`; menu `c5547bc9a089c52d2372a747c102e13599fcf6cb`.
- Verification and Pages deployment: pending. Device behavior must still be confirmed by the player.


## 2026-11-28 — worldfix1 — ИЗМЕНЕНИЯ ВНЕСЕНЫ, ПРОВЕРКИ ОЖИДАЮТСЯ

- Новое сообщение игрока: машины, двери и окна пропускают игрока; окна с обратной стороны здания теряют визуальную форму; карта всё ещё выглядит сырой, хотя её общие очертания игроку уже нравятся. Не разрушать удачную композицию.
- Исправления геометрии/коллизий в `engine/v2/wet-ground-map.mjs`:
  - добавлены невидимые физические collision hull для обеих припаркованных фургонов и автомобилей спавн-кварталов; hull входят в существующий сборщик `soloCollisionBoxes`;
  - створки входных и airlock-дверей теперь участвуют в коллизиях;
  - оконные стёкла получают коллизию, чтобы игрок не проходил через закрытые окна;
  - добавлены оконные рамы/стекло на обратных фасадах зданий, где ранее была глухая стена.
- Исправление отчёта в `engine/v2/engine.js`:
  - кнопка «Баг» больше не запускает дополнительный top-down render-target 1280×960 сразу после обычного скриншота;
  - верхний вид и 30-зонный контактный лист остаются отдельной задачей кнопки «Обзор карты»;
  - размер обычного скриншота ограничен 960×720, сохраняя пропорции экрана, чтобы уменьшить пиковую нагрузку мобильного GPU.
- Игровые функции управления, камера, стрельба, боеприпасы, перезарядка и симуляция не изменялись. Механики ботов и их файлы не удалялись.
- Cache bust: `wet-ground-map.mjs?v=20261128-worldfix1`, `engine.js?v=20261128-worldfix1`.
- Коммиты: map `12f6e21f3a33c5e0da92e9d3c6601ce947e628ae`; engine `d1e7e5a60d8c84c07ff95a5f6aa63cb17afe41a4`; HTML `03aaf91d5619c061e824c574782d7f5af2386623`.
- Автоматические проверки, публикация Pages и проверка на Redmi 12 ещё не подтверждены. Не считать проблему зависания решённой до проверки игроком; не выдавать новую ссылку как опубликованную до успешного deploy.


### worldfix1 release payload and regression gates
- Final material/cache revision: `worldfix2`; map module and engine HTML cache keys are both updated.
- Additional material fix: glazing, glass highlights, curtains and timber doors disable back-face culling so reverse-side surfaces remain visible.
- Regression tests added to `engine/v2/engine.test.mjs`: vehicle collision hulls, solid door/window collision, rear-facade glazing, two-sided material visibility, and bug-report capture isolation.
- Clean release branch based on `main`: `feature/solo-engine-v2-worldfix1`; it contains only the V2 application files and version ledger, avoiding the unrelated 834-commit history of the long-lived development branch.
- Release branch commits: map `3a48e24fe0b696e2f1993b6a90d3ca892a3ca9a9` plus follow-up cache/material updates copied into the release payload; engine `2c3efe29010d69582f604ca8a9029c357a8bd25b`; index `7864b37bae5907ebdc019d046bb48bc437e056c6`; regression tests `8006f268454aaaf577f6297f93ece33d65b3d9ea`.
- Note: the exact final files were copied from the development branch after its latest worldfix2 commits. CI and Pages deployment must be confirmed on the clean release branch before asking the player to test.

## 2026-11-28 — mobile HUD refresh + current map bug-fix baseline published

- Player-requested mobile HUD implemented in `engine/v2/index.html`:
  - translucent gray-blue touch controls with vivid thin orange glow;
  - original joystick dimensions and touch zones preserved;
  - graffiti-eye toggle hides Logs, Bug, and map-overview diagnostics while keeping fullscreen and pause;
  - compact single-row stats, top-left game title removed, minimap raised, health and armor bars placed below it.
- Armor remains an empty `—` indicator because the current game runtime has no armor gameplay variable; no fake armor value is shown.
- Preserved current main map fixes: wet asphalt road surfaces, cobblestone pedestrian sidewalks with world-scale UVs, vehicle collision hulls, solid doors/windows, and rear-facade glazing.
- Regression tests added for HUD styling, touch-zone dimensions, diagnostics toggle and cache invalidation.
- Source checks + engine and map-report tests: [run 46161793330](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46161793330) passed on feature SHA `100a16ff1efdb96fa9467ca39b08a38dd7be4b21`.
- Merged PR [#153](https://github.com/desdesyo/CSS-Bot-Community/pull/153) to main as `21d38ce317acf0e59fd64f8002f0d877ad2c6bf5`.
- Main source checks: [run 46161865531](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46161865531) passed.
- Pages publish: [run 46161865525](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/46161865525) — build and deploy both succeeded from merged main SHA `21d38ce317acf0e59fd64f8002f0d877ad2c6bf5`.
- Published test build: https://desdesyo.github.io/CSS-Bot-Community/engine/v2/index.html?v=20261128-hud1
- Player-device validation (layout, controls, actual FPS, map texture appearance) remains pending. No real-world device test is claimed.