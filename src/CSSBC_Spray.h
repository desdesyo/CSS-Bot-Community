#pragma once
#include <array>
#include <cstdint>
#include <string_view>
namespace cssbc {
enum class WeaponId : uint8_t { AK12, M4Sopmod, AUGA3, SG553, FamasG2, GalilAce, MP5MLI, APC9, MAC10, AWPAX, Count };
struct RecoilPoint { float pitch=0.f, yaw=0.f; };
struct SprayProfile {
 WeaponId id{}; std::string_view name;
 float kickScale=1.f, horizontalScale=1.f, recoveryPerSecond=8.f;
 float standingSpread=1.f, movingSpread=2.f, crouchSpread=.65f;
 uint16_t burstResetMs=260;
 std::array<RecoilPoint,30> pattern{};
};
struct SprayState { uint8_t shot=0; float pitch=0.f,yaw=0.f,lastShotTime=0.f; bool initialized=false; };
struct SprayOutput { float pitch=0.f,yaw=0.f,spread=0.f; uint8_t shotIndex=0; };
const SprayProfile& GetSprayProfile(WeaponId weapon);
SprayOutput FireSpray(WeaponId weapon,SprayState& state,float nowSeconds,bool moving,bool crouching,float skill=1.f);
void RecoverSpray(SprayState& state,float nowSeconds,const SprayProfile& profile);
void ResetSpray(SprayState& state);
}
