#include "CSSBC_UI.h"
#include <algorithm>
#include <sstream>

namespace cssbc {
MenuModel MenuController::Build(MenuPage page, bool connected, bool hasLastSetup) const {
    MenuModel model;
    model.page = page;
    auto add = [&](const char* id, const char* label, MenuAction action) {
        model.items.push_back({id, label, action});
    };

    switch (page) {
    case MenuPage::Main:
        add("play", "ИГРАТЬ", MenuAction::OpenPlay);
        add("new_match", "НАЧАТЬ МАТЧ", MenuAction::OpenNewMatch);
        if (hasLastSetup) add("resume", "ПРОДОЛЖИТЬ", MenuAction::ResumeLastSetup);
        add("cssbc", "CSS BOT COMMUNITY", MenuAction::OpenCSSBC);
        add("settings", "НАСТРОЙКИ", MenuAction::OpenSettings);
        add("extras", "ДОПОЛНИТЕЛЬНО", MenuAction::OpenExtras);
        add("servers", "СПИСОК СЕРВЕРОВ", MenuAction::OpenServerBrowser);
        if (connected) add("disconnect", "ОТКЛЮЧИТЬСЯ", MenuAction::Disconnect);
        break;
    case MenuPage::Play:
        add("new_match", "НАЧАТЬ МАТЧ", MenuAction::OpenNewMatch);
        add("servers", "СПИСОК СЕРВЕРОВ", MenuAction::OpenServerBrowser);
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::NewMatch:
        add("start", "НАЧАТЬ", MenuAction::OpenNewMatch);
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::CSSBC:
        add("mvp", "MVP / РЕЙТИНГ", MenuAction::OpenMVP);
        add("bots", "НАСТРОЙКИ БОТОВ", MenuAction::OpenBotSettings);
        add("weapons", "ОРУЖИЕ / БАЛАНС", MenuAction::OpenWeaponSettings);
        add("maps", "КАРТЫ / ГРАФИКА", MenuAction::OpenMapSettings);
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::MVP:
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::BotSettings:
    case MenuPage::WeaponSettings:
    case MenuPage::MapSettings:
        add("apply", "ПРИМЕНИТЬ", MenuAction::ApplySettings);
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::Settings:
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::Extras:
        add("back", "НАЗАД", MenuAction::Back);
        break;
    case MenuPage::ServerBrowser:
        add("connect", "ПОДКЛЮЧИТЬСЯ", MenuAction::Connect);
        add("back", "НАЗАД", MenuAction::Back);
        break;
    }
    return model;
}

MenuPage MenuController::Navigate(MenuPage current, MenuAction action) const {
    switch (action) {
    case MenuAction::OpenPlay: return MenuPage::Play;
    case MenuAction::OpenNewMatch: return MenuPage::NewMatch;
    case MenuAction::OpenCSSBC: return MenuPage::CSSBC;
    case MenuAction::OpenSettings: return MenuPage::Settings;
    case MenuAction::OpenExtras: return MenuPage::Extras;
    case MenuAction::OpenServerBrowser: return MenuPage::ServerBrowser;
    case MenuAction::OpenMVP: return MenuPage::MVP;
    case MenuAction::OpenBotSettings: return MenuPage::BotSettings;
    case MenuAction::OpenWeaponSettings: return MenuPage::WeaponSettings;
    case MenuAction::OpenMapSettings: return MenuPage::MapSettings;
    case MenuAction::Back: return MenuPage::Main;
    default: return current;
    }
}

std::vector<MVPEntry> RankMVP(const std::vector<MVPEntry>& entries) {
    auto ranked = entries;
    std::stable_sort(ranked.begin(), ranked.end(),
        [](const MVPEntry& a, const MVPEntry& b) { return a.score > b.score; });
    return ranked;
}

HudView BuildHud(const HudSnapshot& state, const HudConfig& config) {
    HudView view;
    const auto nonNegative = [](int value) { return std::max(0, value); };
    if (config.showHealth) view.health = "ЗДОРОВЬЕ " + std::to_string(nonNegative(state.health));
    if (config.showArmor) view.armor = "БРОНЯ " + std::to_string(nonNegative(state.armor));
    if (config.showAmmo) view.ammo = std::to_string(nonNegative(state.clip)) + " / " + std::to_string(nonNegative(state.reserve));
    if (config.showMoney) view.money = "$" + std::to_string(nonNegative(state.money));
    if (config.showTeam) {
        view.team = "В СТРОЮ " + std::to_string(nonNegative(state.aliveTeammates))
            + " · ПОГИБЛИ " + std::to_string(nonNegative(state.deadTeammates));
    }
    if (state.hasJuggernaut) {
        view.juggernaut = "ГРОМИЛА: ПЛАСТИНЫ "
            + std::to_string(std::clamp(state.juggernautPlatesIntact, 0, 6)) + "/6";
    }
    view.message = state.contextualMessage;
    return view;
}
}
