#pragma once
#include "CSSBC_Juggernaut.h"
#include "CSSBC_TeamMemory.h"
#include <array>
namespace cssbc {
struct HitResult { float healthDamage=0, armorDamage=0; bool cracked=false, broken=false; };
class CombatResolver {
public:
 // Armor absorbs a configurable share until the plate fails; exposed zones hurt more.
 HitResult Resolve(JuggernautArmor& armor, Plate plate, float rawDamage,
                   float armorAbsorb=0.72f, float exposedMultiplier=1.35f);
};
class PlateLearning {
public:
 // Each bot accumulates evidence from observed hits. Confidence grows with repetition,
 // decays when evidence is old, and selects a plate probabilistically via weighted score.
 void Observe(Plate plate, float damage, float now);
 float Confidence(Plate plate, float now) const;
 Plate Recommend(float now, uint32_t seed) const;
private:
 struct Evidence { float score=0,lastSeen=0; };
 std::array<Evidence,(size_t)Plate::Count> evidence_{};
};
}
