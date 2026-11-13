# CSS v34 Game Recovery - Windows PowerShell 5.1
# Preserves the old folder, installs a v34 build 4044 baseline, validates critical files and rolls back on failure.
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
    $fs = [IO.File]::Open($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
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
    $fs = [IO.File]::OpenRead($Path)
    try {
        $buf = New-Object byte[] (1024*1024)
        $tail = ''
        while (($n = $fs.Read($buf,0,$buf.Length)) -gt 0) {
            $chunk = $tail + [Text.Encoding]::ASCII.GetString($buf,0,$n)
            if ($chunk.IndexOf($Needle,[StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
            $keep = [Math]::Min($Needle.Length+32,$chunk.Length)
            $tail = $chunk.Substring($chunk.Length-$keep)
        }
        return $false
    } finally { $fs.Dispose() }
}
function Test-InstalledGame([string]$GameDir) {
    $c = Join-Path $GameDir 'cstrike'
    $required = @(
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
    $bad = New-Object 'System.Collections.Generic.List[string]'
    foreach ($p in $required) {
        if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { $bad.Add('Missing: ' + $p); continue }
        if ([IO.Path]::GetExtension($p) -in @('.exe','.dll')) {
            $m = Get-PeMachine $p
            if ($m -ne '0x014C') { $bad.Add('Invalid x86 PE (' + $m + '): ' + $p) }
        }
    }
    $inf = Join-Path $c 'steam.inf'
    if (Test-Path -LiteralPath $inf) {
        $meta = Get-Content -LiteralPath $inf -Raw
        if (-not ($meta.Contains('1.0.0.34') -or $meta.Contains('4044'))) {
            $bad.Add('steam.inf does not identify version 1.0.0.34 / build 4044.')
        }
    }
    return $bad
}
function Get-FreeBytes([string]$Path) {
    $root = [IO.Path]::GetPathRoot($Path)
    $driveId = $root.Substring(0,2)
    $drive = Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}'" -f $driveId)
    return [long]$drive.FreeSpace
}
function Invoke-Recovery([string]$GameDir) {
    $script:Log = New-Object 'System.Collections.Generic.List[string]'
    $GameDir = [IO.Path]::GetFullPath($GameDir)
    $parent = Split-Path $GameDir -Parent
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw ('Parent folder missing: ' + $parent) }
    if (Get-Process -Name hl2,cstrike -ErrorAction SilentlyContinue) { throw 'Close Counter-Strike: Source before recovery.' }
    New-Item -ItemType Directory -Force -Path $RecoveryRoot | Out-Null
    if ((Get-FreeBytes $GameDir) -lt 6GB) { throw 'At least 6 GB free space is required on the target drive.' }
    Log 'Source: SOURCE-V34.RU; listed version 1.0.0.34 / build 4044.'
    Log 'Downloading v34 installer (listed size about 1.42 GB)...'
    if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf) -or (Get-Item $InstallerPath).Length -lt 1GB) {
        Remove-Item -LiteralPath $InstallerPath -Force -ErrorAction SilentlyContinue
        Invoke-WebRequest -Uri $SourceUrl -OutFile $InstallerPath -UseBasicParsing -TimeoutSec 1800
    }
    $length = (Get-Item -LiteralPath $InstallerPath).Length
    if ($length -lt 1GB -or $length -gt 2GB) { throw ('Unexpected installer size: ' + $length + ' bytes.') }
    if ((Get-PeMachine $InstallerPath) -notin @('0x014C','0x8664')) { throw 'Downloaded file is not a valid Windows PE installer.' }
    $hash = (Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if (Test-Path -LiteralPath $HashPinPath) {
        $pinned = (Get-Content -LiteralPath $HashPinPath -Raw).Trim().ToLowerInvariant()
        if ($pinned -ne $hash) { throw 'Installer SHA-256 differs from the locally pinned copy. Automatic install stopped.' }
        Log 'SHA-256 matches the locally pinned installer.'
    } else {
        Set-Content -LiteralPath $HashPinPath -Value $hash -Encoding ASCII
        Log 'Saved local SHA-256 pin. WARNING: source page does not publish an independent checksum; first download is TOFU.'
    }
    $inno = Find-AsciiInFile $InstallerPath 'Inno Setup Setup Data'
    $backup = $null
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    if (Test-Path -LiteralPath $GameDir -PathType Container) {
        $backup = $GameDir + '.cssbc-backup-' + $stamp
        Log ('Preserving existing game folder: ' + $backup)
        Move-Item -LiteralPath $GameDir -Destination $backup
    }
    try {
        Log 'Starting the v34 installer.'
        if ($inno) {
            $setupArgs = '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR="' + $GameDir + '"'
            $proc = Start-Process -FilePath $InstallerPath -ArgumentList $setupArgs -Wait -PassThru
        } else {
            Log ('Installer type is not recognized; its normal setup window will open. Select this target folder: ' + $GameDir)
            $proc = Start-Process -FilePath $InstallerPath -Wait -PassThru
        }
        Log ('Installer exit code: ' + $proc.ExitCode)
        if ($proc.ExitCode -ne 0) { throw ('Installer returned exit code ' + $proc.ExitCode) }
        if (-not (Test-Path -LiteralPath $GameDir -PathType Container)) { throw 'Installer did not create the target game folder.' }
        $problems = Test-InstalledGame $GameDir
        if ($problems.Count -gt 0) { throw ('Post-install validation failed:' + [Environment]::NewLine + ($problems -join [Environment]::NewLine)) }
        Log 'PASS: critical files exist, PE32 x86 checks passed, v34/build 4044 metadata found.'
        if ($backup) { Log ('Original game preserved at: ' + $backup) }
        Log 'Game recovery finished. CSS Bot Community has NOT been installed.'
    } catch {
        Log ('ERROR: ' + $_.Exception.Message)
        if (Test-Path -LiteralPath $GameDir -PathType Container) {
            $failed = $GameDir + '.failed-' + $stamp
            Move-Item -LiteralPath $GameDir -Destination $failed
            Log ('Failed install preserved at: ' + $failed)
        }
        if ($backup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            Move-Item -LiteralPath $backup -Destination $GameDir
            Log 'Original game folder restored.'
        }
        throw
    }
    $report = Join-Path $RecoveryRoot ('GameRecovery-' + $stamp + '.txt')
    $script:Log | Set-Content -LiteralPath $report -Encoding UTF8
    return ($script:Log -join [Environment]::NewLine) + [Environment]::NewLine + ('Report: ' + $report)
}
$form = New-Object Windows.Forms.Form
$form.Text = 'Counter-Strike: Source v34 - Game Recovery'
$form.Size = New-Object Drawing.Size(780,540)
$form.StartPosition = 'CenterScreen'
$lbl = New-Object Windows.Forms.Label
$lbl.Text = 'Game folder (pre-filled with the project path)'
$lbl.Location = New-Object Drawing.Point(12,12)
$lbl.AutoSize = $true
$form.Controls.Add($lbl)
$path = New-Object Windows.Forms.TextBox
$path.Location = New-Object Drawing.Point(12,38)
$path.Size = New-Object Drawing.Size(625,24)
$path.Text = $DefaultGameDir
$path.Anchor = 'Top,Left,Right'
$form.Controls.Add($path)
$browse = New-Object Windows.Forms.Button
$browse.Text = 'Browse'
$browse.Location = New-Object Drawing.Point(646,36)
$browse.Size = New-Object Drawing.Size(105,28)
$browse.Anchor = 'Top,Right'
$browse.Add_Click({ $d = New-Object Windows.Forms.FolderBrowserDialog; $d.SelectedPath = $path.Text; if ($d.ShowDialog() -eq 'OK') { $path.Text = $d.SelectedPath } })
$form.Controls.Add($browse)
$out = New-Object Windows.Forms.TextBox
$out.Location = New-Object Drawing.Point(12,76)
$out.Size = New-Object Drawing.Size(739,365)
$out.Multiline = $true
$out.ScrollBars = 'Vertical'
$out.ReadOnly = $true
$out.Font = New-Object Drawing.Font('Consolas',9)
$out.Anchor = 'Top,Bottom,Left,Right'
$form.Controls.Add($out)
$run = New-Object Windows.Forms.Button
$run.Text = 'Download and repair game'
$run.Location = New-Object Drawing.Point(12,455)
$run.Size = New-Object Drawing.Size(220,34)
$run.Anchor = 'Bottom,Left'
$run.Add_Click({
    $run.Enabled = $false
    try {
        $out.Text = 'Downloading installer and recovering v34. Do not close this window...'
        $form.Refresh()
        $out.Text = Invoke-Recovery $path.Text
        [Windows.Forms.MessageBox]::Show('Recovery finished. The original folder is preserved as a backup.','CSS v34','OK','Information') | Out-Null
    } catch {
        $out.Text += [Environment]::NewLine + ('ERROR: ' + $_.Exception.Message)
        [Windows.Forms.MessageBox]::Show($_.Exception.Message,'Recovery failed','OK','Error') | Out-Null
    } finally { $run.Enabled = $true }
})
$form.Controls.Add($run)
$note = New-Object Windows.Forms.Label
$note.Text = 'The old game folder is preserved; rollback runs if validation fails. Third-party v34 source.'
$note.Location = New-Object Drawing.Point(12,500)
$note.AutoSize = $true
$note.Anchor = 'Bottom,Left'
$form.Controls.Add($note)
[void]$form.ShowDialog()
