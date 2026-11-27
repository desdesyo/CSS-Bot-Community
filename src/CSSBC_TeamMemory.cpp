#include "CSSBC_TeamMemory.h"
namespace cssbc {
void TeamMemory::Publish(MemoryEntry e){events_.push_back(std::move(e));while(events_.size()>64)events_.pop_front();}
std::vector<MemoryEntry> TeamMemory::Recent(float now,float age)const{std::vector<MemoryEntry>out;for(const auto&e:events_)if(now-e.time<=age&&now>=e.time)out.push_back(e);return out;}
}