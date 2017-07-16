const SELECTION_CONTEXT_MENU_ID = 'SELECTION_CONTEXT_MENU_ID';
const MAIN_PAGE_URL = chrome.runtime.getURL('main.html');

function onSelectionContextMenuFired(info, tab) {
  console.assert(info.menuItemId === SELECTION_CONTEXT_MENU_ID);
  const current_time = new Date();
  let insertion = {};
  insertion[current_time]	= {
    'url': info.pageUrl,
    'text': info.selectionText,
    'timestamp': current_time.toString(),
    'title': tab.title,
    'labels': ['blanc', 'blanc', 'blanc', 'blanc'],
  };
  chrome.storage.local.set(insertion, () => {
    if (chrome.runtime.lastError) {
      console.error('Unable to add selection to local storage');
    }
  });
}

function registerSelectionContextMenu() {
  chrome.contextMenus.onClicked.addListener(onSelectionContextMenuFired);
  chrome.contextMenus.create({
    id: SELECTION_CONTEXT_MENU_ID,
    title: 'Cite "%s"',
    contexts: ["selection"],

  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Unable to create context menu: %s', chrome.runtime.lastError);
    }
  });
}

function activateTab(tab) {
  chrome.tabs.update(tab.id, {active: true}, () => {
    if (chrome.runtime.lastError) {
      console.error('Unable to activate tab :(');
    }
  })
}

function createTab(url) {
  chrome.tabs.create({url: url}, () => {
    if (chrome.runtime.lastError) {
      console.error('Unable to create tab with main page.');
    }
  });
}

function createOrActivateMainPage(tab) {
  chrome.tabs.query({url: MAIN_PAGE_URL, windowId: tab.windowId}, tabs => {
    if (tabs && tabs.length > 0) {
      activateTab(tabs[0]);
    } else {
      createTab(MAIN_PAGE_URL);
    }
  })
}

function registerBrowserActionClickCallback() {
  chrome.browserAction.onClicked.addListener(createOrActivateMainPage);
}

chrome.runtime.onStartup.addListener(() => {
  registerSelectionContextMenu();
  registerBrowserActionClickCallback();
});

chrome.runtime.onInstalled.addListener(() => {
  registerSelectionContextMenu();
  registerBrowserActionClickCallback();
});
