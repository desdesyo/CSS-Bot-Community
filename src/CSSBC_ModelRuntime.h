#pragma once
#include "CSSBC_ModelRoster.h"
namespace cssbc {
// Implemented by the eventual CS:S v34 entity adapter using the engine's SetModel API.
class IPlayerModelAdapter {
public:
    virtual ~IPlayerModelAdapter() = default;
    virtual bool SetPlayerModel(int entityIndex, std::string_view modelPath) = 0;
};
bool ApplyPlayerModel(IPlayerModelAdapter& adapter, int entityIndex, CharacterId character) noexcept;
bool ApplySupportPlayerModel(IPlayerModelAdapter& adapter, int entityIndex, Faction faction, char tier, std::size_t slot) noexcept;
}
