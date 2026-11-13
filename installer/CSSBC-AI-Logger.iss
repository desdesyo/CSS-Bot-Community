#define MyAppName "CSSBC AI Logger"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "CSS Bot Community"

[Setup]
AppId={{9A7B3F42-6F19-4F68-8D0C-3A6B12A0C5F1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={code:GetDefaultDir}
DisableProgramGroupPage=yes
Uninstallable=no
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
OutputDir=..\dist
OutputBaseFilename=CSSBC-AI-Logger-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\package\cssbc_ai_logger.smx"; DestDir: "{app}\addons\sourcemod\plugins"; Flags: ignoreversion

[Code]
function GetDefaultDir(Param: string): string;
var
  P: string;
begin
  P := ExpandConstant('{autopf}\Steam\steamapps\common\Counter-Strike Source\cstrike');
  if DirExists(P) then
    Result := P
  else
  begin
    P := ExpandConstant('{autopf32}\Steam\steamapps\common\Counter-Strike Source\cstrike');
    if DirExists(P) then
      Result := P
    else
      Result := ExpandConstant('{userdocs}');
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  GameDir: string;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    GameDir := WizardDirValue;
    if not DirExists(AddBackslash(GameDir) + 'addons\sourcemod') then
    begin
      MsgBox('В выбранной папке не найден SourceMod.' + #13#10 +
        'Выбери папку cstrike установленного Counter-Strike: Source с SourceMod.' + #13#10#13#10 +
        'Ожидаемый путь: cstrike\addons\sourcemod', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  PluginPath, BackupPath: string;
begin
  if CurStep = ssInstall then
  begin
    PluginPath := AddBackslash(WizardDirValue) + 'addons\sourcemod\plugins\cssbc_ai_logger.smx';
    if FileExists(PluginPath) then
    begin
      BackupPath := PluginPath + '.bak-' + GetDateTimeString('yyyymmdd-hhnnss', '-', ':');
      if not FileCopy(PluginPath, BackupPath, False) then
        MsgBox('Не удалось создать резервную копию старого плагина: ' + PluginPath, mbError, MB_OK);
    end;
  end;
end;
