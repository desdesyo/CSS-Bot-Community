#include "CSSBC_ModelRoster.h"
#include <cassert>
#include <set>
#include <string>
int main() {
    using namespace cssbc;
    assert(kPlayerModels.size() == 27);
    std::set<std::string> paths;
    for (const auto& model : kPlayerModels) {
        assert(!model.modelPath.empty());
        assert(paths.insert(std::string(model.modelPath)).second);
        assert(FindPlayerModel(model.id) == &model);
    }
    for (Faction faction : {Faction::Terrorist, Faction::CounterTerrorist}) {
        assert(FindSupportModel(faction, 'A', 0));
        assert(FindSupportModel(faction, 'A', 1));
        assert(!FindSupportModel(faction, 'A', 2));
        assert(FindSupportModel(faction, 'B', 2));
        assert(FindSupportModel(faction, 'C', 1));
        assert(!FindSupportModel(faction, 'C', 2));
    }
    assert(FindPlayerModel(CharacterId::Juggernaut)->juggernaut);
    assert(!FindSupportModel(Faction::Special, 'A', 0));
    return 0;
}
