#pragma once
#include "CSSBC_MeleeCombat.h"
#include <cstdint>
#include <vector>
namespace cssbc {
// Portable adapter-side orchestration; engine callbacks implement traces,
// inventory and damage. This is suitable to embed in a CS:S server DLL.
struct MeleePlayerFrame {
 int entIndex{-1}; MeleeFaction faction{MeleeFaction::CT}; bool alive{false};
 bool grounded{true}; bool hasEnemy{false}; float now{0.f}; float skill{.5f};
};
struct MeleeTargetFrame { int entIndex{-1}; float distance{0}; bool inFront{false}; bool friendly{false}; };
class MeleeSdkRuntime {
public:
 void Queue(MeleeMode mode){modes_.Queue(mode);}
 bool OnNaturalRoundStart(uint32_t round){return modes_.OnRoundStart(round);}
 MeleeMode ActiveMode()const{return modes_.Active();}
 MeleeModeSnapshot ModeSnapshot()const{return modes_.Snapshot();}
 MeleeAttackResult TryAttack(const MeleePlayerFrame& player);
 MeleeAttackResult Impact(const MeleePlayerFrame& player,const MeleeTargetFrame& target);
 void ResetPlayer(int entIndex);
private:
 MeleeModeController modes_{};
 // Stable slot mapping is handled by game DLL; runtime map keys entity index.
 struct Slot {int entIndex;MeleeCombatant combat;Slot(int id,uint32_t seed):entIndex(id),combat(seed){}};
 std::vector<Slot> players_{};
 MeleeCombatant* Find(int entIndex);
};
}
