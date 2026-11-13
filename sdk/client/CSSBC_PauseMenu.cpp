#include "CSSBC_PauseMenu.h"
#include <vgui_controls/Button.h>
#include <vgui_controls/Label.h>
#include <vgui/KeyCode.h>
#include <vgui/IInput.h>
#include "cbase.h"

CSSBCPauseMenu::CSSBCPauseMenu(vgui::VPANEL parent) : BaseClass(nullptr, "CSSBCPauseMenu") {
 SetParent(parent); SetTitle("Paused", true); SetSize(420,330); SetMinimumSize(420,330);
 SetMoveable(false); SetSizeable(false); SetCloseButtonVisible(false); SetDeleteSelfOnClose(false);
 SetVisible(false); SetKeyBoardInputEnabled(true); SetMouseInputEnabled(true);
 auto* title=new vgui::Label(this,"PauseHeading","CSS Bot Community");
 title->SetBounds(30,30,360,34); title->SetContentAlignment(vgui::Label::a_center);
 auto* b=new vgui::Button(this,"Resume","Продолжить",this,"resume"); b->SetBounds(80,90,260,42);
 b=new vgui::Button(this,"Options","Настройки",this,"options"); b->SetBounds(80,145,260,42);
 b=new vgui::Button(this,"Disconnect","Выйти на главный экран",this,"disconnect"); b->SetBounds(80,200,260,42);
 b=new vgui::Button(this,"Quit","Выход из игры",this,"quit"); b->SetBounds(80,255,260,42);
}
void CSSBCPauseMenu::Toggle(){m_open?Close():Open();}
void CSSBCPauseMenu::Open(){m_open=true;SetVisible(true);MakePopup();SetMouseInputEnabled(true);SetKeyBoardInputEnabled(true);}
void CSSBCPauseMenu::Close(){m_open=false;SetVisible(false);}
void CSSBCPauseMenu::OnKeyCodePressed(vgui::KeyCode code){if(code==KEY_ESCAPE){Close();return;}BaseClass::OnKeyCodePressed(code);}
void CSSBCPauseMenu::OnCommand(const char* cmd){
 if(!Q_stricmp(cmd,"resume")){Close();return;}
 if(!Q_stricmp(cmd,"options")){Close();engine->ClientCmd_Unrestricted("gamemenucommand open");return;}
 if(!Q_stricmp(cmd,"disconnect")){Close();engine->ClientCmd_Unrestricted("disconnect");return;}
 if(!Q_stricmp(cmd,"quit")){engine->ClientCmd_Unrestricted("quit");return;}
 BaseClass::OnCommand(cmd);
}