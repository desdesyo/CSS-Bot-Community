#include "CSSBC_UI.h"
#include "CSSBC_Localization.h"
#include <cassert>
using namespace cssbc;
int main(){\n assert(Ru(LocaleKey::MenuPlay)=="Играть");\n auto ct=VoiceLines(Faction::CounterTerrorists,VoiceContext::RookieTease); assert(ct.size()>=3&&ct[0].text.find("Новенький")!=std::string_view::npos);\n auto t=VoiceLines(Faction::Terrorists,VoiceContext::Ideology); assert(t.size()>=3);
 MenuController menu;auto main=menu.Build(MenuPage::Main,false,true);
 assert(main.items.size()==7&&main.items[0].label=="ИГРАТЬ");
 assert(menu.Navigate(MenuPage::Main,MenuAction::OpenCSSBC)==MenuPage::CSSBC);\n auto submenu=menu.Build(MenuPage::CSSBC,false,false);assert(submenu.items.size()==5);assert(menu.Navigate(MenuPage::CSSBC,MenuAction::OpenMVP)==MenuPage::MVP);\n auto ranks=RankMVP({{1,"A",2.f},{2,"B",8.f},{3,"C",4.f}});assert(ranks[0].player==2&&ranks[2].player==1);
 auto connected=menu.Build(MenuPage::Main,true,false);assert(connected.items.back().action==MenuAction::Disconnect);
 HudSnapshot s;s.health=72;s.armor=40;s.clip=13;s.reserve=52;s.money=3200;s.aliveTeammates=2;s.deadTeammates=3;s.hasJuggernaut=true;s.juggernautPlatesIntact=4;
 auto h=BuildHud(s,HudConfig{});assert(h.health=="ЗДОРОВЬЕ 72"&&h.armor=="БРОНЯ 40"&&h.ammo=="13 / 52"&&h.money=="$3200"&&h.juggernaut=="ГРОМИЛА: ПЛАСТИНЫ 4/6");
 HudConfig minimal;minimal.showMoney=false;minimal.showTeam=false;auto hm=BuildHud(s,minimal);assert(hm.money.empty()&&hm.team.empty());
}
