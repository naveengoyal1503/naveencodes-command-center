const provider = "gemini";
const backendInput = document.getElementById("backendUrl");
const tokenInput = document.getElementById("token");
const commandInput = document.getElementById("command");
const resultNode = document.getElementById("result");

const loadSettings = async () => {
  const { backendUrl, token } = await chrome.storage.sync.get(["backendUrl", "token"]);
  if (backendUrl) backendInput.value = backendUrl;
  if (token) tokenInput.value = token;
};

const saveSettings = async () => {
  await chrome.storage.sync.set({
    backendUrl: backendInput.value.trim(),
    token: tokenInput.value.trim()
  });
};

document.getElementById("send").addEventListener("click", async () => {
  resultNode.textContent = "Sending command...";
  await saveSettings();

  const activeTab = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" });
  const payload = {
    command: commandInput.value.trim(),
    url: activeTab?.url || undefined,
    includeAiSummary: false,
    provider
  };

  try {
    const response = await fetch(`${backendInput.value.trim()}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenInput.value.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    resultNode.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    resultNode.textContent = error.message;
  }
});

loadSettings();
