#pragma once
#include <string>
#include <unordered_map>

namespace cssbc::sdk {

enum class BotFaction { Terrorist, CounterTerrorist, Juggernaut };
enum class SupportTier { None, Group1, Group2, Group3 };

struct BotVisualProfile {
    std::string rosterId;
    BotFaction faction{BotFaction::Terrorist};
    SupportTier tier{SupportTier::None};
    std::string modelPath;
    std::string materialSet;
    std::string weaponSet;
};

struct WeaponVisualProfile {
    std::string classname;
    std::string worldModel;
    std::string viewModel;
    std::string materialSet;
    std::string muzzleAttachment{"muzzle"};
};

// Explicit registration: avoids accidental path construction and random fallback models.
class CSSBCVisualRegistry {
public:
    bool RegisterBot(BotVisualProfile p) {
        if (p.rosterId.empty() || p.modelPath.empty()) return false;
        return bots_.emplace(p.rosterId, std::move(p)).second;
    }
    bool RegisterWeapon(WeaponVisualProfile p) {
        if (p.classname.empty() || p.worldModel.empty()) return false;
        return weapons_.emplace(p.classname, std::move(p)).second;
    }
    const BotVisualProfile* Bot(const std::string& id) const {
        auto it = bots_.find(id); return it == bots_.end() ? nullptr : &it->second;
    }
    const WeaponVisualProfile* Weapon(const std::string& classname) const {
        auto it = weapons_.find(classname); return it == weapons_.end() ? nullptr : &it->second;
    }
    std::size_t BotCount() const { return bots_.size(); }
    std::size_t WeaponCount() const { return weapons_.size(); }
private:
    std::unordered_map<std::string, BotVisualProfile> bots_;
    std::unordered_map<std::string, WeaponVisualProfile> weapons_;
};

} // namespace cssbc::sdk
