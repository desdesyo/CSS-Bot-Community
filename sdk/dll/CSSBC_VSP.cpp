// CSSBC v34 native Valve Server Plugin entry point.
// Compile against Source SDK 2006 public headers (Win32).
#include "interface.h"
#include "eiface.h"
#include "iserverplugin.h"
#include "CSSBC_VSPStatus.h"
#include <windows.h>
#include <cstdio>
#include <cstring>
#include <cstring>

namespace cssbc::vsp { BootstrapStatus& Status(){ static BootstrapStatus s; return s; } }
namespace {
class CSSBCServerPlugin final : public IServerPluginCallbacks {
public:
    bool Load(CreateInterfaceFn engineFactory, CreateInterfaceFn gameServerFactory) override {
        engineFactory_ = engineFactory;
        gameServerFactory_ = gameServerFactory;
        engine_ = static_cast<IVEngineServer*>(engineFactory_(INTERFACEVERSION_VENGINESERVER, nullptr));
        if (!engine_) return false;
        cssbc::vsp::Status().engineInterfaceFound = true;
        cssbc::vsp::Status().pluginLoaded = true;
        engine_->LogPrint("[CSSBC] Native v34 plugin loaded; SDK bridge online.\n");
        return true;
    }
    void Unload() override {
        if (engine_) engine_->LogPrint("[CSSBC] Plugin unloaded.\n");
        cssbc::vsp::Status().pluginLoaded = false;
        engine_ = nullptr;
    }
    void Pause() override {}
    void UnPause() override {}
    const char* GetPluginDescription() override {
        return "CSS Bot Community - native CS:S v34 bootstrap";
    }
    void LevelInit(char const* mapName) override {
        cssbc::vsp::Status().levelSeen = true;
        cssbc::vsp::Status().mapName = mapName ? mapName : "";
        if (engine_) { char msg[256]; std::snprintf(msg,sizeof(msg),"[CSSBC] LevelInit: %s\n",mapName?mapName:"(unknown)"); engine_->LogPrint(msg); }
    }
    void ServerActivate(edict_t*, int, int) override {}
    void GameFrame(bool) override {}
    void LevelShutdown() override { if(engine_) engine_->LogPrint("[CSSBC] LevelShutdown\n"); }
    void ClientActive(edict_t*) override {}
    void ClientDisconnect(edict_t*) override {}
    void ClientPutInServer(edict_t*, char const*) override {}
    void SetCommandClient(int) override {}
    void ClientSettingsChanged(edict_t*) override {}
    PLUGIN_RESULT ClientConnect(bool*, edict_t*, const char*, const char*, char*, int) override { return PLUGIN_CONTINUE; }
    PLUGIN_RESULT ClientCommand(edict_t*) override { return PLUGIN_CONTINUE; }
    PLUGIN_RESULT NetworkIDValidated(const char*, const char*) override { return PLUGIN_CONTINUE; }
private:
    CreateInterfaceFn engineFactory_{};
    CreateInterfaceFn gameServerFactory_{};
    IVEngineServer* engine_{};
};
CSSBCServerPlugin g_plugin;
}

extern "C" __declspec(dllexport) void* CreateInterface(const char* name, int* returnCode) {
    if (name && std::strcmp(name, INTERFACEVERSION_ISERVERPLUGINCALLBACKS)==0) {
        if(returnCode) *returnCode=IFACE_OK;
        return static_cast<IServerPluginCallbacks*>(&g_plugin);
    }
    if(returnCode) *returnCode=IFACE_FAILED;
    return nullptr;
}
