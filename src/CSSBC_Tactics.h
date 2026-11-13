#pragma once
#include "CSSBC_Types.h"
#include <cstdint>

namespace cssbc {
enum class BotRole : uint8_t { Entry, Support, Anchor, Sniper, IGL };
enum class TacticalAction : uint8_t { Hold, Advance, TakeCover, Retreat, TradeKill, Rotate, Plant, Defuse, SupportFire };
struct TacticalInput {
  BotRole role=BotRole::Entry;
  float health=100, armor=0, distanceToThreat=1200, threatPressure=0;
  int alliesNearby=0, enemiesKnown=0, secondsLeft=90;
  bool seesThreat=false, hasCover=false, bombCarried=false, bombPlanted=false;
  bool siteThreatened=false, teammateRecentlyKilled=false, canTrade=false;
  float objectiveDistance=0;
};
struct TacticalOutput { TacticalAction action=TacticalAction::Hold; float urgency=0; const char* reason=""; };
// Pure decision function: deterministic, allocation-free, easy to bind to Source SDK bot entities.
TacticalOutput DecideTactics(const Traits& traits,const TacticalInput& in);
}
