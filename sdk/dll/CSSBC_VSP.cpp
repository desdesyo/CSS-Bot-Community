#include "interface.h"
#include "eiface.h"
#include "iserverplugin.h"
#include <windows.h>
#include <cstdio>
#include <cstring>

// Source Engine 2006 branch: ClientCommand(edict_t*) (no CCommand).
class CSSBCServerPlugin final : public IServerPluginCallbacks {
public:
 bool Load(CreateInterfaceFn factory,CreateInterfaceFn) override {
  engine_=static_cast<IVEngineServer*>(factory(INTERFACEVERSION_VENGINESERVER,nullptr));
  if(!engine_)return false;
  engine_->LogPrint("[CSSBC] native VSP bootstrap loaded; no SourceMod.\n");return true;
 }
 void Unload() override {if(engine_)engine_->LogPrint("[CSSBC] unloaded.\n");engine_=nullptr;}
 void Pause() override{} void UnPause() override{}
 const char* GetPluginDescription() override{return "CSS Bot Community native bootstrap";}
 void LevelInit(const char* map) override {spawned_=false;spawnRequested_=false;if(engine_){char b[256];std::snprintf(b,sizeof(b),"[CSSBC] map: %s\n",map?map:"?");engine_->LogPrint(b);}}
 void ServerActivate(edict_t*,int,int) override{} void GameFrame(bool) override{}
 void LevelShutdown() override{if(engine_)engine_->LogPrint("[CSSBC] map shutdown.\n");}
 void ClientActive(edict_t*) override{} void ClientDisconnect(edict_t*) override{}
 void ClientPutInServer(edict_t*,const char*) override{} void SetCommandClient(int) override{}
 void ClientSettingsChanged(edict_t*) override{}
 PLUGIN_RESULT ClientConnect(bool*,edict_t*,const char*,const char*,char*,int) override{return PLUGIN_CONTINUE;}
 PLUGIN_RESULT ClientCommand(edict_t*) override{return PLUGIN_CONTINUE;}
 PLUGIN_RESULT NetworkIDValidated(const char*,const char*) override{return PLUGIN_CONTINUE;}
private: void SpawnBot(){ edict_t* e=engine_->CreateFakeClient("CSSBC_TestBot"); if(!e){engine_->LogPrint("[CSSBC] CreateFakeClient failed.\\n");return;} engine_->LogPrint("[CSSBC] Fake client allocated; GameDLL player setup/team/spawn not yet wired.\\n");spawned_=true;} IVEngineServer* engine_{}; bool spawnRequested_{false},spawned_{false};
};
static CSSBCServerPlugin g_cssbc;
extern "C" __declspec(dllexport) void* CreateInterface(const char* name,int* rc){
 if(name&&std::strcmp(name,INTERFACEVERSION_ISERVERPLUGINCALLBACKS)==0){if(rc)*rc=IFACE_OK;return static_cast<IServerPluginCallbacks*>(&g_cssbc);}
 if(rc)*rc=IFACE_FAILED;return nullptr;
}
