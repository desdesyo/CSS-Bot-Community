# CSSBC Match Auto-Uploader (Windows)

Автоматически обнаруживает новые CS:S console logs, ждёт завершения записи, упаковывает матч и отправляет его в отдельный GitHub-репозиторий через Git CLI + GitHub CLI (`gh`). Не требует ручного копирования каждого матча.

## Требования
- Windows PowerShell 5.1+
- Git for Windows
- GitHub CLI (`gh`), вход: `gh auth login`
- отдельный репозиторий анализа (например, `desdesyo/CSSBC-Match-Data`), созданный заранее
- CS:S настроен на запись `con_logfile` в отслеживаемую папку

## Настройка (один раз)
1. Создайте отдельный пустой GitHub repo для матчей (лучше **Private**).
2. Установите Git и GitHub CLI, выполните `gh auth login` и `gh auth status`.
3. Создайте локальную папку для логов, например `C:\CSSBC\incoming`.
4. В консоли игры задайте файл в этой папке: `con_logfile "C:/CSSBC/incoming/match-current.log"`. Если игра не поддерживает абсолютный путь, используйте её `cstrike` folder и задайте `WatchPath` туда.
5. Запустите скрипт ниже; оставьте его работать во время матчей.

## Поведение
- Следит за `WatchPath` за новыми/изменёнными *.log.
- После 90 секунд без изменений считает лог закрытым (или обрабатывает по Ctrl+C).
- Копирует лог в отдельную папку матча, добавляет manifest, ZIP.
- Клонирует analysis repo (один раз), commit + push.
- Не удаляет исходные игровые логи.
- Если push не прошёл — пакет остаётся локально в `Queue` для повторной отправки вручную.

## Запуск
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\Watch-And-Push.ps1 -WatchPath "C:\CSSBC\incoming" -AnalysisRepo "desdesyo/CSSBC-Match-Data"
```

Важно: **не используйте токен GitHub в самом скрипте**. Авторизация берётся из `gh auth`.
