#pragma once
#include <string>
#include <string_view>
#include <vector>
#include <cstdint>

namespace cssbc {
enum class LocaleKey : std::uint16_t {
 MenuPlay, MenuNewMatch, MenuResume, MenuCSSBC, MenuSettings, MenuExtras,
 MenuServers, MenuDisconnect, MenuStart, MenuBack,
 HudHealth, HudArmor, HudAmmo, HudMoney, HudAlive, HudDead, HudJuggernaut,
 StatusConnected, StatusDisconnected, StatusLoading, StatusRoundStart,
 StatusRoundEnd, StatusBombPlanted, StatusBombDefused, StatusHostageRescued,
 StatusHostageLost, StatusWin, StatusLose, StatusDraw
};
std::string_view Ru(LocaleKey key);
enum class Faction : std::uint8_t { CounterTerrorists, Terrorists };
enum class VoiceMood : std::uint8_t { Calm, Combat, Stress, Victory, Loss, Tease, Support };
enum class VoiceContext : std::uint8_t { Acknowledge, Contact, Reload, Cover, Bomb, Defuse, Retreat, Praise, RookieTease, Rally, Fear, Ideology, Order, Casualty };
struct VoiceLine { std::string_view text; VoiceMood mood; };
std::vector<VoiceLine> VoiceLines(Faction faction, VoiceContext context);
}
