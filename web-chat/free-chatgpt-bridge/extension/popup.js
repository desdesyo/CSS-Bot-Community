const input = document.getElementById("token");
const status = document.getElementById("status");
chrome.storage.local.get(["bridgeToken"], value => { input.value = value.bridgeToken || ""; });
document.getElementById("save").addEventListener("click", async () => {
  const bridgeToken = input.value.trim();
  if (bridgeToken.length < 24) { status.textContent = "Token must contain at least 24 characters."; return; }
  await chrome.storage.local.set({ bridgeToken, enabled: true });
  status.textContent = "Saved. Keep a ChatGPT tab open; the bridge will poll for SOLO.Chat requests.";
});
