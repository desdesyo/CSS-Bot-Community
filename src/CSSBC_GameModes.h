#pragma once
#include <cstdint>
namespace cssbc {
enum class GameMode:uint8_t { Classic, Deathmatch, ArmsRace, Tactical, Juggernaut };
struct ModeRules { int roundTime=90,freezeTime=10,roundsToWin=16,startingMoney=800,killReward=300; bool bomb=true,respawn=false,armorPlates=false; };
ModeRules RulesFor(GameMode);
}
