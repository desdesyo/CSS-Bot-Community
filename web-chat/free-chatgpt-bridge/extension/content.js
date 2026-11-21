(() => {
  if (window.__soloFreeBridgeInstalled) return;
  window.__soloFreeBridgeInstalled = true;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let busy = false;
  const bridgeRequest = async (path, method = "GET", body = {}) => {
    const result = await chrome.runtime.sendMessage({ type: "solo-bridge-http", path, method, body });
    if (!result?.ok) {
      if (result?.disabled) return null;
      throw new Error(result?.error || "Local bridge request failed");
    }
    return result.data;
  };
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
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, text);
      if (String(node.innerText || "").trim() !== text) node.textContent = text;
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
      const fullText = assistantText();
      const current = fullText.startsWith(before) ? fullText.slice(before.length).trim() : fullText;
      const stop = document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('button[aria-label*="Stop"]') ||
        document.querySelector('button[aria-label*="stop"]');
      const isNew = current && current.length > 0;
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
  const chatGPTReady = () => {
    const node = composer();
    if (!node) return false;
    const visibleText = String(document.body?.innerText || "").slice(0, 2500);
    return !/log in to continue|sign up to continue|verify you are human|unusual activity/i.test(visibleText);
  };
  let lastHeartbeat = 0;
  async function heartbeat() {
    if (!chatGPTReady()) return;
    if (Date.now() - lastHeartbeat < 15000) return;
    lastHeartbeat = Date.now();
    await bridgeRequest("heartbeat", "POST");
  }
  async function poll() {
    if (busy || !chatGPTReady()) return;
    busy = true;
    try {
      await heartbeat();
      const data = await bridgeRequest("next");
      if (!data?.task) return;
      const task = data.task;
      let answer = "", error = "";
      try {
        const instruction = "Ты — вспомогательный бесплатный ChatGPT для SOLO.Chat. Ответь на запрос пользователя по существу, на русском языке, если пользователь не просит другой язык. Учитывай предоставленный контекст, но не выдумывай факты и не утверждай, что выполняла действия, которых не выполняла. Если данных недостаточно, прямо обозначь ограничения и задай один необходимый уточняющий вопрос. Верни только готовый ответ.\n\nЗАПРОС И КОНТЕКСТ SOLO.Chat:\n" + task.prompt;
        answer = await submitPrompt(instruction);
      } catch (failure) { error = String(failure?.message || failure).slice(0, 500); }
      await bridgeRequest("result", "POST", { requestId: task.requestId, answer, error });
    } catch (error) {
      console.warn("[SOLO.Chat Bridge]", String(error?.message || error));
    } finally { busy = false; }
  }
  setInterval(poll, 2500);
  poll();
})();
