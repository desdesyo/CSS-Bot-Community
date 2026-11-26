#include "CSSBC_ModelRoster.h"
namespace cssbc {
const PlayerModelDefinition* FindPlayerModel(CharacterId id) noexcept {
    for (const auto& model : kPlayerModels) if (model.id == id) return &model;
    return nullptr;
}
const PlayerModelDefinition* FindSupportModel(Faction faction, char tier, std::size_t slot) noexcept {
    if (faction == Faction::Special) return nullptr;
    const bool ct = faction == Faction::CounterTerrorist;
    CharacterId id{};
    switch (tier) {
        case 'A':
            if (slot > 1) return nullptr;
            id = ct ? (slot == 0 ? CharacterId::SupportCTA1 : CharacterId::SupportCTA2)
                    : (slot == 0 ? CharacterId::SupportTA1 : CharacterId::SupportTA2);
            break;
        case 'B':
            if (slot > 2) return nullptr;
            if (ct) id = slot == 0 ? CharacterId::SupportCTB1 : slot == 1 ? CharacterId::SupportCTB2 : CharacterId::SupportCTSniper;
            else id = slot == 0 ? CharacterId::SupportTB1 : slot == 1 ? CharacterId::SupportTB2 : CharacterId::SupportTSniper;
            break;
        case 'C':
            if (slot > 1) return nullptr;
            id = ct ? (slot == 0 ? CharacterId::SupportCTC1 : CharacterId::SupportCTC2)
                    : (slot == 0 ? CharacterId::SupportTC1 : CharacterId::SupportTC2);
            break;
        default: return nullptr;
    }
    return FindPlayerModel(id);
}
}
