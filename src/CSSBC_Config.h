#pragma once
#include "CSSBC_Types.h"
#include "CSSBC_GameModes.h"
#include "CSSBC_UI.h"
namespace cssbc {
struct ProjectConfig { GameMode mode=GameMode::Classic; Traits botTraits{}; HudConfig hud{}; float botDifficulty=0.5f; bool friendlyFire=false,showMvp=true,adaptiveEconomy=true; };
bool ValidateConfig(const ProjectConfig&,const char** error=nullptr);
}
