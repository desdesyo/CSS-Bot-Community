#include "CSSBC_Combat.h"
#include <algorithm>
#include <cmath>
namespace cssbc {
HitResult CombatResolver::Resolve(JuggernautArmor& armor,Plate p,float raw,float absorb,float exposed){
 HitResult r; if(raw<=0)return r;
 const auto before=armor.Get(p);
 const bool wasBroken=before.broken;
 const float factor=std::clamp(absorb,0.f,1.f);
 const float armorPart=wasBroken?0.f:raw*factor;
 const float healthPart=wasBroken?raw*exposed:raw*(1.f-factor);
 r.armorDamage=armorPart;
 r.broken=armor.ApplyHit(p,armorPart);
 r.cracked=!wasBroken&&!r.broken&&armor.Get(p).integrity<0.35f;
 r.healthDamage=healthPart;
 if(wasBroken) r.healthDamage=raw*exposed;
 return r;
}
void PlateLearning::Observe(Plate p,float damage,float now){
 auto&e=evidence_[(size_t)p]; e.score=std::min(20.f,e.score+std::max(0.f,damage)*0.08f+0.15f);e.lastSeen=now;
}
float PlateLearning::Confidence(Plate p,float now)const{
 const auto&e=evidence_[(size_t)p]; if(e.score<=0)return 0;
 const float age=std::max(0.f,now-e.lastSeen);
 return std::clamp((e.score/(e.score+2.f))*std::exp(-age/18.f),0.f,1.f);
}
Plate PlateLearning::Recommend(float now,uint32_t seed)const{
 // Weighted roulette: learned zones are more likely, but never guaranteed.
 std::array<float,(size_t)Plate::Count>w{};float sum=0;
 for(size_t i=0;i<w.size();++i){w[i]=0.15f+Confidence((Plate)i,now);sum+=w[i];}
 seed=seed*1664525u+1013904223u;float pick=(float(seed>>8)/16777216.f)*sum;
 for(size_t i=0;i<w.size();++i){if(pick<w[i])return (Plate)i;pick-=w[i];}
 return Plate::Chest;
}
}
