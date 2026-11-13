#pragma once
#include <cstdint>
namespace cssbc {
enum class MeleeMode : uint8_t { Normal, Knife, Fists };
enum class Faction : uint8_t { CT, T };
enum class MeleeMove : uint8_t { Jab, Cross, Hook, Uppercut, KnifeStab, KnifeSlash, ReverseSlash, Lunge };
struct MeleeProfile { float range, damage, windup, recovery; bool heavy; };
struct MeleeAction { MeleeMove move; MeleeProfile profile; uint8_t animationVariant; };
struct MeleeState { uint32_t sequence=0; float nextAttackAt=0; };
MeleeAction SelectMeleeAction(MeleeMode mode,Faction faction,MeleeState& state,uint32_t playerSeed,float now,float skill);
bool CanMeleeAttack(const MeleeState& state,float now);
}
