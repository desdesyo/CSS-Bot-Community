#pragma once
#include "CSSBC_Types.h"
#include <cstdint>
namespace cssbc {
enum class BotGoal : uint8_t { Hold, Attack, DefendBomb, PlantBomb, Retake, Rescue, Retreat, Follow };
enum class BotOrder : uint8_t { None, Regroup, Push, HoldPosition, Rotate, Cover, Trade, Save };
enum class SquadRole : uint8_t { Leader, Entry, Support, Sniper };
struct TacticalInput {
 int self=-1, teammatesAlive=0, enemiesAlive=0;
 bool bombPlanted=false, bombCarrierKnown=false, bombAtSite=false;
 bool hasEnemySight=false, teammateRecentlyDied=false, lowAmmo=false;
 float health=100.f, secondsLeft=90.f, distanceToObjective=0.f;
};
struct TacticalDecision { BotGoal goal=BotGoal::Hold; BotOrder order=BotOrder::None; float urgency=0.f; const char* reason="default"; };
class TacticalBrain {
 public:
 explicit TacticalBrain(Traits traits={},uint32_t seed=0xC55BCu):traits_(traits),seed_(seed){}
 TacticalDecision Decide(const TacticalInput&) const;
 BotOrder SquadOrder(const TacticalInput&,SquadRole) const;
 private: Traits traits_; uint32_t seed_;
};
}