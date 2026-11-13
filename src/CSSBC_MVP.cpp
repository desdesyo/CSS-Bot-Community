#include "CSSBC_MVP.h"
#include <algorithm>
namespace cssbc {
void MVPScore::Add(int id,EventKind e,float v){
 float weight=0.f;
 switch(e){
 case EventKind::Kill: weight=1.f; break;
 case EventKind::Headshot: weight=.35f; break;
 case EventKind::Assist: weight=.65f; break;
 case EventKind::BombAction: case EventKind::ObjectivePlant: weight=2.5f; break;
 case EventKind::ObjectiveDefuse: weight=3.5f; break;
 case EventKind::Rescue: case EventKind::SaveTeammate: weight=2.2f; break;
 case EventKind::CoverFire: weight=1.1f; break;
 case EventKind::PlateCracked: weight=.25f; break;
 case EventKind::PlateBroken: weight=.5f; break;
 case EventKind::Trade: weight=1.4f; break;
 case EventKind::GrenadeImpact: weight=.35f; break;
 case EventKind::LastAliveClutch: weight=2.f; break;
 default: break;
 }
 if(weight>0.f) score_[id]+=v*weight;
}
float MVPScore::Get(int id)const{auto i=score_.find(id);return i==score_.end()?0.f:i->second;}
std::vector<MVPEntry> MVPScore::Rank(const std::vector<int>& roster,std::size_t limit)const{
 std::vector<MVPEntry> out;out.reserve(roster.size());
 for(int id:roster)out.push_back({id,Get(id)});
 std::stable_sort(out.begin(),out.end(),[](const MVPEntry&a,const MVPEntry&b){
  if(a.score!=b.score)return a.score>b.score;return a.player<b.player;
 });
 if(out.size()>limit)out.resize(limit);return out;
}
}