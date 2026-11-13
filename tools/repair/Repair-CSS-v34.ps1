# CSS v34 Repair Utility — Windows PowerShell 5.1
# Safe-by-default: never overwrites a valid game server.dll and never edits metamod.vdf.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

function Get-PeMachine([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    $fs = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
        $br = New-Object IO.BinaryReader($fs)
        if ($fs.Length -lt 64 -or $br.ReadUInt16() -ne 0x5A4D) { return 'INVALID' }
        $fs.Position = 0x3C
        $peOffset = $br.ReadInt32()
        if ($peOffset -lt 64 -or $peOffset -gt ($fs.Length - 6)) { return 'INVALID' }
        $fs.Position = $peOffset
        if ($br.ReadUInt32() -ne 0x00004550) { return 'INVALID' }
        return ('0x{0:X4}' -f $br.ReadUInt16())
    } finally { $fs.Dispose() }
}
function Write-Log([string]$Message) {
    $script:Log.Add(("{0}  {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message))
}
function Test-Game([string]$GameDir, [bool]$DoRepair) {
    $script:Log = New-Object 'System.Collections.Generic.List[string]'
    $game = (Resolve-Path -LiteralPath $GameDir).Path
    $cstrike = Join-Path $game 'cstrike'
    if (-not (Test-Path -LiteralPath $cstrike -PathType Container)) { throw "Не найдена папка cstrike: $cstrike" }
    Write-Log "Игра: $game"
    $server = Join-Path $cstrike 'bin\server.dll'
    if (Test-Path -LiteralPath $server) {
        $machine = Get-PeMachine $server
        if ($machine -eq '0x014C') {
            Write-Log 'OK: cstrike\bin\server.dll — корректный PE32 (x86). Файл не изменён.'
        } else {
            Write-Log "ОШИБКА: server.dll имеет формат $machine, ожидался PE32 x86."
            if ($DoRepair) {
                $dlg = New-Object System.Windows.Forms.OpenFileDialog
                $dlg.Title = 'Выберите чистый server.dll от вашей CSS v34 (32-bit)'
                $dlg.Filter = 'DLL files (*.dll)|*.dll|All files (*.*)|*.*'
                if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                    $candidate = $dlg.FileName
                    if ((Get-PeMachine $candidate) -ne '0x014C') {
                        Write-Log 'ОТКАЗ: выбранный файл не является DLL PE32 x86; ничего не заменено.'
                    } else {
                        $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
                        $backup = "$server.cssbc-repair-$stamp.bak"
                        Copy-Item -LiteralPath $server -Destination $backup
                        Copy-Item -LiteralPath $candidate -Destination $server -Force
                        if ((Get-PeMachine $server) -eq '0x014C') {
                            Write-Log "ВОССТАНОВЛЕНО: server.dll из выбранного чистого файла. Старый файл сохранён: $backup"
                        } else {
                            Copy-Item -LiteralPath $backup -Destination $server -Force
                            Write-Log 'ОШИБКА проверки после копирования. Исходный файл возвращён из резервной копии.'
                        }
                    }
                } else { Write-Log 'Восстановление server.dll пропущено: чистый файл не выбран.' }
            } else { Write-Log 'Режим проверки: изменений нет. Для восстановления запустите Repair.' }
        }
    } else { Write-Log 'ВНИМАНИЕ: cstrike\bin\server.dll отсутствует. Утилита не скачивает неизвестные DLL.' }

    $expected = Join-Path $cstrike 'addons\cssbc\bin\CSSBC_VSP.dll'
    $wrong = Join-Path $cstrike 'bin\CSSBC_VSP.dll'
    if (Test-Path -LiteralPath $expected) {
        $m = Get-PeMachine $expected
        if ($m -eq '0x014C') { Write-Log 'OK: CSSBC_VSP.dll находится в ожидаемой папке и имеет архитектуру x86.' }
        else { Write-Log "ОШИБКА: CSSBC_VSP.dll в ожидаемой папке имеет формат $m; заменять нечем." }
    } elseif (Test-Path -LiteralPath $wrong) {
        Write-Log 'НАЙДЕНА CSSBC_VSP.dll в старой/неправильной папке cstrike\bin.'
        if ($DoRepair -and (Get-PeMachine $wrong) -eq '0x014C') {
            New-Item -ItemType Directory -Force -Path (Split-Path $expected) | Out-Null
            Move-Item -LiteralPath $wrong -Destination $expected
            Write-Log 'ИСПРАВЛЕНО: CSSBC_VSP.dll перемещена в cstrike\addons\cssbc\bin\.'
        } else { Write-Log 'Автоперенос не выполнен (режим проверки или неверная архитектура).' }
    } else { Write-Log 'CSSBC_VSP.dll не найдена. Это не мешает запуску чистой игры; DLL не создаётся из воздуха.' }

    $metamod = Join-Path $cstrike 'addons\metamod.vdf'
    if (Test-Path -LiteralPath $metamod) { Write-Log 'INFO: найден metamod.vdf. Файл оставлен без изменений.' }
    else { Write-Log 'INFO: metamod.vdf отсутствует; утилита не устанавливает MetaMod/SourceMod.' }

    $reportDir = Join-Path $env:LOCALAPPDATA 'CSSBotCommunity\Repair'
    New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
    $report = Join-Path $reportDir ("CSSBC_Repair_{0}.txt" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
    $script:Log | Set-Content -LiteralPath $report -Encoding UTF8
    Write-Log "Отчёт: $report"
    return ($script:Log -join [Environment]::NewLine)
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'CSS v34 — восстановление файлов'
$form.Size = New-Object Drawing.Size(760,560)
$form.StartPosition = 'CenterScreen'
$form.MinimumSize = New-Object Drawing.Size(650,480)
$label = New-Object Windows.Forms.Label
$label.Text = 'Папка Counter-Strike: Source v34'
$label.Location = New-Object Drawing.Point(14,15); $label.AutoSize = $true
$form.Controls.Add($label)
$path = New-Object Windows.Forms.TextBox
$path.Location = New-Object Drawing.Point(14,40); $path.Size = New-Object Drawing.Size(600,25)
$path.Anchor = 'Top,Left,Right'; $form.Controls.Add($path)
$browse = New-Object Windows.Forms.Button
$browse.Text = 'Обзор...'; $browse.Location = New-Object Drawing.Point(625,38)
$browse.Size = New-Object Drawing.Size(105,28); $browse.Anchor = 'Top,Right'
$browse.Add_Click({ $f=New-Object Windows.Forms.FolderBrowserDialog; $f.Description='Выберите корневую папку игры (внутри должна быть cstrike)'; if($f.ShowDialog() -eq 'OK'){$path.Text=$f.SelectedPath} })
$form.Controls.Add($browse)
$output = New-Object Windows.Forms.TextBox
$output.Location = New-Object Drawing.Point(14,78); $output.Size = New-Object Drawing.Size(716,390)
$output.Multiline = $true; $output.ScrollBars = 'Vertical'; $output.ReadOnly = $true
$output.Font = New-Object Drawing.Font('Consolas',9)
$output.Anchor = 'Top,Bottom,Left,Right'; $form.Controls.Add($output)
$check = New-Object Windows.Forms.Button
$check.Text = 'Проверить'; $check.Location = New-Object Drawing.Point(14,480); $check.Size = New-Object Drawing.Size(130,32); $check.Anchor='Bottom,Left'
$check.Add_Click({ try { $output.Text = Test-Game $path.Text $false } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Ошибка','OK','Error') | Out-Null } })
$form.Controls.Add($check)
$repair = New-Object Windows.Forms.Button
$repair.Text = 'Исправить безопасно'; $repair.Location = New-Object Drawing.Point(154,480); $repair.Size = New-Object Drawing.Size(180,32); $repair.Anchor='Bottom,Left'
$repair.Add_Click({ try { $output.Text = Test-Game $path.Text $true } catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Ошибка','OK','Error') | Out-Null } })
$form.Controls.Add($repair)
$open = New-Object Windows.Forms.Button
$open.Text = 'Открыть отчёты'; $open.Location = New-Object Drawing.Point(344,480); $open.Size = New-Object Drawing.Size(140,32); $open.Anchor='Bottom,Left'
$open.Add_Click({ $p=Join-Path $env:LOCALAPPDATA 'CSSBotCommunity\Repair'; New-Item -ItemType Directory -Force -Path $p | Out-Null; Start-Process explorer.exe $p })
$form.Controls.Add($open)
$note = New-Object Windows.Forms.Label
$note.Text = 'Важно: server.dll не подменяется автоматически. Нужен выбранный вами чистый x86-файл.'
$note.Location = New-Object Drawing.Point(14,525); $note.AutoSize=$true; $note.Anchor='Bottom,Left'
$form.Controls.Add($note)
[void]$form.ShowDialog()
