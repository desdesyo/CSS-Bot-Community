# CSS Bot Match Log Collector

Подробная инструкция: [AUTO_UPLOAD_SETUP.md](AUTO_UPLOAD_SETUP.md).

## Автоматическая отправка
- [Watch-And-Push.ps1](Watch-And-Push.ps1) — watcher: ждёт, пока лог перестанет обновляться, копирует его в отдельный матч и автоматически делает commit/push в analysis repo.
- [AUTO_UPLOAD_SETUP.md](AUTO_UPLOAD_SETUP.md) — установка и настройка.

Сборщик **не создаёт отдельный GitHub repo автоматически**: создай приватный репозиторий данных один раз (например, `CSSBC-Match-Data`) и передай его имя параметром. Токен не вписывай в файл — авторизация через `gh auth login`.
