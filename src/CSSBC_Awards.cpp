#include "CSSBC_Awards.h"
namespace cssbc {
const std::vector<AwardDef>& AwardCatalog(){
 static const std::vector<AwardDef> v={
 {"first_blood","Первая кровь","Первое убийство раунда",AwardKind::Medal,AwardTrigger::Kill,1,20,100},
 {"sharpshooter","Меткий","3 попадания в голову за раунд",AwardKind::Medal,AwardTrigger::Headshot,3,35,150},
 {"trade_master","Разменщик","Два размена за матч",AwardKind::Achievement,AwardTrigger::Trade,2,50,250},
 {"bomb_worker","Сапёр","Установить бомбу",AwardKind::Medal,AwardTrigger::BombPlant,1,30,200},
 {"defuse_hero","Герой разминирования","Разминировать бомбу",AwardKind::Medal,AwardTrigger::BombDefuse,1,50,300},
 {"guardian","Телохранитель","Спасти союзника огнём прикрытия",AwardKind::Medal,AwardTrigger::CoverSave,1,40,200},
 {"rescuer","Спасатель","Помочь союзнику выжить",AwardKind::Achievement,AwardTrigger::Rescue,3,60,300},
 {"clutch","Клатч","Выиграть раунд последним живым",AwardKind::Medal,AwardTrigger::Clutch,1,80,500},
 {"grenadier","Гренадёр","Поражение двух врагов одной гранатой",AwardKind::Medal,AwardTrigger::GrenadeMulti,2,50,250},
 {"wallbreaker","Сквозь стены","Убийство сквозь материал",AwardKind::Medal,AwardTrigger::Wallbang,1,25,100},
 {"entry","Первопроходец","Первым открыть вход и сделать фраг",AwardKind::MapCommendation,AwardTrigger::EntryFrag,1,35,150},
 {"retake","Возвращение","Успешный ретейк точки",AwardKind::MapCommendation,AwardTrigger::Retake,1,60,350},
 {"fortress","Крепость","Защитить точку без потерь",AwardKind::MapCommendation,AwardTrigger::PerfectDefense,1,70,400},
 {"recon","Разведчик","Передать полезный callout",AwardKind::MapCommendation,AwardTrigger::ScoutCallout,3,25,100},
 {"survivor","Выживший","Дожить до победы раунда",AwardKind::Medal,AwardTrigger::SurviveRound,1,15,50},
 {"friendly_fire","Осторожнее!","Урон союзнику",AwardKind::Penalty,AwardTrigger::FriendlyFire,1,0,-100},
 {"teamkill","Предатель","Убийство союзника",AwardKind::Penalty,AwardTrigger::TeamKill,1,0,-300},
 {"afk","Отсутствие","AFK в раунде",AwardKind::Penalty,AwardTrigger::AFK,1,0,-150}
 };return v;
}
std::vector<AwardResult> AwardEngine::Process(const AwardEvent&e){
 std::vector<AwardResult> out;if(e.player<0)return out;
 for(const auto&d:AwardCatalog()){
 if(d.trigger!=e.trigger)continue;
 int key=e.player*1000+(int)d.trigger;int&n=progress_[key];n+=(int)(e.value>0?e.value:1);
 if(n<d.threshold)continue;
 // Medals may repeat each round; achievement/map commendation unlock once per match.
 if(d.kind==AwardKind::Achievement||d.kind==AwardKind::MapCommendation){int u=e.player*100+(int)(&d-AwardCatalog().data());if(unlocked_[u])continue;unlocked_[u]=true;}
 n=0;xp_[e.player]+=d.xp;mapScore_[e.player]+=d.money;out.push_back({&d,d.xp,d.money});
 }return out;
}
int AwardEngine::XP(int p)const{auto i=xp_.find(p);return i==xp_.end()?0:i->second;}
int AwardEngine::MapScore(int p)const{auto i=mapScore_.find(p);return i==mapScore_.end()?0:i->second;}
void AwardEngine::ResetMatch(){xp_.clear();mapScore_.clear();progress_.clear();unlocked_.clear();}
}
