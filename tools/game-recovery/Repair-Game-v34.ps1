# CSS v34 Game Recovery — Windows PowerShell 5.1
# Reinstalls a v34 build 4044 baseline, preserving the old game folder and rolling back on failure.
Add-Type -AssemblyName System.Windows.Forms
$ErrorActionPreference = 'Stop'
$SourceUrl = 'https://source-v34.ru/cssv34.exe'
$DefaultGameDir = 'C:\Games\Counter-Strike Source v34'
$RecoveryRoot = Join-Path $env:LOCALAPPDATA 'CSSBC\GameRecovery'
$InstallerPath = Join-Path $RecoveryRoot 'cssv34.exe'
$HashPinPath = Join-Path $RecoveryRoot 'source-v34-installer.sha256'
$script:Log = New-Object 'System.Collections.Generic.List[string]'

function Log([string]$s) { $script:Log.Add(('{0}  {1}' -f (Get-Date -Format 'HH:mm:ss'),$s)) }
function Get-PeMachine([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return 'MISSING' }
    $fs = [IO.File]::Open($Path,'Open','Read','ReadWrite')
    try {
        $br = New-Object IO.BinaryReader($fs)
        if ($fs.Length -lt 64 -or $br.ReadUInt16() -ne 0x5A4D) { return 'INVALID' }
        $fs.Position = 0x3C
        $off = $br.ReadInt32()
        if ($off -lt 64 -or $off -gt ($fs.Length - 6)) { return 'INVALID' }
        $fs.Position = $off
        if ($br.ReadUInt32() -ne 0x00004550) { return 'INVALID' }
        return ('0x{0:X4}' -f $br.ReadUInt16())
    } finally { $fs.Dispose() }
}
function Find-AsciiInFile([string]$Path,[string]$Needle) {
    $fs=[IO.File]::OpenRead($Path)
    try {
        $buf=New-Object byte[] (1024*1024)
        $tail=''
        while(($n=$fs.Read($buf,0,$buf.Length)) -gt 0) {
            $chunk=$tail + [Text.Encoding]::ASCII.GetString($buf,0,$n)
            if($chunk.IndexOf($Needle,[StringComparison]::OrdinalIgnoreCase) -ge 0){ return $true }
            $keep=[Math]::Min($Needle.Length+32,$chunk.Length)
            $tail=$chunk.Substring($chunk.Length-$keep)
        }
        return $false
    } finally { $fs.Dispose() }
}
function Test-InstalledGame([string]$GameDir) {
    $c=Join-Path $GameDir 'cstrike'
    $required=@(
        (Join-Path $GameDir 'hl2.exe'),
        (Join-Path $GameDir 'bin\engine.dll'),
        (Join-Path $GameDir 'bin\FileSystem_Stdio.dll'),
        (Join-Path $GameDir 'bin\tier0_s.dll'),
        (Join-Path $GameDir 'bin\vstdlib_s.dll'),
        (Join-Path $c 'gameinfo.txt'),
        (Join-Path $c 'steam.inf'),
        (Join-Path $c 'bin\client.dll'),
        (Join-Path $c 'bin\server.dll')
    )
    $bad=New-Object 'System.Collections.Generic.List[string]'
    foreach($p in $required) {
        if(-not (Test-Path -LiteralPath $p -PathType Leaf)) { $bad.Add("Отсутствует: $p"); continue }
        if([IO.Path]::GetExtension($p) -in @('.exe','.dll')) {
            $m=Get-PeMachine $p
            if($m -ne '0x014C') { $bad.Add("Неверный PE/x86 формат ($m): $p") }
        }
    }
    $inf=Join-Path $c 'steam.inf'
    if(Test-Path -LiteralPath $inf) {
        $meta=Get-Content -LiteralPath $inf -Raw
        if($meta -notmatch '(?i)1\.0\.0\.34|4044') { $bad.Add('steam.inf не подтверждает версию 1.0.0.34 / build 4044.') }
    }
    return $bad
}
function Get-FreeBytes([string]$Path) {
    $root=[IO.Path]::GetPathRoot($Path)
    $drive=Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}'" -f $root.TrimEnd('\'))
    return [long]$drive.FreeSpace
}
function Invoke-Recovery([string]$GameDir) {
    $script:Log=New-Object 'System.Collections.Generic.List[string]'
    $GameDir=[IO.Path]::GetFullPath($GameDir)
    $parent=Split-Path $GameDir -Parent
    if(-not (Test-Path -LiteralPath $parent -PathType Container)){ throw "Родительская папка не найдена: $parent" }
    if(Get-Process -Name hl2,cstrike -ErrorAction SilentlyContinue){ throw 'Полностью закрой игру и повтори запуск утилиты.' }
    New-Item -ItemType Directory -Force -Path $RecoveryRoot | Out-Null
    $free=Get-FreeBytes $GameDir
    if($free -lt 6GB){ throw 'На диске нужно не менее 6 ГБ свободного места для загрузки и восстановления v34.' }

    Log 'Источник: SOURCE-V34.RU; заявленная версия 1.0.0.34 / build 4044.'
    Log 'Скачиваю установщик v34 (примерно 1,42 ГБ)...'
    if(-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf) -or (Get-Item $InstallerPath).Length -lt 1GB) {
        Remove-Item -LiteralPath $InstallerPath -Force -ErrorAction SilentlyContinue
        Invoke-WebRequest -Uri $SourceUrl -OutFile $InstallerPath -UseBasicParsing -TimeoutSec 1800
    }
    $length=(Get-Item -LiteralPath $InstallerPath).Length
    if($length -lt 1GB -or $length -gt 2GB){ throw "Размер загруженного файла подозрителен ($length байт). Установка отменена." }
    if((Get-PeMachine $InstallerPath) -notin @('0x014C','0x8664')){ throw 'Загруженный файл не распознан как Windows PE installer.' }
    $hash=(Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if(Test-Path -LiteralPath $HashPinPath) {
        $pinned=(Get-Content -LiteralPath $HashPinPath -Raw).Trim().ToLowerInvariant()
        if($pinned -ne $hash){ throw 'SHA-256 отличается от ранее сохранённого файла. Возможно, источник обновил установщик; автоматическая установка остановлена.' }
        Log 'SHA-256 совпадает с ранее сохранённым локальным отпечатком.'
    } else {
        Set-Content -LiteralPath $HashPinPath -Value $hash -Encoding ASCII
        Log 'Сохранён локальный SHA-256 для последующих проверок.'
        Log 'ВНИМАНИЕ: сайт не публикует контрольную сумму; первый SHA-256 — TOFU, а не независимое подтверждение подлинности.'
    }

    $inno=Find-AsciiInFile $InstallerPath 'Inno Setup Setup Data'
    $nsis=Find-AsciiInFile $InstallerPath 'NullsoftInst'
    $backup=$null
    $stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
    if(Test-Path -LiteralPath $GameDir -PathType Container) {
        $backup="$GameDir.cssbc-backup-$stamp"
        Log "Сохраняю всю старую папку игры переименованием: $backup"
        Move-Item -LiteralPath $GameDir -Destination $backup
    }
    try {
        Log 'Запускаю установщик в целевую папку.'
        if($inno) {
            $args='/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR="' + $GameDir + '"'
            $proc=Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru
        } elseif($nsis) {
            $proc=Start-Process -FilePath $InstallerPath -Wait -PassThru
        } else {
            Log 'Тип установщика не распознан; запускаю штатный интерфейс установки.'
            $proc=Start-Process -FilePath $InstallerPath -Wait -PassThru
        }
        Log "Установщик завершился с кодом $($proc.ExitCode)."
        if($proc.ExitCode -ne 0){ throw "Установщик вернул код $($proc.ExitCode)." }
        if(-not (Test-Path -LiteralPath $GameDir -PathType Container)) { throw 'Установщик не создал целевую папку игры.' }
        $problems=Test-InstalledGame $GameDir
        if($problems.Count -gt 0) { throw ('Проверка восстановленной игры не пройдена:' + [Environment]::NewLine + ($problems -join [Environment]::NewLine)) }
        Log 'ПРОВЕРКА ПРОЙДЕНА: критические файлы присутствуют, PE32 x86, версия v34/build 4044 подтверждена.'
        if($backup){ Log "Резервная копия исходной игры сохранена: $backup" }
        Log 'Восстановление завершено. CSS Bot Community пока не устанавливался.'
    } catch {
        Log "ОШИБКА: $($_.Exception.Message)"
        if(Test-Path -LiteralPath $GameDir -PathType Container) {
            $failed="$GameDir.failed-$stamp"
            Move-Item -LiteralPath $GameDir -Destination $failed
            Log "Неудачная установка сохранена: $failed"
        }
        if($backup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            Move-Item -LiteralPath $backup -Destination $GameDir
            Log 'Исходная игра восстановлена из резервной копии.'
        }
        throw
    }
    $report=Join-Path $RecoveryRoot ("GameRecovery-$stamp.txt")
    $script:Log | Set-Content -LiteralPath $report -Encoding UTF8
    return ($script:Log -join [Environment]::NewLine) + [Environment]::NewLine + "Отчёт: $report"
}

$form=New-Object Windows.Forms.Form
$form.Text='Counter-Strike: Source v34 — восстановление игры'
$form.Size=New-Object Drawing.Size(780,540)
$form.StartPosition='CenterScreen'
$lbl=New-Object Windows.Forms.Label
$lbl.Text='Папка игры (по умолчанию — известный путь из проекта)'
$lbl.Location=New-Object Drawing.Point(12,12); $lbl.AutoSize=$true
$form.Controls.Add($lbl)
$path=New-Object Windows.Forms.TextBox
$path.Location=New-Object Drawing.Point(12,38); $path.Size=New-Object Drawing.Size(625,24)
$path.Text=$DefaultGameDir; $path.Anchor='Top,Left,Right'; $form.Controls.Add($path)
$browse=New-Object Windows.Forms.Button
$browse.Text='Обзор'; $browse.Location=New-Object Drawing.Point(646,36); $browse.Size=New-Object Drawing.Size(105,28); $browse.Anchor='Top,Right'
$browse.Add_Click({$d=New-Object Windows.Forms.FolderBrowserDialog; $d.SelectedPath=$path.Text; if($d.ShowDialog() -eq 'OK'){$path.Text=$d.SelectedPath}})
$form.Controls.Add($browse)
$out=New-Object Windows.Forms.TextBox
$out.Location=New-Object Drawing.Point(12,76); $out.Size=New-Object Drawing.Size(739,365)
$out.Multiline=$true; $out.ScrollBars='Vertical'; $out.ReadOnly=$true; $out.Font=New-Object Drawing.Font('Consolas',9)
$out.Anchor='Top,Bottom,Left,Right'; $form.Controls.Add($out)
$run=New-Object Windows.Forms.Button
$run.Text='Скачать и восстановить игру'; $run.Location=New-Object Drawing.Point(12,455); $run.Size=New-Object Drawing.Size(220,34); $run.Anchor='Bottom,Left'
$run.Add_Click({
    $run.Enabled=$false
    try {
        $out.Text='Загрузка установщика и восстановление v34. Не закрывай окно...'
        $form.Refresh()
        $out.Text=Invoke-Recovery $path.Text
        [Windows.Forms.MessageBox]::Show('Восстановление завершено. Исходная папка сохранена в резервной копии.','CSS v34','OK','Information') | Out-Null
    } catch {
        $out.Text += [Environment]::NewLine + "ОШИБКА: $($_.Exception.Message)"
        [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Восстановление не завершено','OK','Error') | Out-Null
    } finally { $run.Enabled=$true }
})
$form.Controls.Add($run)
$note=New-Object Windows.Forms.Label
$note.Text='Сначала сохраняется вся старая папка; при ошибке выполняется откат. Источник — сторонняя сборка v34.'
$note.Location=New-Object Drawing.Point(12,500); $note.AutoSize=$true; $note.Anchor='Bottom,Left'
$form.Controls.Add($note)
[void]$form.ShowDialog()
