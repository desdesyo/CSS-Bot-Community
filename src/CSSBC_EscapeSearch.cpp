#include "CSSBC_EscapeSearch.h"
#include <algorithm>
#include <cmath>
namespace cssbc {
void EscapeSearch::SetPockets(const std::vector<SearchPocket>& p){pockets_=p;}
bool EscapeSearch::ReportSighting(const SearchSighting&s){
 if(s.target<0||s.observer<0||!std::isfinite(s.time)||!std::isfinite(s.confidence)||s.confidence<0||s.confidence>1)return false;
 auto it=std::find_if(sightings_.begin(),sightings_.end(),[&](const auto&x){return x.target==s.target;});
 if(it==sightings_.end())sightings_.push_back(s);else *it=s;
 return true;
}
SearchDecision EscapeSearch::ChooseHide(int id,float now,float danger,const std::vector<int>& visited)const{
 SearchDecision best{};float score=-1e9f;
 for(const auto&p:pockets_){
  if(p.id<0||p.exits<1||std::find(visited.begin(),visited.end(),p.id)!=visited.end())continue;
  float d=std::max(0.f,danger),s=p.concealment*4.f+std::min(p.exits,3)*.65f-d*2.f;
  for(const auto&v:visited_)if(v.first==id&&v.second==p.id)s-=3.f;
  if(s>score){score=s;best={danger>.65f?SearchState::Fleeing:SearchState::Relocating,p.id,p.x,p.y,p.z,std::max(0.f,std::min(1.f,p.concealment-d*.35f))};}
 }
 if(best.pocket<0)best.state=SearchState::Regrouping;
 (void)now;return best;
}
SearchDecision EscapeSearch::ChooseSearch(int hunter,float now,const std::vector<SearchSighting>& ss)const{
 SearchDecision out{};float best=-1;
 for(const auto&s:ss){float age=std::max(0.f,now-s.time),confidence=s.confidence*std::exp(-age/45.f),score=confidence/(1.f+age*.025f);
  if(s.target==hunter||score<=best)continue;best=score;out={SearchState::Exposed,-1,s.x,s.y,s.z,confidence};}
 if(best<0)out.state=SearchState::Regrouping;return out;
}
void EscapeSearch::MarkPocketVisited(int c,int p){if(c<0||p<0)return;auto x=std::make_pair(c,p);if(std::find(visited_.begin(),visited_.end(),x)==visited_.end())visited_.push_back(x);}
void EscapeSearch::Reset(){sightings_.clear();visited_.clear();}
}
