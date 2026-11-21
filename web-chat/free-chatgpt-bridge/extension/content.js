(() => {
  if (window.__soloFreeBridgeInstalled) return;
  window.__soloFreeBridgeInstalled = true;
  const LOCAL = "http://127.0.0.1:8765";
  let busy = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assistantNodes = () => Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  const assistantText = () => assistantNodes().map(node => node.innerText || node.textContent || "").join("\n\n").trim();
  const composer = () => document.querySelector('#prompt-textarea') ||
    document.querySelector('[contenteditable="true"][data-testid="composer"]') ||
    document.querySelector('[contenteditable="true"][role="textbox"]') ||
    document.querySelector('textarea');
  const setComposerText = (node, text) => {
    node.focus();
    if (node.tagName === "TEXTAREA" || node.tagName === "INPUT") {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value")?.set;
      if (setter) setter.call(node, text); else node.value = text;
      node.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      node.replaceChildren();
      node.textContent = text;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  };
  async function submitPrompt(prompt) {
    const node = composer();
    if (!node) throw new Error("ChatGPT composer was not found. Reload the ChatGPT tab.");
    const before = assistantText();
    setComposerText(node, prompt);
    await sleep(350);
    const send = document.querySelector('[data-testid="send-button"]') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('button[data-testid*="send"]');
    if (send && !send.disabled) send.click();
    else {
      node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
      node.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    }
    const startedAt = Date.now();
    let last = "", stableSince = 0;
    while (Date.now() - startedAt < 120000) {
      await sleep(700);
      const current = assistantText();
      const stop = document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('button[aria-label*="Stop"]') ||
        document.querySelector('button[aria-label*="stop"]');
      const isNew = current && current !== before;
      if (isNew && current !== last) { last = current; stableSince = Date.now(); }
      if (isNew && !stop && Date.now() - stableSince > 2200 && current.length > 20) return current.slice(-24000);
      if (Date.now() - startedAt > 15000 && !isNew) {
        const errorText = document.body.innerText || "";
        if (/You've reached the|message limit|try again later|verify you are human|Something went wrong/i.test(errorText)) {
          throw new Error("ChatGPT Free is rate-limited or requires user attention.");
        }
      }
    }
    throw new Error("Timed out waiting for ChatGPT's completed answer.");
  }
  async function poll() {
    if (busy || !document.visibilityState || document.visibilityState === "hidden") return;
    const { bridgeToken, enabled } = await chrome.storage.local.get(["bridgeToken", "enabled"]);
    if (!enabled || !bridgeToken) return;
    busy = true;
    try {
      const response = await fetch(LOCAL + "/next", { headers: { "X-SOLO-Bridge-Token": bridgeToken } });
      if (!response.ok) throw new Error("Local bridge is not available (" + response.status + ").");
      const data = await response.json();
      if (!data.task) return;
      const task = data.task;
      let answer = "", error = "";
      try {
        const instruction = "Ты — вспомогательный бесплатный ChatGPT для SOLO.Chat. Ответь на запрос пользователя по существу, на русском языке, если пользователь не просит другой язык. Учитывай предоставленный контекст, но не выдумывай факты и не утверждай, что выполняла действия, которых не выполняла. Если данных недостаточно, прямо обозначь ограничения и задай один необходимый уточняющий вопрос. Верни только готовый ответ.\n\nЗАПРОС И КОНТЕКСТ SOLO.Chat:\n" + task.prompt;
        answer = await submitPrompt(instruction);
      } catch (failure) { error = String(failure?.message || failure).slice(0, 500); }
      await fetch(LOCAL + "/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SOLO-Bridge-Token": bridgeToken },
        body: JSON.stringify({ requestId: task.requestId, answer, error })
      });
    } catch (error) {
      console.warn("[SOLO.Chat Bridge]", String(error?.message || error));
    } finally { busy = false; }
  }
  setInterval(poll, 2500);
  poll();
})();
