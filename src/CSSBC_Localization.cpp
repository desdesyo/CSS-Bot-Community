#include "CSSBC_Localization.h"
namespace cssbc {
std::string_view Ru(LocaleKey k) {
 switch(k) {
 case LocaleKey::MenuPlay:return "Играть"; case LocaleKey::MenuNewMatch:return "Начать матч";
 case LocaleKey::MenuResume:return "Продолжить"; case LocaleKey::MenuCSSBC:return "CSS Bot Community";
 case LocaleKey::MenuSettings:return "Настройки"; case LocaleKey::MenuExtras:return "Дополнительно";
 case LocaleKey::MenuServers:return "Список серверов"; case LocaleKey::MenuDisconnect:return "Отключиться";
 case LocaleKey::MenuStart:return "Начать"; case LocaleKey::MenuBack:return "Назад";
 case LocaleKey::HudHealth:return "Здоровье"; case LocaleKey::HudArmor:return "Броня";
 case LocaleKey::HudAmmo:return "Патроны"; case LocaleKey::HudMoney:return "Деньги";
 case LocaleKey::HudAlive:return "В строю"; case LocaleKey::HudDead:return "Погибли";
 case LocaleKey::HudJuggernaut:return "Громила"; case LocaleKey::StatusConnected:return "Подключено";
 case LocaleKey::StatusDisconnected:return "Не подключено"; case LocaleKey::StatusLoading:return "Загрузка…";
 case LocaleKey::StatusRoundStart:return "Раунд начался"; case LocaleKey::StatusRoundEnd:return "Раунд завершён";
 case LocaleKey::StatusBombPlanted:return "Бомба установлена"; case LocaleKey::StatusBombDefused:return "Бомба обезврежена";
 case LocaleKey::StatusHostageRescued:return "Заложник спасён"; case LocaleKey::StatusHostageLost:return "Заложник погиб";
 case LocaleKey::StatusWin:return "Победа"; case LocaleKey::StatusLose:return "Поражение"; case LocaleKey::StatusDraw:return "Ничья";
 } return {};
}
namespace {
constexpr VoiceMood C=VoiceMood::Calm, B=VoiceMood::Combat, S=VoiceMood::Stress, V=VoiceMood::Victory, L=VoiceMood::Loss, T=VoiceMood::Tease, U=VoiceMood::Support;
constexpr VoiceLine ctAck[]={{"Принял.",C},{"Понял, работаем.",C},{"Есть.",C},{"На связи.",C}};
constexpr VoiceLine ctContact[]={{"Контакт! Справа!",B},{"Вижу противника!",B},{"Противник впереди!",B},{"Есть цель!",B}};
constexpr VoiceLine ctReload[]={{"Перезаряжаюсь, прикрой.",B},{"Пустой! Дай секунду.",B},{"Меня прикрой — меняю магазин.",B}};
constexpr VoiceLine ctCover[]={{"Прикрываю.",U},{"Держу проход.",C},{"Я рядом, двигайся.",U},{"Не высовывайся, я смотрю.",C}};
constexpr VoiceLine ctBomb[]={{"Закладывают бомбу!",S},{"Бомба у меня. Прикройте.",B},{"Нашёл бомбу.",C}};
constexpr VoiceLine ctDefuse[]={{"Разминирую. Держите вход.",B},{"Прикройте, работаю с бомбой.",B},{"Не подпускайте их.",B}};
constexpr VoiceLine ctRetreat[]={{"Отходим вместе.",S},{"Не геройствуй, отходи!",S},{"Собрались и назад.",S}};
constexpr VoiceLine ctPraise[]={{"Хорошая работа, брат.",V},{"Красиво сделал.",V},{"Вот это по делу.",V},{"Запомню. Молодец.",U}};
constexpr VoiceLine ctTease[]={{"Новенький, не геройствуй. Нам тебя ещё обучать.",T},{"Первый выход? Дыши, всё по плану.",T},{"Красиво. Запишем в легенды — если повторишь.",T},{"Карту ему кто выдал? Уже впереди всех.",T}};
constexpr VoiceLine ctRally[]={{"Спокойно. Они тоже ошибаются.",U},{"Держим позицию. Не отдаём проход.",U},{"Я рядом. Работай.",U},{"Раунд ещё наш. Собрались!",U}};
constexpr VoiceLine ctFear[]={{"Чёрт… потеряли его.",L},{"Тихо. Слушайте.",S},{"Их больше, держимся вместе.",S}};
constexpr VoiceLine tAck[]={{"Принял.",C},{"Понял. Действую.",C},{"Есть.",C},{"Слышу тебя.",C}};
constexpr VoiceLine tContact[]={{"Контакт! Они рядом!",S},{"Вижу их! Вперёд!",B},{"Справа! Не дай им зайти!",S},{"Они здесь!",S}};
constexpr VoiceLine tReload[]={{"Прикрой, перезаряжаюсь!",S},{"Пустой! Дай мне секунду!",S},{"Магазин меняю — держи угол!",B}};
constexpr VoiceLine tCover[]={{"Держу дверь.",B},{"Прикрою. Не задерживайся.",S},{"Смотри фланг!",B},{"За мной, быстро!",B}};
constexpr VoiceLine tBomb[]={{"Бомба здесь. Защищайте меня!",B},{"Установлена! Не подпускайте!",S},{"Готово. Держите их подальше!",B}};
constexpr VoiceLine tDefuse[]={{"Бомба у них — не дайте обезвредить!",S},{"Они у бомбы! Сорвите им!",S}};
constexpr VoiceLine tRetreat[]={{"Уходим, быстро!",S},{"Не бросай своих!",S},{"Отходим! Сейчас же!",S}};
constexpr VoiceLine tPraise[]={{"Братья, хорошо сработали.",U},{"Вот так и надо.",V},{"Не зря держались.",U}};
constexpr VoiceLine tTease[]={{"Новичок, не подведи нас.",S},{"Слова кончились? Действуй.",S},{"Первый бой? Не дрогни сейчас.",S}};
constexpr VoiceLine tRally[]={{"Наша цель выше страха.",U},{"Братья, держитесь. Всё не напрасно.",U},{"До конца. Другого пути нет.",U},{"Не забывай, ради чего мы здесь.",U}};
constexpr VoiceLine tFear[]={{"Мне это не нравится… слишком тихо.",S},{"Проклятье, они нас обошли!",S},{"Держитесь… держитесь, чёрт возьми.",S},{"Я не собираюсь умирать здесь!",S}};
constexpr VoiceLine tIdeology[]={{"Мы пришли не зря. Доведём дело до конца.",U},{"Если падать — то за дело.",U},{"Наша цель выше страха.",U},{"Пусть нас мало — мы своё сделаем.",U}};
constexpr VoiceLine tOrder[]={{"Хватит спорить. Выполняй.",S},{"Не заставляй повторять.",S},{"Держи позицию. Это приказ.",S},{"Соберись, пока не поздно.",S}};
constexpr VoiceLine tCasualty[]={{"Он пал… не забывайте, ради чего.",L},{"Не бросайте его! Чёрт…",L},{"Потеряли своего. Держитесь.",L}};
template<size_t N> std::vector<VoiceLine> copy(const VoiceLine (&a)[N]) { return {a,a+N}; }
}
std::vector<VoiceLine> VoiceLines(Faction f,VoiceContext c) {
 if(f==Faction::CounterTerrorists) switch(c) {
 case VoiceContext::Acknowledge:return copy(ctAck); case VoiceContext::Contact:return copy(ctContact);
 case VoiceContext::Reload:return copy(ctReload); case VoiceContext::Cover:return copy(ctCover);
 case VoiceContext::Bomb:return copy(ctBomb); case VoiceContext::Defuse:return copy(ctDefuse);
 case VoiceContext::Retreat:return copy(ctRetreat); case VoiceContext::Praise:return copy(ctPraise);
 case VoiceContext::RookieTease:return copy(ctTease); case VoiceContext::Rally:return copy(ctRally);
 case VoiceContext::Fear:case VoiceContext::Casualty:return copy(ctFear);
 default:return copy(ctAck);
 }
 switch(c) {
 case VoiceContext::Acknowledge:return copy(tAck); case VoiceContext::Contact:return copy(tContact);
 case VoiceContext::Reload:return copy(tReload); case VoiceContext::Cover:return copy(tCover);
 case VoiceContext::Bomb:return copy(tBomb); case VoiceContext::Defuse:return copy(tDefuse);
 case VoiceContext::Retreat:return copy(tRetreat); case VoiceContext::Praise:return copy(tPraise);
 case VoiceContext::RookieTease:return copy(tTease); case VoiceContext::Rally:return copy(tRally);
 case VoiceContext::Fear:return copy(tFear); case VoiceContext::Ideology:return copy(tIdeology);
 case VoiceContext::Order:return copy(tOrder); case VoiceContext::Casualty:return copy(tCasualty);
 } return copy(tAck);
}
}
