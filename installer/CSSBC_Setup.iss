[Setup]
AppId={{B1E7B7D0-ACB4-4E2A-9C5D-340000000002}
AppName=CSS Bot Community (v34)
AppVersion=0.1.0
DefaultDirName={code:GetGameDir}
DisableDirPage=no
DirExistsWarning=no
OutputDir=.
OutputBaseFilename=CSSBC_Setup
ArchitecturesInstallIn64BitMode=
PrivilegesRequired=admin
Uninstallable=no
WizardStyle=modern

[Files]
Source: "..\sdk\dll\bin\CSSBC_VSP.dll"; DestDir: "{app}\cstrike\addons\cssbc\bin"; Flags: ignoreversion
Source: "..\sdk\dll\plugin.vdf"; DestDir: "{app}\cstrike\addons\cssbc"; DestName: "plugin.vdf"; Flags: ignoreversion
Source: "..\sdk\dll\README_V34_BOOTSTRAP.md"; DestDir: "{app}\cstrike\addons\cssbc"; Flags: ignoreversion

[Files]
Source: "..\\tools\\diagnostics\\Collect-CSSBC.ps1"; DestDir: "{app}\\cstrike\\addons\\cssbc\\diagnostics"; Flags: ignoreversion

[Icons]
Name: "{group}\\CSSBC — Collect diagnostics"; Filename: "{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\\cstrike\\addons\\cssbc\\diagnostics\\Collect-CSSBC.ps1"" -GameDir ""{app}"" -OpenFolder"; WorkingDir: "{app}"

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
  if not DirExists(ExpandConstant('{app}\cstrike')) then
  begin
    MsgBox('В выбранной папке нет cstrike. Выберите корень CS:S v34.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Backup: String;
begin
  if CurStep = ssInstall then begin
    Backup := ExpandConstant('{app}\cstrike\addons\cssbc\plugin.vdf.bak');
    if FileExists(ExpandConstant('{app}\cstrike\addons\cssbc\plugin.vdf')) then
      RenameFile(ExpandConstant('{app}\cstrike\addons\cssbc\plugin.vdf'), Backup);
  end;
end;
