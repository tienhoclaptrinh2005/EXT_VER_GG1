"use strict";

const core = globalThis.AutoFormCore;
const overlayMode = new URLSearchParams(location.search).get("mode") === "overlay";
document.body.classList.toggle("overlay-mode", overlayMode);

const PROFILE_KEYS = [
  "profileName", "firstName", "lastName", "fullName", "birthDate", "email", "phone",
  "studentId", "schoolName", "graduationDate", "country"
];

let activeProfileData = null;
let toastTimer = null;
let statusPollInterval = null;
let isBusy = false;

const elements = {
  tabs: Array.from(document.querySelectorAll(".nav-tab")),
  panels: Array.from(document.querySelectorAll(".panel")),
  siteUrlLabel: document.getElementById("siteUrlLabel"),
  ipBadge: document.getElementById("ipBadge"),
  refreshStatusBtn: document.getElementById("refreshStatusBtn"),
  pageStepLabel: document.getElementById("pageStepLabel"),
  serviceName: document.getElementById("serviceName"),
  serviceMeta: document.getElementById("serviceMeta"),
  serviceNotice: document.getElementById("serviceNotice"),
  pageStatusTitle: document.getElementById("pageStatusTitle"),
  pageStatusDesc: document.getElementById("pageStatusDesc"),
  statusUpdateTime: document.getElementById("statusUpdateTime"),
  cleanupStatus: document.getElementById("cleanupStatus"),
  profileCountry: document.getElementById("profileCountry"),
  displayFullName: document.getElementById("displayFullName"),
  displayStudentId: document.getElementById("displayStudentId"),
  displayClass: document.getElementById("displayClass"),
  displaySchool: document.getElementById("displaySchool"),
  displayDoc: document.getElementById("displayDoc"),
  flowStatusBanner: document.getElementById("flowStatusBanner"),
  flowStatusText: document.getElementById("flowStatusText"),
  newAndFillBtn: document.getElementById("newAndFillBtn"),
  fillCurrentBtn: document.getElementById("fillCurrentBtn"),
  stopBtn: document.getElementById("stopBtn"),
  uploadImageOnlyBtn: document.getElementById("uploadImageOnlyBtn"),
  copyProfileBtn: document.getElementById("copyProfileBtn"),
  profileForm: document.getElementById("profileForm"),
  fieldClass: document.getElementById("fieldClass"),
  fieldFaculty: document.getElementById("fieldFaculty"),
  docFormatSelect: document.getElementById("docFormatSelect"),
  clearProfile: document.getElementById("clearProfile"),
  openHuceCardGenerator: document.getElementById("openHuceCardGenerator"),
  appToast: document.getElementById("appToast"),
  cardThumbImg: document.getElementById("cardThumbImg"),
  cardThumbDetails: document.getElementById("cardThumbDetails"),
  downloadPngBtn: document.getElementById("downloadPngBtn"),
  downloadPdfBtn: document.getElementById("downloadPdfBtn"),
  minimizeOverlay: document.getElementById("minimizeOverlay"),
  closeOverlay: document.getElementById("closeOverlay")
};

function toast(message, type = "ok") {
  clearTimeout(toastTimer);
  elements.appToast.textContent = message;
  elements.appToast.className = `app-toast show${type === "error" ? " error" : ""}`;
  toastTimer = setTimeout(() => {
    elements.appToast.className = "app-toast";
  }, 3200);
}

function setFlowStatus(text, statusClass = "") {
  elements.flowStatusText.textContent = text;
  elements.flowStatusBanner.className = `status-banner ${statusClass}`.trim();
}

function switchTab(name) {
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  elements.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
}

function updateProfileDisplay(data) {
  if (!data) return;
  const fullName = (data.fullName || "NGUYỄN VĂN AN").toUpperCase();
  const studentId = data.studentId || "0174268";
  const className = data.className || data.custom?.class || "68TH1";
  const schoolName = data.schoolName || "Trường Đại học Xây dựng Hà Nội";
  const preferFormat = (elements.docFormatSelect?.value || "png").toLowerCase();
  const pngFilename = data.cardFilename || data.custom?.cardFilename || "HUCE_" + studentId + ".png";
  const pdfFilename = data.cardPdfFilename || data.custom?.cardPdfFilename || "HUCE_" + studentId + ".pdf";
  const docFilename = preferFormat === "pdf" ? pdfFilename : pngFilename;

  elements.displayFullName.textContent = fullName;
  elements.displayStudentId.textContent = studentId;
  elements.displayClass.textContent = className;
  elements.displaySchool.textContent = schoolName;
  elements.displayDoc.textContent = `📄 File upload: ${docFilename}`;
  elements.profileCountry.textContent = data.country || "Việt Nam (VN)";

  // Update card thumbnail preview
  const cardImg = data.cardImage || data.custom?.cardImage;
  if (cardImg && elements.cardThumbImg) {
    elements.cardThumbImg.src = cardImg;
    elements.cardThumbImg.style.display = "block";
    if (elements.cardThumbDetails) {
      elements.cardThumbDetails.textContent = `${docFilename} (${fullName})`;
    }
  }

  // Update profile form inputs
  PROFILE_KEYS.forEach((key) => {
    const input = elements.profileForm.elements.namedItem(key);
    if (input) input.value = data[key] || "";
  });
  if (elements.fieldClass) elements.fieldClass.value = className;
  if (elements.fieldFaculty) elements.fieldFaculty.value = data.faculty || data.custom?.faculty || "";
}

async function generateFreshHuceProfile() {
  if (typeof HuceRules === "undefined") {
    throw new Error("Chưa nạp được bộ thư viện HuceRules.");
  }

  const generated = HuceRules.generateRandomProfile();
  let docs = null;

  try {
    docs = await HuceRules.renderCardDocuments(generated);
  } catch (err) {
    console.warn("Lỗi render tài liệu thẻ SV:", err);
  }

  const pngDataUrl = docs?.pngDataUrl || "";
  const pdfDataUrl = docs?.pdfDataUrl || "";
  const pngFilename = docs?.pngFilename || HuceRules.getCardFilename(generated, "png");
  const pdfFilename = docs?.pdfFilename || HuceRules.getCardFilename(generated, "pdf");

  const customData = {
    class: generated.className,
    faculty: generated.faculty,
    course: generated.course,
    cohortK: generated.cohortK,
    cardImage: pngDataUrl,
    cardFilename: pngFilename,
    cardPdf: pdfDataUrl,
    cardPdfFilename: pdfFilename
  };

  const profile = {
    profileName: generated.fullName,
    firstName: `${generated.middleName ? generated.middleName + " " : ""}${generated.firstName}`,
    middleName: generated.middleName || "",
    lastName: generated.lastName,
    fullName: generated.fullName,
    birthDate: generated.birthDateIso,
    studentId: generated.studentId,
    schoolName: "Trường Đại học Xây dựng Hà Nội",
    email: generated.email,
    country: "Việt Nam",
    city: "Hà Nội",
    birthDay: generated.birthDay,
    birthMonth: generated.birthMonth,
    birthYear: generated.birthYear,
    cardImage: pngDataUrl,
    cardFilename: pngFilename,
    cardPdf: pdfDataUrl,
    cardPdfFilename: pdfFilename,
    custom: customData
  };

  activeProfileData = core.deriveProfile(profile);
  if (chrome.storage.session?.set) { await chrome.storage.session.set({ activeProfile: activeProfileData }).catch(() => {}); }
  await chrome.storage.local.set({ savedProfile: activeProfileData });

  updateProfileDisplay(activeProfileData);
  return activeProfileData;
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url) throw new Error("Không đọc được tab hiện tại.");
  const url = new URL(tab.url);
  return { tab, url };
}

function originPattern(url) {
  return `${url.protocol}//${url.host}/*`;
}

async function injectAndConnect(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { namespace: "autoform-local", type: "PING" });
    if (res?.ok) return res;
  } catch {
    // Need script injection
  }

  await chrome.scripting.executeScript({ target: { tabId }, files: ["src/shared/core.js"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.js"] });
  return chrome.tabs.sendMessage(tabId, { namespace: "autoform-local", type: "PING" });
}

async function connectPage(requestPermission = true) {
  const { tab, url } = await activeTab();
  let response = null;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { namespace: "autoform-local", type: "PING" });
  } catch {
    // Not injected yet
  }

  const origins = [originPattern(url)];
  if (!response?.ok) {
    let granted = await chrome.permissions.contains({ origins });
    if (!granted && requestPermission) {
      granted = await chrome.permissions.request({ origins });
    }
    if (!granted) throw new Error("Chưa cấp quyền cho trang: " + url.host);
    response = await injectAndConnect(tab.id);
  }

  return { tab, url };
}

async function pollPageStatus() {
  try {
    const { tab, url } = await activeTab();
    const cleanHost = url.host.replace(/^www\./, "");
    elements.siteUrlLabel.textContent = `${cleanHost} / ${url.pathname.replace(/^\//, "").split("/")[0] || "verify"}`;

    if (cleanHost.includes("google") || url.href.includes("google")) {
      elements.serviceName.textContent = "Google One";
      elements.serviceNotice.textContent = "Sẽ sử dụng: Google One (tự động)";
    } else if (cleanHost.includes("sheerid")) {
      elements.serviceName.textContent = "SheerID Student";
      elements.serviceNotice.textContent = "Sẽ sử dụng: SheerID Xác minh (tự động)";
    } else {
      elements.serviceName.textContent = cleanHost;
      elements.serviceNotice.textContent = `Sẽ sử dụng: ${cleanHost} (tự động)`;
    }

    const now = new Date();
    const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, "0")).join(":");
    elements.statusUpdateTime.textContent = `Cập nhật ${timeStr}`;

    const res = await chrome.tabs.sendMessage(tab.id, { namespace: "autoform-local", type: "GET_PAGE_STATUS" });
    if (res?.ok && res.status) {
      elements.pageStepLabel.textContent = res.status.title;
      elements.pageStatusTitle.textContent = res.status.title;
      elements.pageStatusDesc.textContent = res.status.detail;
    }
  } catch {
    // If not connected or inactive, ignore silently
  }
}

// Button [ Hồ sơ mới & điền ] - Full 1-Click Automation!
async function onNewAndFillClick() {
  if (isBusy) return;
  isBusy = true;
  setFlowStatus("Đang tạo hồ sơ sinh viên HUCE & phôi tài liệu...", "working");

  try {
    // 1. Generate new profile and document
    const profile = await generateFreshHuceProfile();
    toast(`Đã tạo hồ sơ: ${profile.fullName} (${profile.custom?.class || ""})`);

    // 2. Connect to tab
    setFlowStatus("Đang kết nối trang và bắt đầu điền thông tin...", "working");
    const { tab } = await connectPage();

    // 3. Send full flow automation
    const docFormat = elements.docFormatSelect?.value || "png";
    const response = await chrome.tabs.sendMessage(tab.id, {
      namespace: "autoform-local",
      type: "RUN_FULL_AUTO_FLOW",
      profile,
      options: {
        autoSubmit: true,
        allowUpload: true,
        docFormat
      }
    });

    if (response?.cancelled) {
      setFlowStatus("Đã dừng quy trình tự động.", "error");
      toast("Đã dừng tự động.");
    } else if (response?.ok) {
      const uploadedFile = response.filename || (docFormat === "pdf" ? activeProfileData.cardPdfFilename : activeProfileData.cardFilename) || "tài liệu";
      setFlowStatus(`✓ Đã xử lý thành công: ${uploadedFile} (${activeProfileData.fullName})!`);
      toast(`Đã hoàn tất xử lý & file ${uploadedFile}!`);
      await pollPageStatus();
    } else {
      setFlowStatus(response?.error || "Có lỗi trong quá trình tự động.", "error");
      toast(response?.error || "Lỗi tự động", "error");
    }
  } catch (err) {
    setFlowStatus(err.message || "Lỗi quy trình.", "error");
    toast(err.message, "error");
  } finally {
    isBusy = false;
  }
}

async function ensureProfileDocuments(profileData) {
  if (!profileData || typeof HuceRules === "undefined") return profileData;
  const hasPng = Boolean(profileData.cardImage || profileData.custom?.cardImage);
  const hasPdf = Boolean(profileData.cardPdf || profileData.custom?.cardPdf);
  if (hasPng && hasPdf) return profileData;

  try {
    const docs = await HuceRules.renderCardDocuments({
      ...profileData,
      className: profileData.className || profileData.custom?.class || "68TH1",
      faculty: profileData.faculty || profileData.custom?.faculty || "Công nghệ Thông tin",
      course: profileData.course || profileData.custom?.course || "2023-2027"
    });
    if (docs) {
      profileData.cardImage = docs.pngDataUrl;
      profileData.cardFilename = docs.pngFilename;
      profileData.cardPdf = docs.pdfDataUrl;
      profileData.cardPdfFilename = docs.pdfFilename;
      if (profileData.custom) {
        profileData.custom.cardImage = docs.pngDataUrl;
        profileData.custom.cardFilename = docs.pngFilename;
        profileData.custom.cardPdf = docs.pdfDataUrl;
        profileData.custom.cardPdfFilename = docs.pdfFilename;
      }
    }
  } catch (err) {
    console.warn("Lỗi tạo lại phôi tài liệu:", err);
  }
  return profileData;
}

// Button [ Điền thông tin ] - Fill current step with current active profile
async function onFillCurrentClick() {
  if (isBusy) return;
  isBusy = true;
  setFlowStatus("Đang điền thông tin vào trang...", "working");

  try {
    if (!activeProfileData) {
      activeProfileData = await generateFreshHuceProfile();
    } else {
      activeProfileData = await ensureProfileDocuments(activeProfileData);
    }

    const docFormat = elements.docFormatSelect?.value || "png";
    const { tab } = await connectPage();
    const response = await chrome.tabs.sendMessage(tab.id, {
      namespace: "autoform-local",
      type: "RUN_FULL_AUTO_FLOW",
      profile: activeProfileData,
      options: {
        autoSubmit: true,
        allowUpload: true,
        docFormat
      }
    });

    if (response?.ok) {
      setFlowStatus("Đã điền và xử lý bước hiện tại!");
      toast("Xử lý thành công!");
      await pollPageStatus();
    } else {
      const errMsg = response?.error || "Không thể điền bước này.";
      setFlowStatus(errMsg, "error");
      toast(errMsg, "error");
    }
  } catch (err) {
    setFlowStatus(err.message || "Lỗi điền thông tin.", "error");
    toast(err.message, "error");
  } finally {
    isBusy = false;
  }
}

// Button [ Dừng ] - Cancel ongoing auto flow
async function onStopClick() {
  isBusy = false;
  setFlowStatus("Đã dừng quy trình theo yêu cầu.", "error");
  try {
    const { tab } = await activeTab();
    await chrome.tabs.sendMessage(tab.id, { namespace: "autoform-local", type: "STOP_FLOW" });
  } catch {
    // Tab might not be connected
  }
  toast("Đã bấm dừng.");
}

// Button [ Chỉ Upload Ảnh Lại ] - Dedicated image-only upload when re-submission is requested
async function onUploadImageOnlyClick() {
  if (isBusy) return;
  isBusy = true;
  setFlowStatus("Đang chuẩn bị ảnh thẻ (.png) và upload riêng lên trang...", "working");

  try {
    if (!activeProfileData) {
      activeProfileData = await generateFreshHuceProfile();
    } else {
      activeProfileData = await ensureProfileDocuments(activeProfileData);
    }

    if (elements.docFormatSelect && elements.docFormatSelect.value !== "png") {
      elements.docFormatSelect.value = "png";
      updateProfileDisplay(activeProfileData);
    }

    const { tab } = await connectPage();
    const response = await chrome.tabs.sendMessage(tab.id, {
      namespace: "autoform-local",
      type: "UPLOAD_IMAGE_ONLY",
      profile: activeProfileData,
      options: {
        autoSubmit: true,
        allowUpload: true,
        clearPreviousFiles: true,
        docFormat: "png"
      }
    });

    if (response?.cancelled) {
      setFlowStatus("Đã dừng upload hình ảnh.", "error");
      toast("Đã dừng upload.");
    } else if (response?.ok) {
      const uploadedFile = response.filename || activeProfileData.cardFilename || "ảnh thẻ .png";
      setFlowStatus(`✓ Đã upload lại ảnh thành công: ${uploadedFile} (${activeProfileData.fullName})!`);
      toast(`Đã gửi lại hình ảnh: ${uploadedFile}!`);
      await pollPageStatus();
    } else {
      const errMsg = response?.error || "Không thể upload hình ảnh ở màn hình này.";
      setFlowStatus(errMsg, "error");
      toast(errMsg, "error");
    }
  } catch (err) {
    setFlowStatus(err.message || "Lỗi khi upload lại hình ảnh.", "error");
    toast(err.message, "error");
  } finally {
    isBusy = false;
  }
}

async function saveProfileForm(event) {
  event?.preventDefault();
  const formData = new FormData(elements.profileForm);
  const raw = {};
  PROFILE_KEYS.forEach(key => { raw[key] = String(formData.get(key) || ""); });

  raw.className = elements.fieldClass?.value || "";
  raw.faculty = elements.fieldFaculty?.value || "";
  raw.custom = {
    ...(activeProfileData?.custom || {}),
    class: raw.className,
    faculty: raw.faculty
  };

  let derived = core.deriveProfile(raw);
  // Luôn tạo lại phôi ảnh PNG & PDF khớp với thông tin vừa lưu
  derived.cardImage = "";
  derived.cardPdf = "";
  activeProfileData = await ensureProfileDocuments(derived);

  if (chrome.storage.session?.set) {
    await chrome.storage.session.set({ activeProfile: activeProfileData }).catch(() => {});
  }
  await chrome.storage.local.set({ savedProfile: activeProfileData });

  updateProfileDisplay(activeProfileData);
  toast("Đã lưu hồ sơ và cập nhật lại ảnh thẻ & PDF.");
}

async function clearProfileData() {
  elements.profileForm.reset();
  activeProfileData = null;
  const removes = [chrome.storage.local.remove("savedProfile")];
  if (chrome.storage.session?.remove) {
    removes.push(chrome.storage.session.remove("activeProfile").catch(() => {}));
  }
  await Promise.all(removes);
  setFlowStatus("Sẵn sàng điền thông tin.");
  toast("Đã xóa dữ liệu hồ sơ.");
}

async function copyProfileSummary() {
  if (!activeProfileData) return;
  const text = `Họ tên: ${activeProfileData.fullName}\nMSSV: ${activeProfileData.studentId}\nLớp: ${activeProfileData.className || activeProfileData.custom?.class || ""}\nTrường: ${activeProfileData.schoolName}\nEmail: ${activeProfileData.email}\nNgày sinh: ${activeProfileData.birthDate}`;
  try {
    await navigator.clipboard.writeText(text);
    toast("Đã chép thông tin hồ sơ vào Clipboard!");
  } catch {
    toast("Không thể chép vào Clipboard", "error");
  }
}

let cachedPublicIp = null;

async function fetchRealIp(force = false) {
  if (cachedPublicIp && !force) return cachedPublicIp;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedPublicIp = data.ip;
        if (elements.ipBadge) elements.ipBadge.textContent = `IPv4 ${data.ip}`;
        return data.ip;
      }
    }
  } catch {
    // If offline or fetch fails, keep default
  }
  return null;
}

function downloadActivePng() {
  if (!activeProfileData) {
    toast("Chưa có hồ sơ sinh viên để tải.", "error");
    return;
  }
  const pngDataUrl = activeProfileData.cardImage || activeProfileData.custom?.cardImage;
  if (!pngDataUrl) {
    toast("Chưa có dữ liệu ảnh PNG của hồ sơ này.", "error");
    return;
  }
  const filename = activeProfileData.cardFilename
    || activeProfileData.custom?.cardFilename
    || "HUCE_" + (activeProfileData.studentId || "the_sv") + ".png";

  try {
    const arr = pngDataUrl.split(",");
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    toast(`Đã tải xuống ảnh: ${filename}`);
  } catch (err) {
    toast("Lỗi tải ảnh: " + err.message, "error");
  }
}

function downloadActivePdf() {
  if (!activeProfileData) {
    toast("Chưa có hồ sơ sinh viên để tải.", "error");
    return;
  }
  const pdfDataUrl = activeProfileData.cardPdf || activeProfileData.custom?.cardPdf;
  if (!pdfDataUrl) {
    toast("Chưa có dữ liệu file PDF của hồ sơ này.", "error");
    return;
  }
  const filename = activeProfileData.cardPdfFilename
    || activeProfileData.custom?.cardPdfFilename
    || "HUCE_" + (activeProfileData.studentId || "the_sv") + ".pdf";

  try {
    const arr = pdfDataUrl.split(",");
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    toast(`Đã tải xuống file: ${filename}`);
  } catch (err) {
    toast("Lỗi tải file: " + err.message, "error");
  }
}

function isProfileExpired(profile) {
  if (!profile) return true;
  const courseStr = String(profile.course || profile.custom?.course || "").trim();
  const match = courseStr.match(/(\d{4})\s*-\s*(\d{4})/);
  if (match && Number(match[2]) <= 2026) return true;
  const cohortK = Number(profile.cohortK || profile.custom?.cohortK || 0);
  if (cohortK > 0 && cohortK < 68) return true;
  const sid = String(profile.studentId || "").trim();
  if (sid.endsWith("66") || sid.endsWith("67")) return true;
  const cls = String(profile.className || profile.custom?.class || "").trim();
  if (/^(66|67)/i.test(cls)) return true;
  return false;
}

async function restoreState() {
  let local = {};
  let session = {};
  try {
    const res = await Promise.all([
      chrome.storage.local.get(["savedProfile"]).catch(() => ({})),
      chrome.storage.session?.get ? chrome.storage.session.get("activeProfile").catch(() => ({})) : Promise.resolve({})
    ]);
    local = res[0] || {};
    session = res[1] || {};
  } catch (err) {
    console.warn("Restore state error:", err);
  }

  const candidate = session?.activeProfile || local?.savedProfile;
  if (candidate && !isProfileExpired(candidate)) {
    activeProfileData = await ensureProfileDocuments(candidate);
    updateProfileDisplay(activeProfileData);
  } else {
    // Khởi tạo mới nếu chưa có hồ sơ hoặc hồ sơ cũ trong bộ nhớ thuộc khóa đã hết hạn (K66, K67)
    await generateFreshHuceProfile();
  }

  await pollPageStatus();
  fetchRealIp(false);
  statusPollInterval = setInterval(pollPageStatus, 2000);
}

// Event Listeners
elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
elements.newAndFillBtn?.addEventListener("click", onNewAndFillClick);
elements.fillCurrentBtn?.addEventListener("click", onFillCurrentClick);
elements.stopBtn?.addEventListener("click", onStopClick);
elements.uploadImageOnlyBtn?.addEventListener("click", onUploadImageOnlyClick);
elements.refreshStatusBtn?.addEventListener("click", () => {
  pollPageStatus();
  fetchRealIp(true);
  toast("Đã làm mới thông tin và IP mạng.");
});
elements.downloadPngBtn?.addEventListener("click", downloadActivePng);
elements.downloadPdfBtn?.addEventListener("click", downloadActivePdf);
elements.docFormatSelect?.addEventListener("change", () => {
  if (activeProfileData) updateProfileDisplay(activeProfileData);
});
elements.copyProfileBtn?.addEventListener("click", copyProfileSummary);
elements.profileForm?.addEventListener("submit", saveProfileForm);
elements.clearProfile?.addEventListener("click", clearProfileData);

elements.openHuceCardGenerator?.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("huce-card-generator.html") });
  } else {
    window.open("../../huce-card-generator.html", "_blank");
  }
});

elements.minimizeOverlay?.addEventListener("click", () => {
  window.parent.postMessage({ source: "autoform-local-ui", type: "TOGGLE_MINIMIZE" }, "*");
});

elements.closeOverlay?.addEventListener("click", () => {
  window.parent.postMessage({ source: "autoform-local-ui", type: "CLOSE_OVERLAY" }, "*");
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.savedProfile?.newValue) {
      activeProfileData = changes.savedProfile.newValue;
      updateProfileDisplay(activeProfileData);
    }
  });
}

restoreState().catch((err) => console.error("Restore error:", err));
