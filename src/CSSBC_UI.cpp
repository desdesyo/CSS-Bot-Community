#include "CSSBC_UI.h"
#include <algorithm>
#include <sstream>
namespace cssbc {
MenuModel MenuController::Build(MenuPage page,bool connected,bool hasLastSetup) const {
 MenuModel m; m.page=page;
 auto add=[&](const char* id,const char* label,MenuAction a){m.items.push_back({id,label,a});};
 switch(page){
 case MenuPage::Main:
  add("play","ИГРАТЬ",MenuAction::OpenPlay);add("new_match","НАЧАТЬ МАТЧ",MenuAction::OpenNewMatch);
  if(hasLastSetup)add("resume","ПРОДОЛЖИТЬ",MenuAction::ResumeLastSetup);
  add("cssbc","CSS BOT COMMUNITY",MenuAction::OpenCSSBC);add("settings","НАСТРОЙКИ",MenuAction::OpenSettings);
  add("extras","ДОПОЛНИТЕЛЬНО",MenuAction::OpenExtras);add("servers","СПИСОК СЕРВЕРОВ",MenuAction::OpenServerBrowser);
  if(connected)add("disconnect","ОТКЛЮЧИТЬСЯ",MenuAction::Disconnect);break;
 case MenuPage::Play:add("new_match","NEW MATCH",MenuAction::OpenNewMatch);add("servers","SERVER BROWSER",MenuAction::OpenServerBrowser);add("back","НАЗАД",MenuAction::Back);break;
 case MenuPage::NewMatch:add("start","НАЧАТЬ",MenuAction::OpenNewMatch);add("back","BACK",MenuAction::Back);break;
 case MenuPage::CSSBC:add("back","BACK",MenuAction::Back);break;
 case MenuPage::Settings:add("back","BACK",MenuAction::Back);break;
 case MenuPage::Extras:add("back","BACK",MenuAction::Back);break;
 case MenuPage::ServerBrowser:add("connect","CONNECT",MenuAction::Connect);add("back","BACK",MenuAction::Back);break;
 }
 return m;
}
MenuPage MenuController::Navigate(MenuPage current,MenuAction a) const {
 switch(a){case MenuAction::OpenPlay:return MenuPage::Play;case MenuAction::OpenNewMatch:return MenuPage::NewMatch;
 case MenuAction::OpenCSSBC:return MenuPage::CSSBC;case MenuAction::OpenSettings:return MenuPage::Settings;
 case MenuAction::OpenExtras:return MenuPage::Extras;case MenuAction::OpenServerBrowser:return MenuPage::ServerBrowser;
 case MenuAction::Back:return MenuPage::Main;default:return current;}
}
HudView BuildHud(const HudSnapshot&s,const HudConfig&c){
 HudView v; auto clamp=[](int x){return std::max(0,x);};
 if(c.showHealth)v.health="ЗДР "+std::to_string(clamp(s.health));
 if(c.showArmor)v.armor="БРОНЯ "+std::to_string(clamp(s.armor));
 if(c.showAmmo)v.ammo=std::to_string(clamp(s.clip))+" / "+std::to_string(clamp(s.reserve));
 if(c.showMoney)v.money="$"+std::to_string(clamp(s.money));
 if(c.showTeam)v.team="В СТРОЮ "+std::to_string(clamp(s.aliveTeammates))+" · ПОГИБЛИ "+std::to_string(clamp(s.deadTeammates))+"";
 if(s.hasJuggernaut)v.juggernaut="ГРОМИЛА: ПЛАСТИНЫ "+std::to_string(std::clamp(s.juggernautPlatesIntact,0,6))+"/6";
 v.message=s.contextualMessage;return v;
}
}
