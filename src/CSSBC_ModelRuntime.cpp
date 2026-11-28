#include "CSSBC_ModelRuntime.h"
namespace cssbc {
bool ApplyPlayerModel(IPlayerModelAdapter& adapter, int entityIndex, CharacterId character) noexcept {
    if (entityIndex < 0) return false;
    const auto* model = FindPlayerModel(character);
    return model && adapter.SetPlayerModel(entityIndex, model->modelPath);
}
bool ApplySupportPlayerModel(IPlayerModelAdapter& adapter, int entityIndex, Faction faction, char tier, std::size_t slot) noexcept {
    if (entityIndex < 0) return false;
    const auto* model = FindSupportModel(faction, tier, slot);
    return model && adapter.SetPlayerModel(entityIndex, model->modelPath);
}
}
