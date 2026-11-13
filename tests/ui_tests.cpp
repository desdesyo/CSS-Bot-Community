#include "CSSBC_UI.h"
#include "CSSBC_Localization.h"
#include <cassert>
using namespace cssbc;

int main() {
    assert(Ru(LocaleKey::MenuPlay) == "Играть");
    auto ct = VoiceLines(Faction::CounterTerrorists, VoiceContext::RookieTease);
    assert(ct.size() >= 3 && ct[0].text.find("Новенький") != std::string_view::npos);
    auto t = VoiceLines(Faction::Terrorists, VoiceContext::Ideology);
    assert(t.size() >= 3);

    MenuController menu;
    auto main = menu.Build(MenuPage::Main, false, true);
    assert(main.items.size() == 7 && main.items[0].label == "ИГРАТЬ");
    assert(menu.Navigate(MenuPage::Main, MenuAction::OpenCSSBC) == MenuPage::CSSBC);

    auto submenu = menu.Build(MenuPage::CSSBC, false, false);
    assert(submenu.items.size() == 5);
    assert(menu.Navigate(MenuPage::CSSBC, MenuAction::OpenMVP) == MenuPage::MVP);

    auto ranks = RankMVP({{1, "A", 2.f}, {2, "B", 8.f}, {3, "C", 4.f}});
    assert(ranks[0].player == 2 && ranks[2].player == 1);

    auto connected = menu.Build(MenuPage::Main, true, false);
    assert(connected.items.back().action == MenuAction::Disconnect);

    HudSnapshot snapshot;
    snapshot.health = 72;
    snapshot.armor = 40;
    snapshot.clip = 13;
    snapshot.reserve = 52;
    snapshot.money = 3200;
    snapshot.aliveTeammates = 2;
    snapshot.deadTeammates = 3;
    snapshot.hasJuggernaut = true;
    snapshot.juggernautPlatesIntact = 4;
    auto hud = BuildHud(snapshot, HudConfig{});
    assert(hud.health == "ЗДОРОВЬЕ 72" && hud.armor == "БРОНЯ 40");
    assert(hud.ammo == "13 / 52" && hud.money == "$3200");
    assert(hud.juggernaut == "ГРОМИЛА: ПЛАСТИНЫ 4/6");

    HudConfig minimal;
    minimal.showMoney = false;
    minimal.showTeam = false;
    auto minimalHud = BuildHud(snapshot, minimal);
    assert(minimalHud.money.empty() && minimalHud.team.empty());
}
