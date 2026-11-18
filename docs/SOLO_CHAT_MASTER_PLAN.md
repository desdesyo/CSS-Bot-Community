# SOLO.Chat — единая карта проекта

Дата сверки: 2026-11-18. Это рабочая карта SOLO.Chat, собранная из прежних диалогов, GitHub-задач, исходников и запусков CI. Она не является заявлением, что все функции уже завершены.

## Границы проекта

- Приложение и Worker: `desdesyo/CSS-Bot-Community@github-chat-prototype`.
- Оркестрация, очереди, мониторы и supervisor: `desdesyo/CSS-Bot-Community@main`.
- `desdesyo/modhaul@main` — отдельный проект CSS Overhaul; не переключать на него задачи SOLO.Chat без явного `Agent-Target`.
- CSS v34 SDK/GameDLL и Local CSS Bridge — отдельные рабочие области. Не смешивать их с кодом чата.
- Канонический адрес приложения: https://cssbc-github-chat.descapan.workers.dev/

## Требуемый пользовательский результат

1. Обычный быстрый диалог без внутренних сообщений инструментов/агентов в видимой истории.
2. Реальное выполнение инструментов Pi, а не текстовая имитация. Если инструменты недоступны — точная ошибка, никакого ложного отчёта о выполнении.
3. Безопасные GitHub read/write действия по запросу: правильный репозиторий и ветка, optimistic SHA, краткоживущий токен задачи, проверяемый commit URL.
4. Сохранение диалогов, список истории, общий семантический поиск между диалогами и корректное восстановление после перезагрузки.
5. Агентная команда с реальной последовательностью: Planner → Implementer → Independent Tester → максимум один repair/re-test → независимый Supervisor. Ни один зелёный workflow сам по себе не доказывает работу агентов.
6. Автоматическое обнаружение новой версии открытой вкладкой без потери черновика, выбранного диалога и позиции прокрутки.
7. Генерация изображений через бесплатный Cloudflare FLUX.1 Schnell; платные модели не использовать.
8. Автономный цикл улучшения: feedback/ошибки → одна дедуплицированная задача → исправление → регрессионный тест → независимая проверка → кандидат навыка. Создание задач или накопление промптов само по себе не считается обучением.
9. UI: сохранять текущую удачную основу; от Telegram заимствуется только стиль фона чата, а не весь интерфейс. Сохранить пальму в левой части. Сохранять адаптивную компоновку, контрастный скроллбар и органичный аватар любознательного мультяшного персонажа в халате.

## Подтверждённые реализованные основы

- Worker/ Durable Object runtime, Pi harness, регистрация GitHub/MCP-инструментов, несколько провайдеров.
- Чат, сохранение диалогов и sidebar-история; видимый transcript должен содержать только user/assistant.
- Автоматическое восстановление прерванных Durable Object jobs.
- Диагностика возможностей, UI inspection с исключением текста сообщений, отдельный ограниченный UI writer.
- GitHub workspace read/write tools, request-scoped Actions token, отдельный диагностический инструмент для проверки Contents write через временную ветку с попыткой обязательной очистки. Сам факт успешной live-записи ещё должен быть подтверждён.
- Оптимистическая проверка SHA и allowlist репозитория/ветки для UI writer.
- Feedback inbox, генератор задач, health/model monitors, orchestrator, независимый supervisor.
- Пятиминутный кэш статуса агентов, cooldown при отказах GitHub API, уважение Retry-After/X-RateLimit-Reset, отсутствие анонимного повтора после 403.
- В оркестраторе исправлен jq-фильтр, вызывавший падение.
- Browser version polling и сохранение выбранного диалога/позиции прокрутки уже имеют регрессионные проверки; сохранение непустого черновика требует live-проверки.

## Последняя проверка 2026-11-18

- Model Monitor run `44203939682`: прямой ответ модели и Pi harness check на общем `shared-agent` прошли. Это не доказывает исправность отдельных role Durable Objects.
- Health Monitor run `44209427481`: authenticated `/api/health` прошёл.
- Orchestrator run `44208041609`: Planner вернул HTTP 400; Implementer и Tester были пропущены. В старом отчёте это превращалось в пустые поля.
- Commit `3a57241846555c1ed7829af00957cdb9e019d112` на `main`: оркестратор теперь сохраняет тело API-ошибки, выводит исход каждого этапа и явно маркирует отчёт как не-PASS.
- Commit `72add479a1293e91e6df0a87065fe2d38bb6e7a8` на `github-chat-prototype`: в каждый отдельный role Durable Object добавлен последний native Workers AI Pi-provider fallback; ошибка Pi harness теперь сохраняет диагностическую причину и классифицируется как HTTP 502, а не как ошибка пользовательского ввода.
- Commit `1fbc145217ea93b86cbfbaf91f9137a2f7420c57`: добавлены статические regression assertions для role-local fallback и диагностики.
- Для runtime commit `72add...` deploy run `44216205991` был в процессе; для tester commit `1fbc...` checks/deploy runs `44216220771` / `44216220777` были в процессе/ожидании на момент записи. Не считать эти изменения live до проверки exact-SHA deploy.
- Core CI run `44216076642` собрался, но упал на старом C++ assertion `tests/core_tests.cpp:26` (`hit.armorDamage==72.f&&hit.healthDamage==28.f&&hit.broken`). Это CSSBC core/gameplay, не SOLO.Chat runtime; не менять его в рамках чата без отдельной диагностики.

## Главный приоритет: доказать работу изолированных agent roles

Причина последнего сбоя ещё не установлена окончательно. Общий `shared-agent` прошёл harness check, но planner запускается в отдельном Durable Object `team-planner-...` и ранее не смог выполнить Pi tool turn. Ветка приложения теперь содержит Workers AI fallback и сохранение исходной ошибки. После exact-SHA deploy обязательно:

1. Выполнить live tool probe в отдельном role DO (planner, implementer, tester), не ограничиваться shared-agent.
2. Проверить реальный вызов `github_project_read_file` против `CSS-Bot-Community@github-chat-prototype`.
3. Проверить write на временной ветке/файле и обязательную очистку.
4. Запустить одну безопасную реальную задачу через весь pipeline; проверить planner, implementer, tester, ограниченный repair при необходимости и supervisor.
5. В отчёте зафиксировать exact commit SHA, deployment run, tool/provider, step outcomes, тестовые результаты и оставшиеся блокеры.

## Остальные незакрытые критерии

- Issue #100 — основной acceptance gate: live Pi tool execution, GitHub project tool call, cross-chat semantic memory с непустым embedding vector, чистый transcript, safe auto-update с draft retention, cleanup синтетических данных.
- Issue #5 — active learning и GitHub execution: доказать read/write E2E, retrieval/promotion навыка и feedback-to-fix loop.
- Issue #103 — реальная генерация тестового изображения встроенным `generate_image` только через бесплатный FLUX.1 Schnell; проверить байты/Content-Type/URL.
- Issues #104–#107 — надёжность тестера, протокол статусов, regression tests, независимый supervisor audit.
- Очередь содержит старые auto-generated failure tasks. Не закрывать и не удалять массово; сначала дедуплицировать по Task-Key/run и проверять, актуален ли сбой.
- Проверить, что supervisor принимает только evidence текущего SHA и обязательные CI/deploy gates; отсутствие evidence никогда не равно PASS.

## Правила эффективной работы

- Один основной acceptance issue на большую цель; подзадачи должны быть узкими, с точным `Agent-Target` и проверяемыми критериями.
- Один serial builder; никакого параллельного редактирования одного файла/ветки.
- Перед исправлением — inspect logs/current source/current SHA; затем минимальный patch и regression test.
- Ошибки API сохранять как структурированные данные (HTTP status + безопасное тело + provider/model + operation id), не подменять их общим «не работает».
- Повторять только безопасные pre-tool запросы. Если tool call уже исполнился, не повторять side effects автоматически.
- Мониторы обнаруживают и агрегируют проблемы, но не делают implementation и не выдают PASS.
- Supervisor read-only; закрывает задачу только при доказательствах на текущем SHA.
- После каждого изменения: CI → exact-SHA deploy (для runtime/UI) → live endpoint/tool test → supervisor.
- Не обещать готовность по статическим строкам теста, зелёному health endpoint или текстовому ответу модели.
- Не печатать токены/пароли, не очищать пользовательские диалоги и синтетические записи без точной marker-проверки.

## Канонические рабочие ссылки

- Основной acceptance: https://github.com/desdesyo/CSS-Bot-Community/issues/100
- Active learning: https://github.com/desdesyo/CSS-Bot-Community/issues/5
- Image generation smoke: https://github.com/desdesyo/CSS-Bot-Community/issues/103
- Orchestrator fix: https://github.com/desdesyo/CSS-Bot-Community/commit/3a57241846555c1ed7829af00957cdb9e019d112
- Role-local Pi fallback: https://github.com/desdesyo/CSS-Bot-Community/commit/72add479a1293e91e6df0a87065fe2d38bb6e7a8
- Regression tests: https://github.com/desdesyo/CSS-Bot-Community/commit/1fbc145217ea93b86cbfbaf91f9137a2f7420c57
