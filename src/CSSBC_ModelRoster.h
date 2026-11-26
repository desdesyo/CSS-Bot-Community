#pragma once
#include <array>
#include <cstddef>
#include <cstdint>
#include <string_view>

namespace cssbc {
enum class Faction : uint8_t { Terrorist, CounterTerrorist, Special };
enum class CharacterId : uint8_t {
    TRaider, TInsurgent, TSaboteur, TRifleman, TBreacher, TScout,
    CTAssault, CTRecon, CTPointman, CTEngineer, CTMarksman, CTVeteran,
    SupportTA1, SupportTA2, SupportTB1, SupportTB2, SupportTSniper, SupportTC1, SupportTC2,
    SupportCTA1, SupportCTA2, SupportCTB1, SupportCTB2, SupportCTSniper, SupportCTC1, SupportCTC2,
    Juggernaut
};
struct PlayerModelDefinition {
    CharacterId id;
    Faction faction;
    std::string_view modelPath;
    bool support;
    bool juggernaut;
};
inline constexpr std::array<PlayerModelDefinition, 27> kPlayerModels{{
    {CharacterId::TRaider, Faction::Terrorist, "models/cssbc/player/t_raider.mdl", false, false},
    {CharacterId::TInsurgent, Faction::Terrorist, "models/cssbc/player/t_insurgent.mdl", false, false},
    {CharacterId::TSaboteur, Faction::Terrorist, "models/cssbc/player/t_saboteur.mdl", false, false},
    {CharacterId::TRifleman, Faction::Terrorist, "models/cssbc/player/t_rifleman.mdl", false, false},
    {CharacterId::TBreacher, Faction::Terrorist, "models/cssbc/player/t_breacher.mdl", false, false},
    {CharacterId::TScout, Faction::Terrorist, "models/cssbc/player/t_scout.mdl", false, false},
    {CharacterId::CTAssault, Faction::CounterTerrorist, "models/cssbc/player/ct_assault.mdl", false, false},
    {CharacterId::CTRecon, Faction::CounterTerrorist, "models/cssbc/player/ct_recon.mdl", false, false},
    {CharacterId::CTPointman, Faction::CounterTerrorist, "models/cssbc/player/ct_pointman.mdl", false, false},
    {CharacterId::CTEngineer, Faction::CounterTerrorist, "models/cssbc/player/ct_engineer.mdl", false, false},
    {CharacterId::CTMarksman, Faction::CounterTerrorist, "models/cssbc/player/ct_marksman.mdl", false, false},
    {CharacterId::CTVeteran, Faction::CounterTerrorist, "models/cssbc/player/ct_veteran.mdl", false, false},
    {CharacterId::SupportTA1, Faction::Terrorist, "models/cssbc/player/support_t_a1.mdl", true, false},
    {CharacterId::SupportTA2, Faction::Terrorist, "models/cssbc/player/support_t_a2.mdl", true, false},
    {CharacterId::SupportTB1, Faction::Terrorist, "models/cssbc/player/support_t_b1.mdl", true, false},
    {CharacterId::SupportTB2, Faction::Terrorist, "models/cssbc/player/support_t_b2.mdl", true, false},
    {CharacterId::SupportTSniper, Faction::Terrorist, "models/cssbc/player/support_t_b_sniper.mdl", true, false},
    {CharacterId::SupportTC1, Faction::Terrorist, "models/cssbc/player/support_t_c1.mdl", true, false},
    {CharacterId::SupportTC2, Faction::Terrorist, "models/cssbc/player/support_t_c2.mdl", true, false},
    {CharacterId::SupportCTA1, Faction::CounterTerrorist, "models/cssbc/player/support_ct_a1.mdl", true, false},
    {CharacterId::SupportCTA2, Faction::CounterTerrorist, "models/cssbc/player/support_ct_a2.mdl", true, false},
    {CharacterId::SupportCTB1, Faction::CounterTerrorist, "models/cssbc/player/support_ct_b1.mdl", true, false},
    {CharacterId::SupportCTB2, Faction::CounterTerrorist, "models/cssbc/player/support_ct_b2.mdl", true, false},
    {CharacterId::SupportCTSniper, Faction::CounterTerrorist, "models/cssbc/player/support_ct_b_sniper.mdl", true, false},
    {CharacterId::SupportCTC1, Faction::CounterTerrorist, "models/cssbc/player/support_ct_c1.mdl", true, false},
    {CharacterId::SupportCTC2, Faction::CounterTerrorist, "models/cssbc/player/support_ct_c2.mdl", true, false},
    {CharacterId::Juggernaut, Faction::Special, "models/cssbc/player/juggernaut.mdl", true, true}
}};
const PlayerModelDefinition* FindPlayerModel(CharacterId id) noexcept;
const PlayerModelDefinition* FindSupportModel(Faction faction, char tier, std::size_t slot) noexcept;
}
