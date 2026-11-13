#define NOMINMAX
#include "tier1/interface.h"
#include "eiface.h"
#include "engine/iserverplugin.h"
#include "igameevents.h"
#include "CSSBC_System.h"
#include <windows.h>
#include <algorithm>
#include <cstdio>
#include <cstring>
#include <vector>

class CSSBCServerPlugin final : public IServerPluginCallbacks, public IGameEventListener2 {
public:
    bool Load(CreateInterfaceFn factory, CreateInterfaceFn) override {
        engine_ = static_cast<IVEngineServer*>(factory(INTERFACEVERSION_VENGINESERVER, nullptr));
        if (!engine_) return false;

        events_ = static_cast<IGameEventManager2*>(factory(INTERFACEVERSION_GAMEEVENTSMANAGER2, nullptr));
        if (events_) {
            RegisterEvent("round_start");
            RegisterEvent("round_end");
            RegisterEvent("player_death");
            RegisterEvent("bomb_planted");
            RegisterEvent("bomb_defused");
            RegisterEvent("hostage_rescued");
        } else {
            Log("[CSSBC] Game event manager unavailable; event scoring is disabled.\n");
        }

        core_.MVP().Reset();
        mvpUsers_.clear();
        Log("[CSSBC] Native server plugin loaded; gameplay core and MVP event bridge initialized.\n");
        return true;
    }

    void Unload() override {
        if (events_) {
            events_->RemoveListener(this);
            events_ = nullptr;
        }
        Log("[CSSBC] Native server plugin unloaded.\n");
        engine_ = nullptr;
        mvpUsers_.clear();
        core_.MVP().Reset();
    }
    void Pause() override { Log("[CSSBC] paused.\n"); }
    void UnPause() override { Log("[CSSBC] resumed.\n"); }
    const char* GetPluginDescription() override {
        return "CSS Bot Community native gameplay core + MVP event bridge";
    }
    void LevelInit(const char* map) override {
        map_[0] = '\0';
        if (map) {
            std::strncpy(map_, map, sizeof(map_) - 1);
            map_[sizeof(map_) - 1] = '\0';
        }
        core_.MVP().Reset();
        mvpUsers_.clear();
        Logf("[CSSBC] LevelInit map=%s\n", map_);
    }
    void ServerActivate(edict_t*, int edictCount, int clientMax) override {
        Logf("[CSSBC] ServerActivate edicts=%d maxClients=%d map=%s\n", edictCount, clientMax, map_);
    }
    void GameFrame(bool simulating) override {
        if (simulating) ++simFrames_;
    }
    void LevelShutdown() override {
        Logf("[CSSBC] LevelShutdown map=%s simulatedFrames=%lu\n", map_, simFrames_);
        simFrames_ = 0;
    }
    void ClientActive(edict_t* entity) override {
        Logf("[CSSBC] ClientActive edict=%d\n", Index(entity));
    }
    void ClientDisconnect(edict_t* entity) override {
        Logf("[CSSBC] ClientDisconnect edict=%d\n", Index(entity));
    }
    void ClientPutInServer(edict_t* entity, const char* name) override {
        Logf("[CSSBC] ClientPutInServer edict=%d name=%s\n", Index(entity), name ? name : "");
    }
    void SetCommandClient(int) override {}
    void ClientSettingsChanged(edict_t*) override {}
    PLUGIN_RESULT ClientConnect(bool*, edict_t* entity, const char* name,
                                const char*, char*, int) override {
        // Network addresses are deliberately not logged.
        Logf("[CSSBC] ClientConnect edict=%d name=%s\n", Index(entity), name ? name : "");
        return PLUGIN_CONTINUE;
    }
    PLUGIN_RESULT ClientCommand(edict_t*, const CCommand&) override {
        return PLUGIN_CONTINUE;
    }
    PLUGIN_RESULT NetworkIDValidated(const char*, const char*) override {
        return PLUGIN_CONTINUE;
    }
    void OnQueryCvarValueFinished(QueryCvarCookie_t, edict_t*, EQueryCvarValueStatus,
                                  const char*, const char*) override {}
    void OnEdictAllocated(edict_t*) override {}
    void OnEdictFreed(const edict_t*) override {}

    void FireGameEvent(IGameEvent* event) override {
        if (!event) return;
        const char* name = event->GetName();
        if (!name) return;

        if (std::strcmp(name, "round_start") == 0) {
            core_.MVP().Reset();
            mvpUsers_.clear();
            ++roundNumber_;
            Logf("[CSSBC] Round %d started.\n", roundNumber_);
            return;
        }

        if (std::strcmp(name, "player_death") == 0) {
            const int victim = event->GetInt("userid", 0);
            const int attacker = event->GetInt("attacker", 0);
            const int assister = event->GetInt("assister", 0);
            if (attacker > 0 && attacker != victim) {
                AddMvpEvent(attacker, cssbc::EventKind::Kill, 1.f);
                if (event->GetBool("headshot", false)) {
                    AddMvpEvent(attacker, cssbc::EventKind::Headshot, 1.f);
                }
            }
            if (assister > 0 && assister != attacker && assister != victim) {
                AddMvpEvent(assister, cssbc::EventKind::Assist, 1.f);
            }
            return;
        }

        if (std::strcmp(name, "bomb_planted") == 0) {
            AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::ObjectivePlant, 1.f);
            return;
        }
        if (std::strcmp(name, "bomb_defused") == 0) {
            AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::ObjectiveDefuse, 1.f);
            return;
        }
        if (std::strcmp(name, "hostage_rescued") == 0) {
            AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::Rescue, 1.f);
            return;
        }
        if (std::strcmp(name, "round_end") == 0) {
            const auto ranked = core_.MVP().Rank(mvpUsers_, 3);
            for (std::size_t i = 0; i < ranked.size(); ++i) {
                Logf("[CSSBC] Round %d MVP #%d userid=%d score=%.2f\n",
                     roundNumber_, static_cast<int>(i + 1), ranked[i].player, ranked[i].score);
            }
        }
    }

private:
    void RegisterEvent(const char* name) {
        if (!events_->AddListener(this, name, true)) {
            Logf("[CSSBC] Could not register game event: %s\n", name);
        }
    }
    void AddMvpEvent(int userId, cssbc::EventKind kind, float value) {
        if (userId <= 0) return;
        core_.MVP().Add(userId, kind, value);
        if (std::find(mvpUsers_.begin(), mvpUsers_.end(), userId) == mvpUsers_.end()) {
            mvpUsers_.push_back(userId);
        }
    }
    int Index(edict_t* entity) const {
        return engine_ && entity ? engine_->IndexOfEdict(entity) : -1;
    }
    void Log(const char* message) {
        if (engine_) engine_->LogPrint(message);
    }
    template <typename... Args>
    void Logf(const char* format, Args... args) {
        if (!engine_) return;
        char buffer[512];
        std::snprintf(buffer, sizeof(buffer), format, args...);
        engine_->LogPrint(buffer);
    }

    IVEngineServer* engine_{};
    IGameEventManager2* events_{};
    cssbc::CSSBCSystem core_{};
    std::vector<int> mvpUsers_;
    char map_[128]{};
    unsigned long simFrames_{};
    int roundNumber_{0};
};

static CSSBCServerPlugin g_cssbc;

extern "C" __declspec(dllexport) void* CreateInterface(const char* name, int* returnCode) {
    if (name && std::strcmp(name, INTERFACEVERSION_ISERVERPLUGINCALLBACKS) == 0) {
        if (returnCode) *returnCode = IFACE_OK;
        return static_cast<IServerPluginCallbacks*>(&g_cssbc);
    }
    if (returnCode) *returnCode = IFACE_FAILED;
    return nullptr;
}
