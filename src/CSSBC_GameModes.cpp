#include "CSSBC_GameModes.h"
namespace cssbc {
ModeRules RulesFor(GameMode m){ModeRules r;switch(m){
case GameMode::Classic:break;
case GameMode::Deathmatch:r.roundTime=600;r.freezeTime=0;r.roundsToWin=0;r.respawn=true;r.bomb=false;r.killReward=100;break;
case GameMode::ArmsRace:r.roundTime=600;r.freezeTime=0;r.roundsToWin=0;r.respawn=true;r.bomb=false;r.killReward=0;break;
case GameMode::Tactical:r.roundTime=75;r.freezeTime=8;r.roundsToWin=12;r.startingMoney=1200;r.killReward=250;break;
case GameMode::Juggernaut:r.roundTime=90;r.freezeTime=10;r.roundsToWin=16;r.armorPlates=true;r.killReward=300;break;
}return r;}
}
