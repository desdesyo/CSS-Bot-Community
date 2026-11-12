#pragma once
#include "CSSBC_Types.h"
#include <deque>
namespace cssbc {
class TeamMemory {
public:
 void Publish(MemoryEntry e);
 std::vector<MemoryEntry> Recent(float now,float maxAge=12.f)const;
 void Clear(){events_.clear();}
private:std::deque<MemoryEntry>events_;
};
}