#include "tier1/interface.h"
#include "eiface.h"
#include <windows.h>
#include <cstdio>
#include <cstring>

class CSSBCServerPlugin final : public IServerPluginCallbacks {
public:
 bool Load(CreateInterfaceFn factory, CreateInterfaceFn) override {
  engine_ = static_cast<IVEngineServer*>(factory(INTERFACEVERSION_VENGINESERVER, nullptr));
  if (!engine_) return false;
  Log("[CSSBC] VSP loaded; AlliedModders CS:S SDK bootstrap active.\\n");
  return true;
 }

 void Unload() override { Log("[CSSBC] VSP unloaded.\\n"); engine_ = nullptr; }
 void Pause() override { Log("[CSSBC] paused.\\n"); }
 void UnPause() override { Log("[CSSBC] resumed.\\n"); }
 const char* GetPluginDescription() override { return "CSS Bot Community native bootstrap + diagnostics"; }

 void LevelInit(const char* map) override {
  map_[0] = 0;
  if (map) {
   std::strncpy(map_, map, sizeof(map_) - 1);
   map_[sizeof(map_) - 1] = 0;
  }
  Logf("[CSSBC] LevelInit map=%s\\n", map_);
 }

 void ServerActivate(edict_t*, int edictCount, int clientMax) override {
  Logf("[CSSBC] ServerActivate edicts=%d maxClients=%d map=%s\\n", edictCount, clientMax, map_);
 }

 void GameFrame(bool simulating) override { if (simulating) ++simFrames_; }
 void LevelShutdown() override {
  Logf("[CSSBC] LevelShutdown map=%s simulatedFrames=%lu\\n", map_, simFrames_);
  simFrames_ = 0;
 }
 void ClientActive(edict_t* e) override { Logf("[CSSBC] ClientActive edict=%d\\n", Index(e)); }
 void ClientDisconnect(edict_t* e) override { Logf("[CSSBC] ClientDisconnect edict=%d\\n", Index(e)); }
 void ClientPutInServer(edict_t* e, const char* name) override {
  Logf("[CSSBC] ClientPutInServer edict=%d name=%s\\n", Index(e), name ? name : "");
 }
 void SetCommandClient(int) override {}
 void ClientSettingsChanged(edict_t*) override {}

 PLUGIN_RESULT ClientConnect(bool*, edict_t* e, const char* name, const char*,
                             char*, int) override {
  // Do not log network addresses: they are personal/network data.
  Logf("[CSSBC] ClientConnect edict=%d name=%s\\n", Index(e), name ? name : "");
  return PLUGIN_CONTINUE;
 }

 PLUGIN_RESULT ClientCommand(edict_t*, const CCommand&) override { return PLUGIN_CONTINUE; }
 PLUGIN_RESULT NetworkIDValidated(const char*, const char*) override { return PLUGIN_CONTINUE; }

 void OnQueryCvarValueFinished(QueryCvarCookie_t, edict_t*, EQueryCvarValueStatus,
                               const char*, const char*) override {}
 void OnEdictAllocated(edict_t*) override {}
 void OnEdictFreed(const edict_t*) override {}

private:
 int Index(edict_t* e) const { return engine_ && e ? engine_->IndexOfEdict(e) : -1; }
 void Log(const char* s) { if (engine_) engine_->LogPrint(s); }

 template<typename... A>
 void Logf(const char* fmt, A... args) {
  if (engine_) {
   char buffer[512];
   std::snprintf(buffer, sizeof(buffer), fmt, args...);
   engine_->LogPrint(buffer);
  }
 }

 IVEngineServer* engine_{};
 char map_[128]{};
 unsigned long simFrames_{};
};

static CSSBCServerPlugin g_cssbc;

extern "C" __declspec(dllexport) void* CreateInterface(const char* name, int* rc) {
 if (name && std::strcmp(name, INTERFACEVERSION_ISERVERPLUGINCALLBACKS) == 0) {
  if (rc) *rc = IFACE_OK;
  return static_cast<IServerPluginCallbacks*>(&g_cssbc);
 }
 if (rc) *rc = IFACE_FAILED;
 return nullptr;
}
