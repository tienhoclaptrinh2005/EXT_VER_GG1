"use strict";

async function toggleOverlay(tab) {
  if (!tab?.id) return;

  if (!/^(https?|file):/i.test(tab.url || "")) {
    await showActionError(tab.id, "Chrome không cho phép extension chạy trên trang hệ thống này.");
    return;
  }

  try {
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        namespace: "autoform-local",
        type: "TOGGLE_OVERLAY"
      });
    } catch {
      // Tabs that were already open before installation/reload need one manual injection.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/shared/core.js"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/content.js"]
      });
      response = await chrome.tabs.sendMessage(tab.id, {
        namespace: "autoform-local",
        type: "TOGGLE_OVERLAY"
      });
    }

    if (!response?.ok) throw new Error(response?.error || "Trang không phản hồi.");
    await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    await chrome.action.setTitle({ tabId: tab.id, title: "Bật/tắt AutoForm Local trên trang" });
  } catch (error) {
    console.warn("Không thể mở AutoForm Local trên trang:", error);
    await showActionError(tab.id, "Không thể chạy trên trang này. Kiểm tra quyền truy cập trang.");
  }
}

async function showActionError(tabId, title) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#d13b3b" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({ tabId, title });
  } catch {
    // The tab may have closed before the badge was updated.
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading") return;
  chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  chrome.action.setTitle({
    tabId,
    title: "Bật/tắt AutoForm Local trên trang"
  }).catch(() => {});
});

chrome.action.onClicked.addListener((tab) => {
  toggleOverlay(tab).catch((error) => {
    console.warn("Lỗi khi xử lý thao tác extension:", error);
  });
});
