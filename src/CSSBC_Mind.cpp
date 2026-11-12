#include "CSSBC_Mind.h"
#include <algorithm>
#include <numeric>
namespace cssbc {
Mind::Mind(Traits t):traits(t),rng_(std::random_device{}()){}
bool Mind::ShouldHeed(const Callout&c,float reliability){float p=.18f+traits.trust*.30f+traits.teamwork*.24f+traits.discipline*.16f+reliability*.18f-traits.independence*.22f;p=std::clamp(p,.05f,.92f);std::uniform_real_distribution<float>d(0,1);bool yes=d(rng_)<p;if(yes)Learn({EventKind::Callout,c.sender,-1,c.plate,c.confidence,0,c.text});return yes;}
Plate Mind::ChoosePlate(const std::array<PlateState,(size_t)Plate::Count>&a,const std::vector<MemoryEntry>&mem){std::array<float,(size_t)Plate::Count>s{};for(size_t i=0;i<s.size();++i)s[i]=a[i].broken?0:(1-a[i].integrity)*.75f+a[i].exposure*.25f;for(auto&e:mem)if(e.kind==EventKind::PlateCracked||e.kind==EventKind::PlateBroken){auto i=(size_t)e.plate;if(i<s.size()&&!a[i].broken)s[i]+=e.confidence*.3f;}float sum=std::accumulate(s.begin(),s.end(),0.f);if(sum<=.001f)return Plate::Chest;std::uniform_real_distribution<float>d(0,sum);float x=d(rng_);for(size_t i=0;i<s.size();++i){x-=s[i];if(x<=0)return(Plate)i;}return Plate::Chest;}
void Mind::Learn(const MemoryEntry&e){memory_.push_back(e);if(memory_.size()>128)memory_.erase(memory_.begin(),memory_.begin()+32);}
}