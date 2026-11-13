#pragma once
#include "CSSBC_Melee.h"
#include "CSSBC_MeleeCombat.h"
#include <cstdint>
namespace cssbc {
// Adapter contract to implement inside the CS:S server game DLL.
class SdkMeleeModeHooks {
public:
    virtual ~SdkMeleeModeHooks()=default;
    // Invoke from validated server command; only Queue, never touch live weapons.
    virtual void QueueMode(MeleeMode mode)=0;
    // Invoke from the ordinary next-round start hook (not round end).
    virtual bool ApplyQueuedModeAtRoundStart(uint32_t roundNumber)=0;
    // Fists: SDK implementation creates/equips the dedicated fists weapon.
    virtual void EquipFists(int playerEntIndex)=0;
    virtual void EquipKnifeOnly(int playerEntIndex)=0;
    virtual void RestoreNormalLoadout(int playerEntIndex)=0;
};
// Client command must be registered to a server-side handler and restricted
// to valid players/admin policy. Accepted values: normal, knife, fists.
// Current-round inventory is not modified by QueueMode.
}
