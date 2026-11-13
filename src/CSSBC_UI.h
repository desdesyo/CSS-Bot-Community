#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace cssbc {
enum class MenuPage { Main, Play, NewMatch, CSSBC, Settings, Extras, ServerBrowser, MVP, BotSettings, WeaponSettings, MapSettings };
enum class MenuAction { OpenPlay, OpenNewMatch, ResumeLastSetup, OpenCSSBC, OpenSettings, OpenExtras, OpenServerBrowser, Connect, Disconnect, Back, OpenMVP, OpenBotSettings, OpenWeaponSettings, OpenMapSettings, ApplySettings };
struct MenuItem { std::string id, label; MenuAction action; };
struct MenuModel { MenuPage page{MenuPage::Main}; std::vector<MenuItem> items; };
struct MVPEntry { int player=-1; std::string name; float score=0; };
std::vector<MVPEntry> RankMVP(const std::vector<MVPEntry>& entries);

// Engine-independent menu navigation model. Source VGUI panels render this model.
class MenuController {
public:
 MenuModel Build(MenuPage page, bool connected, bool hasLastSetup) const;
 MenuPage Navigate(MenuPage current, MenuAction action) const;
};

struct HudSnapshot {
 int health{100}, armor{0}, clip{0}, reserve{0}, money{800};
 int aliveTeammates{0}, deadTeammates{0};
 bool hasJuggernaut{false};
 int juggernautPlatesIntact{6};
 std::string contextualMessage;
};
struct HudConfig {
 bool showHealth{true}, showArmor{true}, showAmmo{true}, showMoney{true}, showTeam{true};
 int crosshairSize{3}, crosshairGap{2}, crosshairThickness{1};
 std::uint32_t crosshairRgb{0x00FF00}; // classic green, RGB
 bool crosshairDot{false};
};
struct HudView {
 std::string health, armor, ammo, money, team, juggernaut, message;
};
HudView BuildHud(const HudSnapshot& state, const HudConfig& config);
}
