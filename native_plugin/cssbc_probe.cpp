#include "iserverplugin.h"
#include <cstring>

class CCSSBCProbe final : public IServerPluginCallbacks
{
public:
    bool Load(CreateInterfaceFn, CreateInterfaceFn) override { return true; }
    void Unload() override {}
    void Pause() override {}
    void UnPause() override {}
    const char *GetPluginDescription() override
    {
        return "CSS Bot Community native loader probe (v34)";
    }
    void LevelInit(char const *) override {}
    void ServerActivate(edict_t *, int, int) override {}
    void GameFrame(bool) override {}
    void LevelShutdown() override {}
    void ClientActive(edict_t *) override {}
    void ClientDisconnect(edict_t *) override {}
    void ClientPutInServer(edict_t *, char const *) override {}
    void SetCommandClient(int) override {}
    void ClientSettingsChanged(edict_t *) override {}
    PLUGIN_RESULT ClientConnect(bool *, edict_t *, const char *, const char *,
                                char *, int) override { return PLUGIN_CONTINUE; }
    PLUGIN_RESULT ClientCommand(edict_t *) override { return PLUGIN_CONTINUE; }
    PLUGIN_RESULT NetworkIDValidated(const char *, const char *) override
    {
        return PLUGIN_CONTINUE;
    }
    void OnQueryCvarValueFinished(QueryCvarCookie_t, edict_t *,
                                  EQueryCvarValueStatus, const char *,
                                  const char *) override {}
};

static CCSSBCProbe g_CSSBCProbe;

DLL_EXPORT void *CreateInterface(const char *pName, int *pReturnCode)
{
    if (pName &&
        (!std::strcmp(pName, INTERFACEVERSION_ISERVERPLUGINCALLBACKS) ||
         !std::strcmp(pName, INTERFACEVERSION_ISERVERPLUGINCALLBACKS_VERSION_1)))
    {
        if (pReturnCode) *pReturnCode = IFACE_OK;
        return static_cast<IServerPluginCallbacks *>(&g_CSSBCProbe);
    }
    if (pReturnCode) *pReturnCode = IFACE_FAILED;
    return nullptr;
}
