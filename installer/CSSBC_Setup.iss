[Setup]
AppId={{B1E7B7D0-ACB4-4E2A-9C5D-340000000002}
AppName=CSS Bot Community (v34)
AppVersion=0.2.1
DefaultDirName={code:GetGameDir}
DisableDirPage=no
DirExistsWarning=no
OutputDir=.
OutputBaseFilename=CSSBC_Setup
ArchitecturesInstallIn64BitMode=
PrivilegesRequired=admin
Uninstallable=no
WizardStyle=modern
SetupLogging=yes

[Files]
Source: "server-v34-win32.dll"; DestDir: "{app}\cstrike\bin"; DestName: "server.dll"; Flags: ignoreversion
Source: "..\sdk\dll\bin\CSSBC_VSP.dll"; DestDir: "{app}\cstrike\addons\cssbc\bin"; Flags: ignoreversion
Source: "..\sdk\dll\plugin.vdf"; DestDir: "{app}\cstrike\addons\cssbc"; Flags: ignoreversion
Source: "..\sdk\dll\README_V34_BOOTSTRAP.md"; DestDir: "{app}\cstrike\addons\cssbc"; Flags: ignoreversion
Source: "..\tools\diagnostics\Collect-CSSBC.ps1"; DestDir: "{app}\cstrike\addons\cssbc\diagnostics"; Flags: ignoreversion
Source: "..\tools\log-collector\Upload-Logs.ps1"; DestDir: "{app}\cstrike\addons\cssbc\tools"; Flags: ignoreversion
Source: "..\tools\updater\Update-CSSBC.ps1"; DestDir: "{app}\cstrike\addons\cssbc\tools"; Flags: ignoreversion
Source: "..\tools\log-collector\Register-LogTask.ps1"; DestDir: "{app}\cstrike\addons\cssbc\tools"; Flags: ignoreversion
Source: "version.txt"; DestDir: "{app}\cstrike\addons\cssbc"; Flags: ignoreversion

[Icons]
Name: "{group}\CSSBC — Collect diagnostics"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\cstrike\addons\cssbc\diagnostics\Collect-CSSBC.ps1"" -GameDir ""{app}"" -OpenFolder"; WorkingDir: "{app}"
Name: "{group}\CSSBC — Configure log upload"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoExit -NoProfile -ExecutionPolicy Bypass -File ""{app}\cstrike\addons\cssbc\tools\Upload-Logs.ps1"" -WatchPath ""{app}\cstrike\logs"""; WorkingDir: "{app}"
Name: "{group}\CSSBC — Check updates"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\cstrike\addons\cssbc\tools\Update-CSSBC.ps1"" -GameDir ""{app}"""; WorkingDir: "{app}"

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\cstrike\addons\cssbc\tools\Register-LogTask.ps1"" -GameDir ""{app}"""; Flags: runhidden postinstall; StatusMsg: "Registering automatic log uploader..."

[Code]
function GetGameDir(Param: string): string;
begin
  if DirExists('C:\Games\Counter-Strike Source v34') then
    Result := 'C:\Games\Counter-Strike Source v34'
  else
    Result := ExpandConstant('{autopf}\Counter-Strike Source v34');
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not FileExists(ExpandConstant('{src}\server-v34-win32.dll')) then begin
    MsgBox('В комплекте отсутствует GameDLL. Установщик неполный.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Target, Backup: String;
begin
  if CurStep = ssInstall then begin
    Target := ExpandConstant('{app}\cstrike\bin\server.dll');
    Backup := ExpandConstant('{app}\cstrike\bin\server.dll.cssbc-backup');
    if FileExists(Target) and not FileExists(Backup) then
      FileCopy(Target, Backup, False);
  end;
end;
