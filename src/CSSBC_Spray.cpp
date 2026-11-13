#include "CSSBC_Spray.h"
#include <algorithm>
#include <cmath>
namespace cssbc {
namespace {
constexpr RecoilPoint P(float p,float y){return {p,y};}
constexpr std::array<RecoilPoint,30> rifleAK{{
P(1.05f,0),P(1.12f,-.22f),P(1.18f,-.35f),P(1.25f,-.48f),P(1.32f,-.20f),P(1.38f,.12f),P(1.42f,.42f),P(1.48f,.62f),P(1.52f,.35f),P(1.55f,.08f),
P(1.58f,-.28f),P(1.62f,-.58f),P(1.66f,-.78f),P(1.7f,-.42f),P(1.72f,.05f),P(1.75f,.48f),P(1.78f,.82f),P(1.8f,.55f),P(1.82f,.18f),P(1.84f,-.25f),
P(1.86f,-.65f),P(1.88f,-.9f),P(1.9f,-.55f),P(1.92f,0),P(1.94f,.55f),P(1.96f,.9f),P(1.98f,.62f),P(2.f,.2f),P(2.02f,-.35f),P(2.04f,-.7f)}};
constexpr std::array<RecoilPoint,30> stableM4{{
P(.82f,0),P(.9f,.12f),P(.96f,.22f),P(1.f,.3f),P(1.05f,.12f),P(1.08f,-.12f),P(1.12f,-.3f),P(1.16f,-.42f),P(1.18f,-.2f),P(1.2f,.05f),
P(1.22f,.28f),P(1.24f,.48f),P(1.26f,.2f),P(1.28f,-.12f),P(1.3f,-.38f),P(1.32f,-.55f),P(1.34f,-.3f),P(1.36f,0),P(1.38f,.35f),P(1.4f,.58f),
P(1.42f,.3f),P(1.44f,-.08f),P(1.46f,-.42f),P(1.48f,-.62f),P(1.5f,-.32f),P(1.52f,.05f),P(1.54f,.42f),P(1.56f,.65f),P(1.58f,.35f),P(1.6f,-.1f)}};
constexpr std::array<RecoilPoint,30> smg{{
P(.62f,0),P(.7f,-.3f),P(.78f,-.5f),P(.86f,-.25f),P(.92f,.25f),P(.98f,.55f),P(1.04f,.2f),P(1.1f,-.35f),P(1.16f,-.65f),P(1.22f,-.3f),
P(1.28f,.35f),P(1.34f,.7f),P(1.4f,.25f),P(1.46f,-.4f),P(1.52f,-.75f),P(1.58f,-.35f),P(1.64f,.4f),P(1.7f,.8f),P(1.76f,.3f),P(1.82f,-.45f),
P(1.88f,-.8f),P(1.94f,-.3f),P(2.f,.45f),P(2.06f,.85f),P(2.12f,.35f),P(2.18f,-.5f),P(2.24f,-.9f),P(2.3f,-.35f),P(2.36f,.5f),P(2.42f,.9f)}};
SprayProfile make(WeaponId id,std::string_view name,float k,float h,float rec,float stand,float move,float crouch,uint16_t reset,const std::array<RecoilPoint,30>&pat){
 SprayProfile p{id,name,k,h,rec,stand,move,crouch,reset,{}};p.pattern=pat;return p;
}
const std::array<SprayProfile,(size_t)WeaponId::Count> profiles{{
make(WeaponId::AK12,"AK-12",1.12f,1.15f,7.2f,1.05f,2.4f,.68f,280,rifleAK),
make(WeaponId::M4Sopmod,"M4 SOPMOD",.88f,.82f,9.4f,.82f,2.0f,.55f,240,stableM4),
make(WeaponId::AUGA3,"AUG A3",.92f,.72f,8.6f,.78f,1.9f,.52f,250,stableM4),
make(WeaponId::SG553,"SG 553",1.02f,1.05f,7.8f,.95f,2.2f,.62f,270,rifleAK),
make(WeaponId::FamasG2,"FAMAS G2",.78f,.92f,10.2f,.9f,2.25f,.6f,220,stableM4),
make(WeaponId::GalilAce,"Galil ACE",1.04f,1.12f,7.5f,1.f,2.35f,.66f,270,rifleAK),
make(WeaponId::MP5MLI,"MP5",.72f,1.12f,11.f,.72f,1.8f,.48f,210,smg),
make(WeaponId::APC9,"APC-9",.68f,1.25f,12.f,.68f,1.75f,.45f,190,smg),
make(WeaponId::MAC10,"MAC-10",.94f,1.45f,9.8f,.95f,2.4f,.7f,230,smg),
make(WeaponId::AWPAX,"AWP",3.2f,.25f,18.f,0.f,0.f,0.f,900,stableM4)
}};
}
const SprayProfile& GetSprayProfile(WeaponId w){return profiles[std::min((size_t)w,profiles.size()-1)];}
void RecoverSpray(SprayState&s,float now,const SprayProfile&p){
 if(!s.initialized){s.lastShotTime=now;s.initialized=true;return;}
 float elapsed=std::max(0.f,now-s.lastShotTime);
 if(elapsed*1000.f>=static_cast<float>(p.burstResetMs)){s.shot=0;s.pitch=0;s.yaw=0;}
 else {float dt=std::min(elapsed,.25f);float recovery=p.recoveryPerSecond*dt;s.pitch=std::max(0.f,s.pitch-recovery);s.yaw*=std::exp(-dt*5.f);}
 s.lastShotTime=now;
}
SprayOutput FireSpray(WeaponId id,SprayState&s,float now,bool moving,bool crouching,float skill){
 const auto&p=GetSprayProfile(id);RecoverSpray(s,now,p);
 const uint8_t idx=std::min<uint8_t>(s.shot,29);const auto pt=p.pattern[idx];
 float scale=p.kickScale*std::clamp(skill,.65f,1.35f);
 s.pitch+=pt.pitch*scale;s.yaw+=pt.yaw*p.horizontalScale*scale;
 ++s.shot;s.lastShotTime=now;
 float spread=crouching?p.crouchSpread:(moving?p.movingSpread:p.standingSpread);
 spread*=1.f+.035f*std::min<int>(s.shot,20);
 return {s.pitch,s.yaw,spread,idx};
}
void ResetSpray(SprayState&s){s={};}
}
