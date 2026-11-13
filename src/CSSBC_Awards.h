#pragma once
#include <cstdint>
#include <string>
#include <vector>
#include <unordered_map>
namespace cssbc {
enum class AwardTrigger:uint8_t { Kill, Headshot, Assist, Trade, BombPlant, BombDefuse, Rescue, CoverSave, GrenadeMulti, Wallbang, Clutch, SurviveRound, EntryFrag, Retake, PerfectDefense, ScoutCallout, DamageDealt, DamageTaken, FriendlyFire, TeamKill, AFK };
enum class AwardKind:uint8_t { Medal, Achievement, MapCommendation, Penalty };
struct AwardDef { const char* id; const char* title; const char* description; AwardKind kind; AwardTrigger trigger; int threshold=1; int xp=0; int money=0; };
struct AwardEvent { int player=-1,round=-1; AwardTrigger trigger{}; float value=1; bool enemy=false, teammate=false, objective=false; };
struct AwardResult { const AwardDef* award=nullptr; int xp=0,money=0; };
const std::vector<AwardDef>& AwardCatalog();
class AwardEngine {
public:
 std::vector<AwardResult> Process(const AwardEvent&);
 int XP(int player)const; int MapScore(int player)const;
 void ResetMatch();
private:
 std::unordered_map<int,int> xp_,mapScore_;
 std::unordered_map<int,int> progress_;
 std::unordered_map<int,bool> unlocked_;
};
}
