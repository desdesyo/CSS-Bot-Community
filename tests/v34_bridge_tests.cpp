#include "CSSBC_V34Bridge.h"
#include <cassert>
using namespace cssbc::v34;

static BotResult Create(const BotRequest*, BotHandle*) { return BotResult::Ok; }
static BotResult Remove(const BotHandle*) { return BotResult::Ok; }
static std::uint32_t Count() { return 3; }

int main() {
  GameDllApi api{kBridgeAbi, sizeof(GameDllApi), Create, Remove, Count};
  assert(ValidateApi(&api) == BotResult::Ok);
  assert(ValidateApi(nullptr) == BotResult::UnsupportedAbi);
  auto badAbi = api; badAbi.abi++;
  assert(ValidateApi(&badAbi) == BotResult::UnsupportedAbi);
  auto shortApi = api; shortApi.structSize = sizeof(GameDllApi)-1;
  assert(ValidateApi(&shortApi) == BotResult::UnsupportedAbi);
  auto missing = api; missing.CreateBot = nullptr;
  assert(ValidateApi(&missing) == BotResult::UnsupportedAbi);

  BotRequest request{"CSSBC bot", Team::Terrorist, nullptr, 50, 7};
  assert(ValidateRequest(&request) == BotResult::Ok);
  assert(ValidateRequest(nullptr) == BotResult::InvalidName);
  auto noName=request; noName.name=nullptr;
  assert(ValidateRequest(&noName) == BotResult::InvalidName);
  auto empty=request; empty.name="";
  assert(ValidateRequest(&empty) == BotResult::InvalidName);
  auto longName=request; longName.name="01234567890123456789012345678901";
  assert(ValidateRequest(&longName) == BotResult::InvalidName);
  auto badTeam=request; badTeam.team=Team::Spectator;
  assert(ValidateRequest(&badTeam) == BotResult::InvalidTeam);
  auto badSkill=request; badSkill.skill=101;
  assert(ValidateRequest(&badSkill) == BotResult::InvalidSkill);
  return 0;
}
