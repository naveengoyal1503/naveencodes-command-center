const backendInput = document.getElementById("backendUrl");
const tokenInput = document.getElementById("token");
const providerInput = document.getElementById("provider");
const commandInput = document.getElementById("command");
const resultNode = document.getElementById("result");

const loadSettings = async () => {
  const stored = await chrome.storage.sync.get(["backendUrl", "token", "provider"]);
  if (stored.backendUrl) backendInput.value = stored.backendUrl;
  if (stored.token) tokenInput.value = stored.token;
  if (stored.provider) providerInput.value = stored.provider;
};

document.getElementById("send").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    backendUrl: backendInput.value.trim(),
    token: tokenInput.value.trim(),
    provider: providerInput.value
  });
  const activeTab = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" });
  const response = await fetch(`${backendInput.value.trim()}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokenInput.value.trim()}`
    },
    body: JSON.stringify({
      command: commandInput.value.trim(),
      url: activeTab?.url,
      provider: providerInput.value
    })
  });
  resultNode.textContent = JSON.stringify(await response.json(), null, 2);
});

loadSettings();
