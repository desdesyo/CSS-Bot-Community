[Setup]
AppId={{B1E7B7D0-ACB4-4E2A-9C5D-340000000002}
AppName=CSS Bot Community (v34)
AppVersion=0.2.1
DefaultDirName={code:GetGameDir}
DisableDirPage=no
DirExistsWarning=no
OutputDir=.
OutputBaseFilename=CSSBC_Setup
PrivilegesRequired=admin
Uninstallable=no
WizardStyle=modern
SetupLogging=yes
CloseApplications=yes
RestartApplications=no

[Files]
; Install the GameDLL first. Preserve the original game DLL exactly once.
Source: "payload\server-v34-win32.dll"; DestDir: "{app}\cstrike\bin"; DestName: "server.dll"; Flags: ignoreversion; BeforeInstall: BackupOriginalServer
Source: "..\sdk\dll\bin\CSSBC_VSP.dll"; DestDir: "{app}\cstrike\addons\cssbc\bin"; Flags: ignoreversion
Source: "..\sdk\dll\plugin.vdf"; DestDir: "{app}\cstrike\addons"; DestName: "cssbc.vdf"; Flags: ignoreversion
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
var
  Candidate: string;
begin
  Candidate := 'C:\Games\Counter-Strike Source v34';
  if FileExists(Candidate + '\cstrike\gameinfo.txt') then
    Result := Candidate
  else
    Result := ExpandConstant('{autopf}\Counter-Strike Source v34');
end;

procedure BackupOriginalServer;
var
  ServerDll: string;
  BackupDll: string;
begin
  ServerDll := ExpandConstant('{app}\cstrike\bin\server.dll');
  BackupDll := ServerDll + '.cssbc-backup';

  if FileExists(ServerDll) and not FileExists(BackupDll) then
  begin
    if not FileCopy(ServerDll, BackupDll, False) then
      RaiseException('Could not back up the original server.dll. Installation was stopped to protect the game.');
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if not FileExists(ExpandConstant('{app}\cstrike\gameinfo.txt')) then
    Result := 'The selected folder is not a Counter-Strike: Source v34 game folder.' + #13#10 +
      'Select the folder that contains the cstrike subfolder.';
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;
