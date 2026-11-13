#include "cbase.h"
#include "cs_gamerules.h"
#include "cs_bot.h"
#include "cs_bot_manager.h"
#include "CSSBC_EngineAdapter.h"
#include "CSSBC_Brain.h"
#include "CSSBC_Economy.h"
#include "CSSBC_MVP.h"
#include "CSSBC_Awards.h"
#include "CSSBC_SupportRoster.h"
#include "igameevents.h"
#include "util.h"
#include <array>
#include <vector>

namespace cssbc::sdk {
namespace {
constexpr int kPlayerSlots = 65;
std::array<BotBrain, kPlayerSlots> g_brains{};
std::array<bool, kPlayerSlots> g_initialized{};
Economy g_economy{};

class CSSBCEventBridge final : public IGameEventListener2 {
public:
    void EnsureRegistered() {
        if (registered_ || !gameeventmanager) return;
        static const char* events[] = {
            "round_start", "player_death", "bomb_planted",
            "bomb_defused", "hostage_rescued"
        };
        bool any = false;
        for (const char* name : events)
            any = gameeventmanager->AddListener(this, name, true) || any;
        registered_ = any;
    }

    void FireGameEvent(IGameEvent* event) override {
        if (!event) return;
        const char* name = event->GetName();
        if (!name) return;
        if (!Q_stricmp(name, "round_start")) {
            ++round_;
            mvp_.Reset();
            return;
        }
        if (!Q_stricmp(name, "player_death")) {
            CBasePlayer* victim = UTIL_PlayerByUserId(event->GetInt("userid"));
            CBasePlayer* attacker = UTIL_PlayerByUserId(event->GetInt("attacker"));
            if (attacker && attacker != victim) {
                Record(attacker, victim, EventKind::Kill, 1.0f);
                if (attacker->IsAlive() && victim) {
                    int livingAllies = 0;
                    int livingEnemies = 0;
                    for (int i = 1; gpGlobals && i <= gpGlobals->maxClients; ++i) {
                        CBasePlayer* player = UTIL_PlayerByIndex(i);
                        if (!player || !player->IsAlive()) continue;
                        if (player->GetTeamNumber() == attacker->GetTeamNumber())
                            ++livingAllies;
                        else if (player->GetTeamNumber() == TEAM_TERRORIST ||
                                 player->GetTeamNumber() == TEAM_CT)
                            ++livingEnemies;
                    }
                    // Last survivor who eliminates the final opponent gets a clutch entry.
                    if (livingAllies == 1 && livingEnemies == 0) {
                        Record(attacker, victim, EventKind::LastAliveClutch, 1.0f);
                        awards_.Process({attacker->entindex(), round_, AwardTrigger::Clutch});
                    }
                }
                if (event->GetInt("headshot", 0)) {
                    Record(attacker, victim, EventKind::Headshot, 1.0f);
                    awards_.Process({attacker->entindex(), round_, AwardTrigger::Headshot});
                }
                awards_.Process({attacker->entindex(), round_, AwardTrigger::Kill});
            }
            CBasePlayer* assister = UTIL_PlayerByUserId(event->GetInt("assister"));
            if (assister && assister != attacker && assister != victim) {
                Record(assister, victim, EventKind::Assist, 1.0f);
                awards_.Process({assister->entindex(), round_, AwardTrigger::Assist});
            }
            return;
        }
        if (!Q_stricmp(name, "bomb_planted")) {
            AwardObjective(event, AwardTrigger::BombPlant, EventKind::ObjectivePlant);
        } else if (!Q_stricmp(name, "bomb_defused")) {
            AwardObjective(event, AwardTrigger::BombDefuse, EventKind::ObjectiveDefuse);
        } else if (!Q_stricmp(name, "hostage_rescued")) {
            AwardObjective(event, AwardTrigger::Rescue, EventKind::Rescue);
        }
    }

    std::vector<MVPEntry> Rank() const {
        std::vector<int> roster;
        if (!gpGlobals) return {};
        for (int i = 1; i <= gpGlobals->maxClients; ++i)
            if (UTIL_PlayerByIndex(i)) roster.push_back(i);
        return mvp_.Rank(roster, 5);
    }

private:
    void Record(CBasePlayer* actor, CBasePlayer* target, EventKind kind, float value) {
        if (!actor) return;
        mvp_.Record(round_, actor->entindex(), kind, value,
                    target ? target->entindex() : -1,
                    gpGlobals ? gpGlobals->curtime : 0.0f);
    }

    void AwardObjective(IGameEvent* event, AwardTrigger trigger, EventKind kind) {
        CBasePlayer* actor = UTIL_PlayerByUserId(event->GetInt("userid"));
        if (!actor) return;
        Record(actor, nullptr, kind, 1.0f);
        awards_.Process({actor->entindex(), round_, trigger});
    }

    bool registered_ = false;
    int round_ = 0;
    MVPScore mvp_{};
    AwardEngine awards_{};
};
CSSBCEventBridge g_events;

bool SpawnSupportRoster(int team, SupportTier tier) {
    SupportRoster roster;
    if (!roster.Deploy(tier) || !TheCSBots()) return false;
    int spawnedCount = 0;
    for (const SupportUnit& unit : roster.Units()) {
        std::array<bool, kPlayerSlots> existed{};
        for (int i = 1; i < kPlayerSlots; ++i)
            existed[i] = dynamic_cast<CCSBot*>(UTIL_PlayerByIndex(i)) != nullptr;

        const CSWeaponType weaponType =
            unit.role == SupportRole::Sniper ? WEAPONTYPE_SNIPER_RIFLE : WEAPONTYPE_RIFLE;
        if (!TheCSBots()->BotAddCommand(team, true, nullptr, weaponType, BOT_HARD))
            break;

        CCSBot* created = nullptr;
        for (int i = 1; i < kPlayerSlots; ++i) {
            CCSBot* candidate = dynamic_cast<CCSBot*>(UTIL_PlayerByIndex(i));
            if (candidate && !existed[i] && candidate->GetTeamNumber() == team) {
                created = candidate;
                break;
            }
        }
        if (!created) break;

        const int slot = created->entindex();
        InitializePersonality(slot);
        if (unit.role == SupportRole::Sniper) {
            g_brains[slot].SetRole(BotRole::Sniper);
        } else if (unit.role == SupportRole::Assault) {
            g_brains[slot].SetRole(BotRole::Support);
        } else {
            g_brains[slot].SetRole(BotRole::Anchor);
            Traits& traits = g_brains[slot].Personality();
            traits.courage = 0.95f;
            traits.teamwork = 0.85f;
            traits.discipline = 0.90f;
            created->SetMaxHealth(unit.health);
            created->SetHealth(unit.health);
        }
        ++spawnedCount;
    }
    Msg("[CSSBC] Support deployment: %d/%d units created for team %d.\\n",
        spawnedCount, static_cast<int>(roster.Units().size()), team);
    return spawnedCount == static_cast<int>(roster.Units().size());
}

void InitializePersonality(int slot) {
    // Stable per-slot personality: bots do not all make identical risk decisions.
    Traits traits{};
    traits.courage = 0.28f + static_cast<float>((slot * 17) % 61) / 100.0f;
    traits.trust = 0.30f + static_cast<float>((slot * 29) % 61) / 100.0f;
    traits.teamwork = 0.25f + static_cast<float>((slot * 13) % 66) / 100.0f;
    traits.discipline = 0.30f + static_cast<float>((slot * 23) % 61) / 100.0f;
    traits.adaptability = 0.25f + static_cast<float>((slot * 31) % 66) / 100.0f;
    g_brains[slot].Personality() = traits;
    switch (slot % 5) {
        case 0: g_brains[slot].SetRole(BotRole::Entry); break;
        case 1: g_brains[slot].SetRole(BotRole::Support); break;
        case 2: g_brains[slot].SetRole(BotRole::Anchor); break;
        case 3: g_brains[slot].SetRole(BotRole::Sniper); break;
        default: g_brains[slot].SetRole(BotRole::IGL); break;
    }
    g_initialized[slot] = true;
}
float g_nextTacticalTick[kPlayerSlots]{};
}

void OnBotUpdate(CCSBot* bot) {
    g_events.EnsureRegistered();
    if (!bot || !bot->IsAlive() || !gpGlobals) return;

    const int slot = bot->entindex();
    if (slot < 1 || slot >= kPlayerSlots) return;

    if (!g_initialized[slot]) InitializePersonality(slot);

    const float now = gpGlobals->curtime;
    if (now < g_nextTacticalTick[slot]) return;
    g_nextTacticalTick[slot] = now + 0.75f;

    BrainSnapshot snapshot{};
    snapshot.player = slot;
    snapshot.round = 0;
    snapshot.team = bot->GetTeamNumber();
    snapshot.health = static_cast<float>(bot->GetHealth());
    snapshot.armor = static_cast<float>(bot->ArmorValue());
    snapshot.secondsLeft = 90;
    snapshot.seesThreat = bot->IsEnemyVisible();
    snapshot.hasCover = bot->IsHiding();
    snapshot.alliesNearby = bot->GetNearbyFriendCount();
    snapshot.enemiesKnown = bot->GetNearbyEnemyCount();
    snapshot.threatPressure = snapshot.seesThreat ? 0.72f : 0.12f;
    snapshot.distanceToThreat = 2000.0f;

    if (CCSPlayer* enemy = bot->GetBotEnemy()) {
        const Vector delta = enemy->GetAbsOrigin() - bot->GetAbsOrigin();
        snapshot.distanceToThreat = delta.Length();
    }

    const bool terrorist = bot->GetTeamNumber() == TEAM_TERRORIST;
    const BrainIntent intent = g_brains[slot].Tick(snapshot, g_economy, terrorist);

    // Preserve the native CCSBot state machine; CSSBC only injects high-level
    // retreat/cover decisions and never creates entities or bypasses server traces.
    if (intent.retreat && !bot->IsHiding() && !bot->IsMovingTo()) {
        bot->TryToRetreat(900.0f, 1.5f);
    } else if (intent.seekCover && !bot->IsHiding() && !bot->IsMovingTo()) {
        bot->TryToHide(bot->GetLastKnownArea(), 1.0f, 600.0f, false);
    }
}
void PrintRoundMVP() {
    const auto leaders = g_events.Rank();
    Msg("[CSSBC] Current round MVP standings:\\n");
    for (std::size_t i = 0; i < leaders.size(); ++i)
        Msg("  #%d player %d - %.2f points\\n",
            static_cast<int>(i + 1), leaders[i].player, leaders[i].score);
}

}

CON_COMMAND_F(cssbc_mvp, "Show CSS Bot Community MVP standings for the current round.", FCVAR_GAMEDLL)
{
    cssbc::sdk::PrintRoundMVP();
}

CON_COMMAND_F(cssbc_spawn_support, "Test-spawn CSSBC support bots: cssbc_spawn_support <tier 0-3> <t|ct>.", FCVAR_GAMEDLL)
{
    if (args.ArgC() < 3) {
        Msg("Usage: cssbc_spawn_support <tier 0-3> <t|ct>\\n");
        return;
    }
    const int tierValue = atoi(args.Arg(1));
    if (tierValue < 0 || tierValue > 3) {
        Msg("[CSSBC] Tier must be 0, 1, 2 or 3.\\n");
        return;
    }
    int team = TEAM_UNASSIGNED;
    if (!Q_stricmp(args.Arg(2), "t") || !Q_stricmp(args.Arg(2), "2"))
        team = TEAM_TERRORIST;
    else if (!Q_stricmp(args.Arg(2), "ct") || !Q_stricmp(args.Arg(2), "3"))
        team = TEAM_CT;
    if (team == TEAM_UNASSIGNED) {
        Msg("Team must be t or ct.\\n");
        return;
    }
    cssbc::sdk::SpawnSupportRoster(team, static_cast<cssbc::SupportTier>(tierValue));
}
