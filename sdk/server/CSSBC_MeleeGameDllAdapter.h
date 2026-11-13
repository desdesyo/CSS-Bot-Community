#pragma once
#include "CSSBC_MeleeSdkRuntime.h"
namespace cssbc {
// Minimal host-facing adapter. CS:S DLL supplies player snapshots, hull traces,
// inventory/damage operations, and calls these methods from engine hooks.
class MeleeGameDllAdapter {
public:
 void OnModeCommand(MeleeMode mode){runtime_.Queue(mode);}
 bool OnRoundStart(uint32_t round){return runtime_.OnNaturalRoundStart(round);}
 MeleeMode CurrentMode()const{return runtime_.ActiveMode();}
 MeleeAttackResult OnAttackInput(const MeleePlayerFrame&p){return runtime_.TryAttack(p);}
 MeleeAttackResult OnAttackImpact(const MeleePlayerFrame&p,const MeleeTargetFrame&t){return runtime_.Impact(p,t);}
 void OnPlayerRemoved(int entIndex){runtime_.ResetPlayer(entIndex);}
private:MeleeSdkRuntime runtime_{};
};
}
