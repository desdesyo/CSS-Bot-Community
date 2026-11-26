#include "CSSBC_ModelRuntime.h"
#include <cassert>
#include <string>
#include <vector>
struct FakeModelAdapter final : cssbc::IPlayerModelAdapter {
    int entity = -1;
    std::string path;
    bool SetPlayerModel(int index, std::string_view modelPath) override {
        entity = index;
        path = std::string(modelPath);
        return true;
    }
};
int main() {
    using namespace cssbc;
    FakeModelAdapter adapter;
    assert(ApplyPlayerModel(adapter, 14, CharacterId::Juggernaut));
    assert(adapter.entity == 14);
    assert(adapter.path == "models/cssbc/player/juggernaut.mdl");
    assert(ApplySupportPlayerModel(adapter, 22, Faction::Terrorist, 'B', 2));
    assert(adapter.entity == 22);
    assert(adapter.path == "models/cssbc/player/support_t_b_sniper.mdl");
    assert(!ApplySupportPlayerModel(adapter, 22, Faction::Special, 'A', 0));
    assert(!ApplyPlayerModel(adapter, -1, CharacterId::TRaider));
    return 0;
}
