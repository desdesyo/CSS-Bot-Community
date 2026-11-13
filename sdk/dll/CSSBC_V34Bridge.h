#pragma once
// CSS Bot Community <-> custom Counter-Strike: Source v34 GameDLL bridge.
// This is deliberately separate from IServerPluginCallbacks: a VSP cannot
// initialize CBasePlayer/CSS player state by itself.
#include <cstdint>

namespace cssbc::v34 {
static constexpr std::uint32_t kBridgeAbi = 0x00010000;

enum class Team : std::uint8_t { Unassigned=0, Spectator=1, Terrorist=2, CounterTerrorist=3 };
enum class BotResult : std::uint8_t {
  Ok=0, InvalidName, InvalidTeam, SlotUnavailable, EntityCreationFailed,
  PlayerInitializationFailed, SpawnFailed, NotFound, InvalidSkill, UnsupportedAbi
};

struct BotRequest {
  const char* name;                 // UTF-8, 1..31 bytes
  Team team;
  const char* model;                // optional model path relative to game
  std::uint32_t skill;              // 0..100
  std::uint32_t personality;        // roster personality ID
};

struct BotHandle {
  std::uint32_t userId;
  std::uint16_t entityIndex;
  std::uint16_t generation;          // protects against edict slot reuse
};

// Functions are implemented on the GameDLL side, where player allocation,
// team assignment, spawn and removal are legal and correctly initialized.
struct GameDllApi {
  std::uint32_t abi;
  std::uint32_t structSize;
  BotResult (*CreateBot)(const BotRequest*, BotHandle*);
  BotResult (*RemoveBot)(const BotHandle*);
  std::uint32_t (*BotCount)();
};

// GameDLL exports this interface under the exact name below through its
// CreateInterface registry. VSP must resolve it from the server GameDLL,
// validate ABI/size, and never call engine CreateFakeClient as a substitute.
static constexpr const char* kInterfaceName = "CSSBC_V34_GAME_DLL_001";
}
