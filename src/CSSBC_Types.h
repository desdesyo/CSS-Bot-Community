#pragma once
#include <array>
#include <cstdint>
#include <string>
#include <vector>
namespace cssbc {
enum class SupportTier:uint8_t{Recon1000,Tactical3000,Squad9000,Juggernaut16000};
enum class Plate:uint8_t{Helmet,Chest,LeftArm,RightArm,LeftLeg,RightLeg,Count};
enum class EventKind:uint8_t{Damage,PlateCracked,PlateBroken,Callout,Death,BombAction,Rescue,CoverFire,SupportBought};
struct Traits{float courage=.5f,trust=.5f,teamwork=.5f,discipline=.5f,independence=.5f,adaptability=.5f;};
struct PlateState{float integrity=1.f;bool broken=false;float exposure=0.f;};
struct MemoryEntry{EventKind kind{};int actor=-1,target=-1;Plate plate=Plate::Chest;float confidence=.5f,time=0.f;std::string message;};
struct Callout{int sender=-1;Plate plate=Plate::Chest;float confidence=.5f;std::string text;};
struct SupportConfig{int price=0,deadAlliesRequired=0;bool autonomous=false;int units=0;};
inline constexpr std::array<SupportConfig,4> kSupport{{{1000,0,false,1},{3000,0,false,1},{9000,0,true,4},{16000,3,true,1}}};
}