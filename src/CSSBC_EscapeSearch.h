#pragma once
#include <cstdint>
#include <utility>
#include <vector>
namespace cssbc {
enum class SearchState : std::uint8_t { Hidden, Relocating, Fleeing, Regrouping, Exposed };
struct SearchPocket { int id=-1,district=0; float x=0,y=0,z=0; int exits=0; float concealment=0.5f; };
struct SearchSighting { int target=-1,observer=-1; float x=0,y=0,z=0,time=0,confidence=1; };
struct SearchDecision { SearchState state=SearchState::Hidden; int pocket=-1; float x=0,y=0,z=0; float confidence=0; };
// SDK/nav adapter supplies coordinates and actual line-of-sight observations.
class EscapeSearch {
public:
 void SetPockets(const std::vector<SearchPocket>& pockets);
 bool ReportSighting(const SearchSighting& sighting);
 SearchDecision ChooseHide(int character,float now,float danger,const std::vector<int>& visited)const;
 SearchDecision ChooseSearch(int hunter,float now,const std::vector<SearchSighting>& sightings)const;
 void MarkPocketVisited(int character,int pocket);
 void Reset();
private:
 std::vector<SearchPocket> pockets_;std::vector<SearchSighting> sightings_;std::vector<std::pair<int,int>> visited_;
};
}
