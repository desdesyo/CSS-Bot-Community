#include "CSSBC_UI.h"
#include <cassert>
using namespace cssbc;
int main(){
 MenuController menu;auto main=menu.Build(MenuPage::Main,false,true);
 assert(main.items.size()==7&&main.items[0].label=="ИГРАТЬ");
 assert(menu.Navigate(MenuPage::Main,MenuAction::OpenCSSBC)==MenuPage::CSSBC);
 auto connected=menu.Build(MenuPage::Main,true,false);assert(connected.items.back().action==MenuAction::Disconnect);
 HudSnapshot s;s.health=72;s.armor=40;s.clip=13;s.reserve=52;s.money=3200;s.aliveTeammates=2;s.deadTeammates=3;s.hasJuggernaut=true;s.juggernautPlatesIntact=4;
 auto h=BuildHud(s,HudConfig{});assert(h.health=="ЗДОРОВЬЕ 72"&&h.armor=="БРОНЯ 40"&&h.ammo=="13 / 52"&&h.money=="$3200"&&h.juggernaut=="ГРОМИЛА: ПЛАСТИНЫ 4/6");
 HudConfig minimal;minimal.showMoney=false;minimal.showTeam=false;auto hm=BuildHud(s,minimal);assert(hm.money.empty()&&hm.team.empty());
}
