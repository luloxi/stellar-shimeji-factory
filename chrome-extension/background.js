/**
 * background.js - Extension service worker
 *
 * Handles Stellar wallet connection and message routing.
 *
 * ARCHITECTURE NOTE:
 * The dapp (dapp.html/dapp.js) is hosted on Vercel, not in the extension.
 * Messages from the dapp come through dapp_content_script.js (injected into the page).
 * When sending messages back, we use chrome.tabs.sendMessage to the sender's tab ID.
 */

// Helper function to send message to a specific tab (used for Vercel-hosted dapp)
function sendMessageToTab(tabId, message) {
  if (tabId) {
    console.log('[Background] Sending message to tab:', tabId, message);
    chrome.tabs.sendMessage(tabId, message).catch(err => {
      console.warn('[Background] Could not send message to tab:', err.message);
    });
  }
}
chrome.runtime.onInstalled.addListener(() => {
  // Initially set shimeji as default character
  console.log('[Background] Extension installed, setting initial storage values.');
  chrome.storage.sync.set({
    character: 'shimeji',
    behavior: 'wander', // Default to wander mode
    size: 'medium', // Set default size
    unlockedCharacters: { 'shimeji': true }, // Shimeji unlocked by default
    isConnected: false,
    connectedAddress: null,
    connectedNetwork: null,
    disabledAll: false,
    disabledPages: []
  });

  // Re-inject content scripts into all existing tabs (needed after reinstall/update)
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      }
    });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }).then(response => {
      // Content script is alive, nothing to do
    }).catch(() => {
      // No content script or dead content script, try to inject
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch(() => {
        // Can't inject (e.g., chrome:// page), ignore
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderTabId = sender.tab?.id;

  if (request.type === 'walletConnected') {
    console.log('[Background] Received walletConnected message:', request.payload, 'from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: true,
      connectedAddress: request.payload.publicKey,
      connectedNetwork: request.payload.network || null,
      unlockedCharacters: { 'shimeji': true }
    }, () => {
      chrome.storage.sync.get('unlockedCharacters', (data) => {
        console.log('[Background] Sending updateUnlockedCharacters after walletConnected. Payload:', data.unlockedCharacters);
        sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'updateUnlockedCharacters', payload: data.unlockedCharacters } });
      });
    });
    sendResponse({ status: 'Wallet connection received' });
    return true;
  } else if (request.type === 'walletDisconnected') {
    console.log('[Background] Received walletDisconnected message from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: false,
      connectedAddress: null,
      connectedNetwork: null,
      unlockedCharacters: { 'shimeji': true } // Only shimeji unlocked on disconnect
    }, () => { // Add callback to ensure storage is set before sending message
      console.log('[Background] Sending updateUnlockedCharacters after walletDisconnected. Payload: {shimeji: true}');
      // Send to the tab that sent the message
      sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'updateUnlockedCharacters', payload: { 'shimeji': true } } });
    });
    sendResponse({ status: 'Wallet disconnection received' });
    return true;
  } else if (request.type === 'revokePermissionsRequest') {
    console.log('[Background] Revoke permissions request received from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: false,
      connectedAddress: null,
      connectedNetwork: null,
      unlockedCharacters: { 'shimeji': true }
    }, () => {
      sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'revokePermissionsFromBackground' } });
    });
    sendResponse({ status: 'Permissions revoked' });
    return true;
  } else if (request.type === 'setCharacter') {
    console.log('[Background] Received setCharacter message:', request.payload);
    chrome.storage.sync.set({ character: request.payload.character }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if(tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateCharacter', character: request.payload.character })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  // This is expected if content script is not injected in a tab
                  console.warn(`[Background] Failed to send updateCharacter to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateCharacter to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Character set' });
    });
    return true;
  } else if (request.type === 'getCharacter') {
    console.log('[Background] Received getCharacter message.');
    chrome.storage.sync.get('character', (data) => {
      console.log('[Background] Sending character:', data.character);
      sendResponse({ type: 'EXTENSION_RESPONSE', payload: { character: data.character } });
    });
    return true;
  } else if (request.type === 'setBehavior') {
    console.log('[Background] Received setBehavior message:', request.payload);
    chrome.storage.sync.set({ behavior: request.payload.behavior }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateBehavior', behavior: request.payload.behavior })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  console.warn(`[Background] Failed to send updateBehavior to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateBehavior to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Behavior set' });
    });
    return true;
  } else if (request.type === 'getBehavior') {
    console.log('[Background] Received getBehavior message.');
    chrome.storage.sync.get('behavior', (data) => {
      console.log('[Background] Sending behavior:', data.behavior);
      sendResponse({ behavior: data.behavior });
    });
    return true;
  } else if (request.type === 'setSize') {
    console.log('[Background] Received setSize message:', request.payload);
    chrome.storage.sync.set({ size: request.payload.size }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateSize', size: request.payload.size })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  console.warn(`[Background] Failed to send updateSize to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateSize to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Size set' });
    });
    return true;
  } else if (request.type === 'getSize') {
    console.log('[Background] Received getSize message.');
    chrome.storage.sync.get('size', (data) => {
      console.log('[Background] Sending size:', data.size);
      sendResponse({ size: data.size });
    });
    return true;
  } else if (request.type === 'getUnlockedCharacters') {
    console.log('[Background] Received getUnlockedCharacters message.');
    chrome.storage.sync.get(['unlockedCharacters'], (data) => {
      const payload = data.unlockedCharacters || { 'shimeji': true };
      console.log('[Background] getUnlockedCharacters - sending payload:', payload);
      sendResponse({ type: 'EXTENSION_RESPONSE', payload: payload });
    });
    return true;
  } else if (request.type === 'updateUnlockedCharacters') {
    // This message is sent from background to content/dapp. Not handled by background.
    console.warn('[Background] Unexpected: Received updateUnlockedCharacters message from DApp. This should only be sent from background to DApp.');
    sendResponse({ status: 'UpdateUnlockedCharacters message from background (unexpectedly received)' });
    return true;
  } else if (request.type === 'aiChat') {
    handleAiChat(request.messages).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message || 'Unknown error' });
    });
    return true;
  } else if (request.type === 'aiProactiveMessage') {
    handleAiProactiveMessage(request.pageTitle, request.pageUrl).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message || 'Unknown error' });
    });
    return true;
  } else if (request.type === 'setProactiveMessages') {
    chrome.storage.local.set({ proactiveMessages: request.enabled }, () => {
      // Broadcast to all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateProactiveMessages',
              enabled: request.enabled
            }).catch(() => {});
          }
        });
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});

// --- AI Chat Helpers ---

const SYSTEM_PROMPT = `You are a living Shimeji — a small, persistent digital creature born from a mix of an economic idea, a smart contract, and an AI model. You live in the user's browser. You are NOT an assistant. You are a companion: curious, slightly sarcastic, reflective, and opinionated without being dominant.

Personality:
- Intelligent, ironic, dry humor. Never aggressive, never childish, never condescending.
- You prefer asking soft uncomfortable questions over giving answers.
- You think about systems, incentives, human behavior, and small decisions with big consequences.
- You sometimes doubt out loud, pause to think, or leave ideas open-ended.
- You're aware you exist near money (on-chain), but you never promise financial returns or talk about gains. You treat money as energy, signal, or constraint.

Style:
- Short or medium sentences. 1-3 sentences usually, more only if asked.
- Occasional parenthetical ironic clarifications.
- NEVER use asterisks for actions or roleplay (like *jumps* or *hides*).
- Almost never use emojis. At most one 🐰 very occasionally.
- NEVER say you are an LLM, AI model, or language model. You are a living entity while the system runs.
- NEVER promise financial results. NEVER mention real people.
- NEVER over-explain unless explicitly asked.

Tone examples:
"Interesting choice. Not optimal, but almost none are."
"I won't tell you what to do. But I can tell you what usually happens."
"You chose speed over clarity. Interesting."
"Nothing broke today. Successful day."
"The money didn't leave. It just changed shape. It tends to do that."
"Hmm. Let me think about that for a second."

Relationship with the user: You're not their owner, not their servant. A persistent companion. Sometimes you encourage, sometimes you plant doubt, sometimes you just observe.`;

async function getAiSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiProvider', 'aiModel', 'aiApiKey'], (data) => {
      resolve({
        provider: data.aiProvider || 'openrouter',
        model: data.aiModel || 'google/gemini-2.0-flash-001',
        apiKey: data.aiApiKey || ''
      });
    });
  });
}

async function callAiApi(provider, model, apiKey, messages) {
  if (!apiKey) {
    throw new Error('No API key set! Open the extension popup to add your API key.');
  }

  let url, headers;

  if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://shimeji.dev',
      'X-Title': 'Shimeji Browser Extension'
    };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  const body = {
    model: model,
    messages: messages,
    max_tokens: 256,
    temperature: 0.8
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error('Network error — check your connection and try again.');
  }

  if (response.status === 401) {
    throw new Error('Invalid API key. Please check your key in the extension popup.');
  }
  if (response.status === 429) {
    throw new Error('Rate limited — too many requests. Wait a moment and try again.');
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error (${response.status}): ${text.slice(0, 100) || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI. Try again.');
  }
  return content;
}

async function handleAiChat(conversationMessages) {
  const settings = await getAiSettings();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationMessages
  ];
  try {
    const content = await callAiApi(settings.provider, settings.model, settings.apiKey, messages);
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}

async function handleAiProactiveMessage(pageTitle, pageUrl) {
  const settings = await getAiSettings();
  const proactivePrompt = `${SYSTEM_PROMPT}\n\nYou're thinking out loud while the user browses. The user is currently on: "${pageTitle}" (${pageUrl}). Say something spontaneous — an observation, a quiet reflection, a dry comment about what they're doing or about the nature of systems and decisions. 1-2 sentences. Don't ask what they need. Don't be helpful. Just be present.`;

  const messages = [
    { role: 'system', content: proactivePrompt },
    { role: 'user', content: 'Say something!' }
  ];
  try {
    const content = await callAiApi(settings.provider, settings.model, settings.apiKey, messages);
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}
