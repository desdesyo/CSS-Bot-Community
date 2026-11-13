#include "CSSBC_V34Bridge.h"
#include <cstring>

namespace cssbc::v34 {
BotResult ValidateApi(const GameDllApi* api) {
  if(!api || api->abi!=kBridgeAbi || api->structSize<sizeof(GameDllApi))
    return BotResult::UnsupportedAbi;
  if(!api->CreateBot || !api->RemoveBot || !api->BotCount)
    return BotResult::UnsupportedAbi;
  return BotResult::Ok;
}
BotResult ValidateRequest(const BotRequest* request) {
  if(!request || !request->name) return BotResult::InvalidName;
  const auto length=std::strlen(request->name);
  if(length==0 || length>31) return BotResult::InvalidName;
  if(request->team!=Team::Terrorist && request->team!=Team::CounterTerrorist)
    return BotResult::InvalidTeam;
  if(request->skill>100) return BotResult::InvalidName;
  return BotResult::Ok;
}
}
