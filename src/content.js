(function initAutoFormContent() {
  "use strict";

  if (globalThis.__autoFormLocalInjected) return;
  globalThis.__autoFormLocalInjected = true;

  const core = globalThis.AutoFormCore;
  const BLOCKED_TYPES = new Set(["hidden", "password", "submit", "button", "reset", "image"]);
  const OVERLAY_HOST_ID = "autoform-local-overlay-host";
  let overlayHost = null;
  let overlayFrame = null;

  function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function removeOverlay() {
    overlayHost?.remove();
    overlayHost = null;
    overlayFrame = null;
  }

  function createOverlay() {
    const existing = document.getElementById(OVERLAY_HOST_ID);
    if (existing) {
      existing.remove();
      overlayHost = null;
      overlayFrame = null;
      return { open: false };
    }

    overlayHost = document.createElement("div");
    overlayHost.id = OVERLAY_HOST_ID;
    overlayHost.style.setProperty("all", "initial", "important");
    overlayHost.style.setProperty("position", "fixed", "important");
    overlayHost.style.setProperty("z-index", "2147483647", "important");
    overlayHost.style.setProperty("top", "16px", "important");
    overlayHost.style.setProperty("right", "16px", "important");
    overlayHost.style.setProperty("width", "min(500px, calc(100vw - 32px))", "important");
    overlayHost.style.setProperty("height", "min(760px, calc(100vh - 32px))", "important");
    overlayHost.style.setProperty("min-width", "360px", "important");
    overlayHost.style.setProperty("min-height", "86px", "important");
    overlayHost.style.setProperty("max-width", "calc(100vw - 16px)", "important");
    overlayHost.style.setProperty("max-height", "calc(100vh - 16px)", "important");
    overlayHost.style.setProperty("overflow", "hidden", "important");
    overlayHost.style.setProperty("resize", "both", "important");

    const shadow = overlayHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      .window {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border: 1px solid rgba(44, 233, 120, .72);
        border-radius: 22px;
        background: #0b110d;
        box-shadow: 0 24px 70px rgba(0, 0, 0, .42), 0 0 25px rgba(44, 233, 120, .1);
      }
      .window.minimized {
        height: 100%;
      }
      .drag-handle {
        position: absolute;
        z-index: 2;
        top: 0;
        left: 70px;
        right: 94px;
        height: 24px;
        cursor: move;
        touch-action: none;
      }
      .drag-handle::after {
        content: "";
        position: absolute;
        top: 6px;
        left: 50%;
        width: 42px;
        height: 3px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: rgba(138, 242, 175, .32);
      }
      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 21px;
        background: #0b110d;
      }
    `;

    const shell = document.createElement("div");
    shell.className = "window";
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.title = "Kéo để di chuyển";
    overlayFrame = document.createElement("iframe");
    overlayFrame.title = "AutoForm Local";
    overlayFrame.allow = "clipboard-write";
    overlayFrame.src = chrome.runtime.getURL("src/sidepanel/sidepanel.html?mode=overlay");

    shell.append(dragHandle, overlayFrame);
    shadow.append(style, shell);
    document.documentElement.appendChild(overlayHost);

    let dragging = null;
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = overlayHost.getBoundingClientRect();
      dragging = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      dragHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    dragHandle.addEventListener("pointermove", (event) => {
      if (!dragging || dragging.pointerId !== event.pointerId) return;
      const width = overlayHost.getBoundingClientRect().width;
      const height = overlayHost.getBoundingClientRect().height;
      const left = clamp(event.clientX - dragging.offsetX, 0, Math.max(0, innerWidth - width));
      const top = clamp(event.clientY - dragging.offsetY, 0, Math.max(0, innerHeight - Math.min(height, 88)));
      overlayHost.style.setProperty("left", `${left}px`, "important");
      overlayHost.style.setProperty("top", `${top}px`, "important");
      overlayHost.style.removeProperty("right");
    });
    const stopDragging = (event) => {
      if (dragging?.pointerId === event.pointerId) dragging = null;
    };
    dragHandle.addEventListener("pointerup", stopDragging);
    dragHandle.addEventListener("pointercancel", stopDragging);

    const onFrameMessage = (event) => {
      if (!overlayFrame || event.source !== overlayFrame.contentWindow) return;
      if (event.data?.source !== "autoform-local-ui") return;
      if (event.data.type === "CLOSE_OVERLAY") removeOverlay();
      if (event.data.type === "TOGGLE_MINIMIZE") {
        const minimized = shell.classList.toggle("minimized");
        if (minimized) {
          overlayHost.dataset.expandedHeight = `${overlayHost.getBoundingClientRect().height}`;
          overlayHost.style.setProperty("height", "88px", "important");
          overlayHost.style.setProperty("resize", "none", "important");
        } else {
          const restoredHeight = Number(overlayHost.dataset.expandedHeight) || Math.min(760, innerHeight - 32);
          overlayHost.style.setProperty("height", `${clamp(restoredHeight, 120, innerHeight - 16)}px`, "important");
          overlayHost.style.setProperty("resize", "both", "important");
        }
      }
    };
    window.addEventListener("message", onFrameMessage, { signal: (() => {
      const controller = new AbortController();
      const observer = new MutationObserver(() => {
        if (!overlayHost?.isConnected) {
          controller.abort();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      return controller.signal;
    })() });

    return { open: true };
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function getLabel(element) {
    const pieces = [];
    if (element.labels && element.labels.length) pieces.push(...Array.from(element.labels, (label) => label.textContent || ""));
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) pieces.push(wrappingLabel.textContent || "");
    if (element.id) {
      try {
        const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (explicit) pieces.push(explicit.textContent || "");
      } catch {
        // An unusual id must not stop the scan.
      }
    }
    pieces.push(
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || "",
      element.getAttribute("name") || "",
      element.getAttribute("id") || "",
      element.getAttribute("data-testid") || ""
    );
    return pieces.join(" ").replace(/\s+/g, " ").trim();
  }

  function describe(element) {
    const label = getLabel(element);
    return label || element.tagName.toLowerCase();
  }

  function getCandidates() {
    const selector = [
      "input:not([disabled]):not([readonly])",
      "select:not([disabled])",
      "textarea:not([disabled]):not([readonly])",
      "[contenteditable='true']"
    ].join(",");

    return Array.from(document.querySelectorAll(selector)).filter((element) => {
      const type = (element.getAttribute("type") || "").toLowerCase();
      return !BLOCKED_TYPES.has(type) && isVisible(element);
    });
  }

  function hasValue(element) {
    if (element.matches("[contenteditable='true']")) return Boolean((element.textContent || "").trim());
    if (element.type === "file") return Boolean(element.files && element.files.length > 0);
    if (element.type === "checkbox" || element.type === "radio") return element.checked;
    return Boolean(String(element.value ?? "").trim());
  }

  function valueForElement(element, rawValue) {
    const value = String(rawValue ?? "");
    if (element.tagName === "INPUT" && element.type === "date" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    return value;
  }

  function dispatchEditEvents(element, value, skipBlur = false) {
    try {
      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: String(value)
      }));
    } catch {
      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    if (!skipBlur) {
      element.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
    }
  }

  function setFileInputValue(element, dataUrl, filename) {
    if (!dataUrl || !element || element.type !== "file") return false;
    try {
      const arr = String(dataUrl).split(",");
      if (arr.length < 2 || !arr[1]) return false;
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || "image/png";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const defaultName = mime === "application/pdf" ? "the_sinh_vien.pdf" : "the_sinh_vien.png";
      const file = new File([blob], filename || defaultName, { type: mime, lastModified: Date.now() });

      const dt = new DataTransfer();
      dt.items.add(file);

      const inputProto = window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(element);
      const filesSetter = Object.getOwnPropertyDescriptor(inputProto, "files")?.set;
      if (filesSetter) {
        filesSetter.call(element, dt.files);
      } else {
        element.files = dt.files;
      }

      if (element._valueTracker) {
        element._valueTracker.setValue("");
      }

      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

      // Chỉ phát sự kiện drop nếu input.files chưa nhận được file
      if (!element.files || element.files.length === 0) {
        const dropzone = element.closest("[data-dropzone], .dropzone, label, .upload-container") || element.parentElement;
        if (dropzone && dropzone !== element) {
          try {
            const dropEvt = new DragEvent("drop", {
              bubbles: true,
              composed: true,
              dataTransfer: dt
            });
            dropzone.dispatchEvent(dropEvt);
          } catch {
            // Ignored if DragEvent constructor fails in some contexts
          }
        }
      }
      return true;
    } catch (err) {
      console.warn("[AutoForm Local] File upload error:", err);
      return false;
    }
  }

  function setNativeValue(element, rawValue, proposal, skipBlur = false) {
    if (element.tagName === "INPUT" && element.type === "file") {
      return setFileInputValue(element, proposal?.fileDataUrl || rawValue, proposal?.filename);
    }

    const value = valueForElement(element, rawValue);

    if (element.matches("[contenteditable='true']")) {
      element.focus();
      element.textContent = value;
      dispatchEditEvents(element, value, skipBlur);
      return true;
    }

    if (element.tagName === "SELECT") {
      const wanted = value.trim().toLocaleLowerCase();
      const numWanted = parseInt(wanted, 10);
      const options = Array.from(element.options || []);
      const VN_MONTHS_LOWER = [
        "", "tháng một", "tháng hai", "tháng ba", "tháng tư", "tháng năm", "tháng sáu",
        "tháng bảy", "tháng tám", "tháng chín", "tháng mười", "tháng mười một", "tháng mười hai"
      ];
      const EN_MONTHS_LOWER = [
        "", "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];

      const option = options.find((item) => item.value.trim().toLocaleLowerCase() === wanted)
        || options.find((item) => item.textContent.trim().toLocaleLowerCase() === wanted)
        || (!isNaN(numWanted) && numWanted >= 1 && numWanted <= 12 ? (
            options.find(item => item.textContent.trim().toLowerCase() === VN_MONTHS_LOWER[numWanted])
            || options.find(item => item.textContent.trim().toLowerCase().includes(VN_MONTHS_LOWER[numWanted]))
            || options.find(item => item.value.trim().toLowerCase() === EN_MONTHS_LOWER[numWanted])
            || options.find(item => {
                const vNum = parseInt(item.value, 10);
                const tNum = parseInt(item.textContent, 10);
                return vNum === numWanted || tNum === numWanted;
              })
            || (element.options && element.options.length >= numWanted + 1 ? element.options[numWanted] : null)
          ) : null)
        || (!isNaN(numWanted) ? options.find((item) => {
            const vNum = parseInt(item.value, 10);
            const tNum = parseInt(item.textContent, 10);
            return vNum === numWanted || tNum === numWanted;
          }) : null)
        || options.find((item) => item.textContent.trim().toLocaleLowerCase().includes(wanted));
      if (!option) return false;

      element.focus();
      const selectProto = window.HTMLSelectElement ? window.HTMLSelectElement.prototype : Object.getPrototypeOf(element);
      const selectSetter = Object.getOwnPropertyDescriptor(selectProto, "value")?.set;
      if (selectSetter) selectSetter.call(element, option.value);
      else element.value = option.value;
      element.selectedIndex = option.index;
      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      if (!skipBlur) {
        element.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
      }
      return true;
    }

    const inputProto = element.tagName === "TEXTAREA"
      ? (window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : Object.getPrototypeOf(element))
      : (window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(element));
    const setter = Object.getOwnPropertyDescriptor(inputProto, "value")?.set;
    element.focus();

    let typed = false;
    try {
      element.select();
      document.execCommand("selectAll", false, null);
      typed = document.execCommand("insertText", false, value);
    } catch {
      typed = false;
    }

    if (!typed || element.value !== value) {
      const prev = element.value;
      if (setter) setter.call(element, value);
      else element.value = value;
      if (element._valueTracker) {
        element._valueTracker.setValue(prev);
      }
    }

    const lastChar = String(value).slice(-1);
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, composed: true, key: lastChar }));
    element.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, composed: true, key: lastChar }));
    dispatchEditEvents(element, value, skipBlur);
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, composed: true, key: lastChar }));
    return true;
  }

  function resolveUploadDocument(profile, options = {}) {
    const preferFormat = String(options.docFormat || profile?.docFormat || "png").toLowerCase();
    const pngData = profile.cardImage || profile.custom?.cardImage || "";
    const pdfData = profile.cardPdf || profile.custom?.cardPdf || "";
    const pngName = profile.cardFilename || profile.custom?.cardFilename || "HUCE_the_sinh_vien.png";
    const pdfName = profile.cardPdfFilename || profile.custom?.cardPdfFilename || "HUCE_the_sinh_vien.pdf";

    if (preferFormat === "png" && pngData) {
      return { fileDataUrl: pngData, filename: pngName };
    }
    if (preferFormat === "pdf" && pdfData) {
      return { fileDataUrl: pdfData, filename: pdfName };
    }
    if (pngData) {
      return { fileDataUrl: pngData, filename: pngName };
    }
    if (pdfData) {
      return { fileDataUrl: pdfData, filename: pdfName };
    }
    return { fileDataUrl: "", filename: "" };
  }

  function createProposal(element, key, profile, source, options = {}) {
    if (key === "studentCardImage" || (element.tagName === "INPUT" && element.type === "file")) {
      const { fileDataUrl, filename } = resolveUploadDocument(profile, options);
      if (!fileDataUrl) return null;
      return {
        element,
        key: "studentCardImage",
        label: describe(element) || "Tải lên thẻ sinh viên (File)",
        value: filename,
        fileDataUrl,
        filename,
        source
      };
    }

    let value = core.getByPath(profile, key);

    // If key is firstName and fullName has middle name, extract full given name so Họ + Tên matches fullName
    if (key === "firstName" && profile.fullName && profile.lastName) {
      const cleanFull = profile.fullName.trim();
      const cleanLast = profile.lastName.trim();
      if (cleanFull.toUpperCase().startsWith(cleanLast.toUpperCase())) {
        const givenParts = cleanFull.slice(cleanLast.length).trim();
        if (givenParts) {
          value = givenParts;
        }
      }
    }

    if (value === undefined || value === null || String(value).trim() === "") return null;
    return {
      element,
      key,
      label: describe(element),
      value: String(value),
      source
    };
  }

  function buildProposals(profile, rule, options = {}) {
    const proposals = [];
    const seen = new Set();
    const normalizedProfile = core.deriveProfile(profile);

    if (rule?.fields && typeof rule.fields === "object") {
      for (const [selector, key] of Object.entries(rule.fields)) {
        let elements = [];
        try {
          elements = Array.from(document.querySelectorAll(selector));
        } catch {
          continue;
        }
        for (const element of elements) {
          if (!isVisible(element) || (options.onlyEmpty !== false && hasValue(element))) continue;
          const proposal = createProposal(element, key, normalizedProfile, "rule", options);
          if (proposal) {
            proposals.push(proposal);
            seen.add(element);
          }
        }
      }
    }

    for (const element of getCandidates()) {
      if (seen.has(element) || (options.onlyEmpty !== false && hasValue(element))) continue;
      const descriptor = getLabel(element);
      const key = core.inferFieldKey(
        descriptor,
        element.getAttribute("autocomplete"),
        element.getAttribute("type")
      );
      if (!key) continue;
      const proposal = createProposal(element, key, normalizedProfile, "auto", options);
      if (proposal) proposals.push(proposal);
    }

    return proposals;
  }

  function publicProposals(proposals) {
    return proposals.map(({ key, label, value, source }) => ({ key, label, value, source }));
  }

  function showToast(message, tone = "ok") {
    document.getElementById("autoform-local-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "autoform-local-toast";
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "16px",
      left: "20px",
      maxWidth: "380px",
      padding: "10px 16px",
      borderRadius: "12px",
      border: `1px solid ${tone === "error" ? "#ef5b5b" : "#2ce978"}`,
      background: "#101813",
      color: "#f4fff7",
      boxShadow: "0 12px 34px rgba(0,0,0,.35)",
      font: "600 13px/1.45 system-ui, sans-serif",
      pointerEvents: "none"
    });
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function elementLooksSensitive(element, options = {}) {
    const text = `${describe(element)} ${element.textContent || ""}`.toLowerCase();
    if (/captcha|turnstile|recaptcha|hcaptcha|single\s*sign.?on|\bsso\b/i.test(text)) return true;
    if (!options.allowUpload && /tải\s*lên\s*tài\s*liệu\s*bảo\s*mật/i.test(text)) return true;
    return false;
  }

  let isFlowRunning = false;
  let cancelFlow = false;

  function detectPageStatus() {
    const textContent = (document.body ? document.body.innerText : "").toLowerCase();
    const hasNameInput = Boolean(document.querySelector("input[name*='name'], input[id*='name'], input[placeholder*='tên'], input[placeholder*='name']"));
    const hasSchoolInput = Boolean(document.querySelector("input[name*='school'], input[id*='school'], input[placeholder*='trường'], input[aria-label*='trường']"));
    const hasUploadBtn = Boolean(Array.from(document.querySelectorAll("button, a, [role='button']")).find(el => {
      const t = (el.textContent || "").trim().toLowerCase();
      return (t.includes("thêm tài liệu") || t.includes("add document") || t.includes("tải tài liệu lên")) && isVisible(el);
    }));
    const hasFileInput = Boolean(document.querySelector("input[type='file']") && isVisible(document.querySelector("input[type='file']")));
    const hasDropzone = Boolean(document.querySelector("[data-dropzone], .dropzone, [class*='upload'], [id*='upload']") && textContent.includes("bằng chứng"));

    if (textContent.includes("đang chờ xét duyệt") || textContent.includes("chờ xét duyệt") || textContent.includes("đã nhận được tài liệu") || textContent.includes("thành công") || textContent.includes("congratulations")) {
      return {
        step: "REVIEW",
        title: "Chờ xét duyệt",
        detail: "Hồ sơ đang được hệ thống SheerID xem xét."
      };
    }

    if (hasUploadBtn || hasFileInput || hasDropzone || textContent.includes("tải bằng chứng") || textContent.includes("bằng chứng theo học") || textContent.includes("thêm tài liệu")) {
      return {
        step: "STEP_2",
        title: "Màn upload tài liệu",
        detail: "Màn hình tải bằng chứng thẻ sinh viên."
      };
    }

    if (hasNameInput || hasSchoolInput || textContent.includes("thông tin sinh viên") || textContent.includes("student information")) {
      return {
        step: "STEP_1",
        title: "Form thông tin",
        detail: "Màn hình nhập thông tin sinh viên."
      };
    }

    return {
      step: "UNKNOWN",
      title: "Chưa xác định",
      detail: "Chưa xác định trạng thái SheerID. Không tự reload."
    };
  }

  async function selectCountry(wantedCountry = "Việt Nam") {
    try {
      // 1. Check select element for country (explicitly check for SELECT tag and options property)
      const countrySelect = document.querySelector("select#sid-country, select[name*='country' i], select[id*='country' i], select[data-testid*='country' i]")
        || Array.from(document.querySelectorAll("select")).find(s => isVisible(s) && /quốc\s*gia|country/i.test(describe(s)));

      if (countrySelect && isVisible(countrySelect) && countrySelect.tagName === "SELECT" && countrySelect.options) {
        const options = Array.from(countrySelect.options || []);
        const wantedNorm = wantedCountry.toLowerCase().trim();
        const match = options.find(opt => {
          const val = (opt.value || "").toLowerCase().trim();
          const txt = (opt.textContent || "").toLowerCase().trim();
          return val === "vn" || val === "vnm" || val === "vietnam" || val === "việt nam"
            || txt === "việt nam" || txt === "vietnam" || txt.includes("việt nam") || txt.includes("vietnam")
            || val.includes(wantedNorm) || txt.includes(wantedNorm);
        });

        if (match) {
          countrySelect.focus();
          const selectProto = window.HTMLSelectElement ? window.HTMLSelectElement.prototype : Object.getPrototypeOf(countrySelect);
          const selectSetter = Object.getOwnPropertyDescriptor(selectProto, "value")?.set;
          if (selectSetter) selectSetter.call(countrySelect, match.value);
          else countrySelect.value = match.value;
          countrySelect.selectedIndex = match.index;
          if (countrySelect._valueTracker) {
            countrySelect._valueTracker.setValue(match.value + "_track_" + Math.random());
          }
          countrySelect.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          countrySelect.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
          countrySelect.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
          return true;
        }
      }

      // 2. Check input element (autocomplete/combobox like #sid-country)
      const countryInput = document.querySelector("input#sid-country, input[name*='country' i], input[id*='country' i]")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && i.type !== "hidden" && /quốc\s*gia|country/i.test(describe(i)));

      if (countryInput && isVisible(countryInput) && countryInput.type !== "hidden") {
        const curVal = (countryInput.value || "").toLowerCase().trim();
        if (curVal.includes("việt nam") || curVal.includes("vietnam") || curVal === "vn") {
          return true;
        }

        countryInput.focus();
        setNativeValue(countryInput, wantedCountry);
        await sleep(350);
        const items = Array.from(document.querySelectorAll('[role="option"], [role="listbox"] li, .autocomplete-suggestion, li')).filter(isVisible);
        const match = items.find(it => {
          const t = (it.textContent || "").toLowerCase();
          return t.includes("việt nam") || t.includes("vietnam") || t === "vn";
        });
        if (match) {
          match.scrollIntoView({ block: "nearest" });
          match.click();
          return true;
        }
      }
    } catch (e) {
      console.warn("Lỗi trong selectCountry:", e);
    }
    return false;
  }

  function normalizeSchoolText(str) {
    return String(str || "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isInsideDropdownList(element) {
    if (!element || typeof element.closest !== "function") return false;
    return Boolean(
      element.closest(
        '[role="listbox"], [role="menu"], [role="option"], .sid-autocomplete__menu, .sid-autocomplete__list, .sid-autocomplete__option, .sid-autocomplete__item, ul[class*="autocomplete"], div[class*="autocomplete-menu"], div[class*="autocomplete__menu"]'
      )
    );
  }

  function getVisibleSchoolSuggestions(schoolInput) {
    const listId = schoolInput?.getAttribute("aria-controls") || schoolInput?.getAttribute("aria-owns");
    if (listId) {
      const listEl = document.getElementById(listId);
      if (listEl && isVisible(listEl)) {
        const roleOptions = Array.from(
          listEl.querySelectorAll('[role="option"], li, .sid-autocomplete__option, .sid-autocomplete__item')
        ).filter(el => isVisible(el) && !el.querySelector('[role="option"]'));
        if (roleOptions.length > 0) return roleOptions;
        const directChildren = Array.from(listEl.children).filter(
          el => isVisible(el) && el.tagName !== "INPUT" && el.tagName !== "LABEL" && Boolean((el.textContent || "").trim())
        );
        if (directChildren.length > 0) return directChildren;
      }
    }

    const primarySelectors = [
      '[role="listbox"] [role="option"]',
      '[role="option"]',
      '.sid-autocomplete__option',
      '.sid-autocomplete__item',
      'li.sid-autocomplete__item',
      'ul.sid-autocomplete__menu > li',
      'ul.sid-autocomplete__menu > div',
      '[role="listbox"] > li',
      '[role="listbox"] > div',
      '[class*="autocomplete"] [role="option"]',
      '[class*="autocomplete"] ul > li',
      '[class*="autocomplete-menu"] > div',
      '[class*="autocomplete__menu"] > div',
      '[class*="suggestions"] > li',
      '[class*="suggestions"] > div'
    ];

    for (const sel of primarySelectors) {
      const found = Array.from(document.querySelectorAll(sel)).filter(el => {
        if (!isVisible(el)) return false;
        if (schoolInput && (el === schoolInput || el.contains(schoolInput) || schoolInput.contains(el))) return false;
        if (el.tagName === "INPUT" || el.tagName === "LABEL" || el.tagName === "SELECT") return false;
        if (el.querySelector('[role="option"]')) return false;
        return Boolean((el.textContent || "").trim());
      });
      if (found.length > 0) {
        return found;
      }
    }

    return [];
  }

  function isMatchingSchoolOption(optionEl, targetSchool) {
    const expected = normalizeSchoolText(targetSchool);
    if (!expected || !optionEl) return false;

    const rawText = String(optionEl.innerText || optionEl.textContent || "");
    const fullText = normalizeSchoolText(rawText);
    if (!fullText) return false;

    const lines = rawText
      .split(/\r?\n/)
      .map(normalizeSchoolText)
      .filter(Boolean);

    if (lines.length > 0 && lines[0] === expected) {
      return true;
    }

    const childExact = Array.from(optionEl.querySelectorAll("*")).some(
      child => normalizeSchoolText(child.textContent) === expected
    );
    if (childExact) return true;

    if (fullText === expected || fullText.startsWith(expected + " ")) {
      return true;
    }

    return false;
  }

  function isSchoolSelected(expectedSchool = "Trường Đại Học Xây Dựng Hà Nội", options = {}) {
    const expectedNorm = normalizeSchoolText(expectedSchool);
    const schoolInput = document.querySelector(
      "#sid-organization, input[name='organization'], input[name*='school' i], input[id*='school' i], input[name*='organization' i], input[id*='organization' i]"
    );

    // 1. Nếu có thông báo lỗi đỏ "Bạn phải chọn một tổ chức từ danh sách" hoặc aria-invalid="true" thì chắc chắn CHƯA được chọn
    const pageText = document.body ? document.body.innerText : "";
    if (/bạn\s*phải\s*chọn\s*một\s*tổ\s*chức|please\s*select\s*an?\s*organization/i.test(pageText)) {
      return false;
    }
    if (schoolInput && schoolInput.getAttribute("aria-invalid") === "true") {
      return false;
    }

    // 2. Nếu danh sách gợi ý (dropdown) vẫn đang mở thì chưa hoàn tất việc chọn
    if (schoolInput && getVisibleSchoolSuggestions(schoolInput).length > 0) {
      return false;
    }

    const container = (schoolInput && schoolInput.closest(".sid-autocomplete, [class*='organization'], [class*='school'], .form-group, .field"))
      || document.querySelector(".sid-autocomplete, [class*='organization'], [class*='school']")
      || (schoolInput ? schoolInput.parentElement?.parentElement || schoolInput.parentElement : null);

    // 3. Kiểm tra input ẩn lưu ID/giá trị tổ chức đã được SheerID ghi nhận
    const hiddenOrgInputs = Array.from(
      document.querySelectorAll(
        "input[type='hidden'][name*='organization' i], input[type='hidden'][id*='organization' i], input[type='hidden'][name*='school' i], input[type='hidden'][id*='school' i]"
      )
    );
    if (hiddenOrgInputs.some(inp => Boolean((inp.value || "").trim()))) {
      return true;
    }

    // 4. Nếu ô input tìm kiếm đã ẩn đi, bị thay thế, hoặc chuyển sang readOnly/disabled và vùng trường học hiển thị đúng tên trường
    if (!schoolInput || !isVisible(schoolInput) || schoolInput.readOnly || schoolInput.disabled) {
      const regionText = normalizeSchoolText(container ? (container.innerText || container.textContent) : pageText);
      if (regionText && (regionText.includes(expectedNorm) || regionText.includes("trường đại học xây dựng hà nội"))) {
        return true;
      }
      return false;
    }

    // 5. Nếu schoolInput vẫn hiển thị: kiểm tra xem có thẻ tổ chức đã chọn (card + nút X) ngoài dropdown không
    if (container) {
      const clearBtn = Array.from(
        container.querySelectorAll(
          "button, [role='button'], [aria-label*='xóa' i], [aria-label*='remove' i], [aria-label*='clear' i], [aria-label*='change' i], [aria-label*='close' i], .sid-autocomplete__clear, [class*='clear' i], [class*='remove' i], [class*='close' i]"
        )
      ).find(el => isVisible(el) && !isInsideDropdownList(el) && el !== schoolInput);

      const selectedCard = Array.from(container.querySelectorAll("div, button, a, [role='button']")).find(el => {
        if (!isVisible(el) || el === schoolInput || el.contains(schoolInput) || isInsideDropdownList(el)) return false;
        const text = normalizeSchoolText(el.innerText || el.textContent || "");
        return (text.includes(expectedNorm) || text.includes("trường đại học xây dựng hà nội")) && text.includes("hà nội");
      });

      if (clearBtn || selectedCard) {
        return true;
      }
    }

    // 6. Kiểm tra thuộc tính data/aria xác nhận đã chọn tổ chức trên chính input
    if (
      schoolInput.dataset?.organizationId ||
      schoolInput.dataset?.selected === "true" ||
      schoolInput.getAttribute("data-organization-id")
    ) {
      return true;
    }

    // 7. Nếu vừa click vào gợi ý và SheerID cập nhật lại giá trị chuẩn vào input (bỏ dấu cách cuối lúc tìm kiếm)
    if (options.allowCanonicalInputUpdate && schoolInput.value && !schoolInput.value.endsWith(" ")) {
      const currentValNorm = normalizeSchoolText(schoolInput.value);
      if (currentValNorm === expectedNorm || currentValNorm.startsWith(expectedNorm)) {
        return true;
      }
    }

    // Nếu chỉ còn ô input văn bản thuần túy mà không có dấu hiệu đã ghi nhận tổ chức -> trả về false
    return false;
  }

  async function typeSchoolAndPressSpace(input, schoolText) {
    const cleanText = String(schoolText || "").trim();
    input.focus();
    input.click();
    await sleep(100);

    // Bước 1: Nhập tên trường
    let typed = false;
    try {
      input.select();
      document.execCommand("selectAll", false, null);
      typed = document.execCommand("insertText", false, cleanText);
    } catch {
      typed = false;
    }

    if (!typed || input.value !== cleanText) {
      const inputProto = window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(input);
      const setter = Object.getOwnPropertyDescriptor(inputProto, "value")?.set;
      const prev = input.value;
      if (setter) setter.call(input, cleanText);
      else input.value = cleanText;
      if (input._valueTracker) {
        input._valueTracker.setValue(prev);
      }
      try {
        input.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: cleanText
        }));
      } catch {
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      }
    }

    await sleep(150);

    // Bước 2: Nhấn phím Cách (Space) 1 cái để kích hoạt tìm kiếm gợi ý
    const spaceKeyOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: " ",
      code: "Space",
      keyCode: 32,
      which: 32,
      charCode: 32
    };
    input.dispatchEvent(new KeyboardEvent("keydown", spaceKeyOpts));
    input.dispatchEvent(new KeyboardEvent("keypress", spaceKeyOpts));

    const textWithSpace = `${cleanText} `;
    let spaceTyped = false;
    try {
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(input.value.length, input.value.length);
      }
      spaceTyped = document.execCommand("insertText", false, " ");
    } catch {
      spaceTyped = false;
    }

    if (!spaceTyped || input.value !== textWithSpace) {
      const inputProto = window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(input);
      const setter = Object.getOwnPropertyDescriptor(inputProto, "value")?.set;
      const prev = input.value;
      if (setter) setter.call(input, textWithSpace);
      else input.value = textWithSpace;
      if (input._valueTracker) {
        input._valueTracker.setValue(prev);
      }
      try {
        input.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: " "
        }));
      } catch {
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      }
    }

    input.dispatchEvent(new KeyboardEvent("keyup", spaceKeyOpts));
  }

  function clickSuggestionElement(targetItem) {
    targetItem.scrollIntoView({ block: "nearest" });
    const rect = targetItem.getBoundingClientRect();
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      buttons: 1,
      button: 0,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height / 2)
    };
    targetItem.dispatchEvent(new PointerEvent("pointerover", mouseOpts));
    targetItem.dispatchEvent(new PointerEvent("pointerenter", mouseOpts));
    targetItem.dispatchEvent(new MouseEvent("mouseover", mouseOpts));
    targetItem.dispatchEvent(new MouseEvent("mouseenter", mouseOpts));
    targetItem.dispatchEvent(new PointerEvent("pointermove", mouseOpts));
    targetItem.dispatchEvent(new MouseEvent("mousemove", mouseOpts));
    targetItem.dispatchEvent(new PointerEvent("pointerdown", mouseOpts));
    targetItem.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    targetItem.dispatchEvent(new PointerEvent("pointerup", mouseOpts));
    targetItem.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    targetItem.click();
  }

  async function selectSchoolAutocomplete(schoolName = "Trường Đại Học Xây Dựng Hà Nội") {
    try {
      const targetQuery = "Trường Đại Học Xây Dựng Hà Nội";
      const matchSchoolName = (schoolName || targetQuery).trim();

      // Kiểm tra nếu trang đã thực sự ghi nhận tổ chức từ trước
      if (isSchoolSelected(matchSchoolName)) {
        return { ok: true };
      }

      const schoolInput = document.querySelector(
        "input#sid-organization, input[name='organization'], input[name*='school' i], input[id*='school' i], input[name*='organization' i], input[id*='organization' i], input[placeholder*='trường' i], input[aria-label*='trường' i]"
      ) || Array.from(document.querySelectorAll("input")).find(
        i => isVisible(i) && !/sid[-_]first[-_]name|firstName|sid[-_]last[-_]name|lastName|email|birth/i.test(i.id + " " + i.name) && /trường|school|organization/i.test(describe(i))
      );

      if (!schoolInput) {
        return {
          ok: false,
          error: "Không tìm thấy ô nhập Trường học trên trang."
        };
      }

      // 1. Đưa ô trường học vào giữa màn hình, nhập tên trường rồi nhấn phím Cách 1 cái
      schoolInput.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(200);

      showToast(`Đang nhập tên trường "${targetQuery}" và nhấn cách...`);
      await typeSchoolAndPressSpace(schoolInput, targetQuery);

      // 2. Chờ danh sách gợi ý xuất hiện
      showToast("Đang chờ danh sách gợi ý trường học xuất hiện...");
      let suggestions = [];
      let matchedItem = null;
      const waitStart = Date.now();

      while (Date.now() - waitStart < 6000) {
        if (cancelFlow) return { ok: false, cancelled: true, error: "Đã dừng quy trình." };
        await sleep(200);

        suggestions = getVisibleSchoolSuggestions(schoolInput);
        if (suggestions.length > 0) {
          matchedItem = suggestions.find(
            item => isMatchingSchoolOption(item, matchSchoolName) || isMatchingSchoolOption(item, targetQuery)
          );
          if (matchedItem) break;
        }
      }

      if (suggestions.length === 0) {
        return {
          ok: false,
          error: `Danh sách gợi ý trường học không xuất hiện sau khi nhập "${targetQuery}". Đã dừng quy trình.`
        };
      }

      if (!matchedItem) {
        return {
          ok: false,
          error: `Không có lựa chọn nào trong danh sách gợi ý khớp chính xác với "${matchSchoolName}". Đã dừng quy trình.`
        };
      }

      // 3. Chọn tên trường đúng với trường đã chọn
      showToast(`Đã tìm thấy "${targetQuery}", đang bấm chọn...`);
      clickSuggestionElement(matchedItem);
      await sleep(450);

      // Nếu lần click đầu chưa đóng dropdown, thử click vào phần tử con hoặc dùng phím chọn trên đúng mục khớp
      if (!isSchoolSelected(matchSchoolName, { allowCanonicalInputUpdate: true })) {
        if (matchedItem.firstElementChild && isVisible(matchedItem.firstElementChild)) {
          clickSuggestionElement(matchedItem.firstElementChild);
          await sleep(400);
        }
      }

      if (!isSchoolSelected(matchSchoolName, { allowCanonicalInputUpdate: true })) {
        const currentSuggestions = getVisibleSchoolSuggestions(schoolInput);
        const idx = currentSuggestions.findIndex(
          item => isMatchingSchoolOption(item, matchSchoolName) || isMatchingSchoolOption(item, targetQuery)
        );
        if (idx !== -1) {
          schoolInput.focus();
          for (let step = 0; step <= idx; step++) {
            schoolInput.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40 }));
            await sleep(100);
          }
          schoolInput.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 }));
          schoolInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 }));
          await sleep(450);
        }
      }

      // 4. Kiểm tra trang đã ghi nhận tổ chức, không chỉ còn chuỗi văn bản
      for (let check = 0; check < 6; check++) {
        if (isSchoolSelected(matchSchoolName, { allowCanonicalInputUpdate: true })) {
          showToast(`✓ Đã chọn và ghi nhận tổ chức: ${targetQuery}`);
          return { ok: true };
        }
        await sleep(200);
      }

      return {
        ok: false,
        error: `Trang chưa ghi nhận tổ chức "${targetQuery}" (vẫn chỉ là chuỗi văn bản). Đã dừng quy trình.`
      };
    } catch (e) {
      console.warn("Lỗi chọn trường đại học:", e);
      return {
        ok: false,
        error: `Lỗi khi chọn trường học: ${e.message || String(e)}`
      };
    }
  }

  async function selectBirthMonth(rawMonth) {
    let m = 0;
    if (typeof rawMonth === "number") m = rawMonth;
    else if (typeof rawMonth === "string") {
      const clean = rawMonth.trim();
      const parsed = parseInt(clean, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        m = parsed;
      } else {
        const vnIdx = [
          "tháng một", "tháng hai", "tháng ba", "tháng tư", "tháng năm", "tháng sáu",
          "tháng bảy", "tháng tám", "tháng chín", "tháng mười", "tháng mười một", "tháng mười hai"
        ].indexOf(clean.toLowerCase());
        if (vnIdx !== -1) m = vnIdx + 1;
      }
    }
    if (m < 1 || m > 12) m = 1;

    const VN_MONTHS = [
      "",
      "Tháng Một",
      "Tháng Hai",
      "Tháng Ba",
      "Tháng Tư",
      "Tháng Năm",
      "Tháng Sáu",
      "Tháng Bảy",
      "Tháng Tám",
      "Tháng Chín",
      "Tháng Mười",
      "Tháng Mười Một",
      "Tháng Mười Hai"
    ];
    const EN_MONTHS = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    const targetVn = VN_MONTHS[m];
    const targetEn = EN_MONTHS[m];
    const targetPad = String(m).padStart(2, "0");
    const targetNum = String(m);
    const normVn = normalizeSchoolText(targetVn);
    const normEn = normalizeSchoolText(targetEn);

    showToast(`Đang chọn tháng sinh: ${targetVn}...`);

    // 1. Kiểm tra phần tử <select>
    const monthSelect = document.querySelector(
      "select#sid-birthdate__month, select#sid-birthdate-month, select[name='birthDate-month'], select[name*='month' i]"
    ) || Array.from(document.querySelectorAll("select")).find(s => isVisible(s) && /(?:birthdate.*month|\bmonth\b|\bmm\b|tháng)/i.test(describe(s)));

    if (monthSelect && monthSelect.tagName === "SELECT") {
      const options = Array.from(monthSelect.options || []);
      const matched = options.find(opt => {
        const val = (opt.value || "").trim().toLowerCase();
        const txt = normalizeSchoolText(opt.textContent || "");
        return txt === normVn || txt === normEn
          || val === targetNum || val === targetPad
          || val === targetEn.toLowerCase()
          || parseInt(val, 10) === m;
      }) || (monthSelect.options.length >= m + 1 ? monthSelect.options[m] : null);

      if (matched) {
        monthSelect.focus();
        const selectProto = window.HTMLSelectElement ? window.HTMLSelectElement.prototype : Object.getPrototypeOf(monthSelect);
        const setter = Object.getOwnPropertyDescriptor(selectProto, "value")?.set;
        if (setter) setter.call(monthSelect, matched.value);
        else monthSelect.value = matched.value;
        monthSelect.selectedIndex = matched.index;
        monthSelect.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        monthSelect.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        monthSelect.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
        return true;
      }
    }

    function getVisibleMonthOptions(control) {
      const candidates = [];
      if (control) {
        const listId = control.getAttribute("aria-controls") || control.getAttribute("aria-owns");
        if (listId) {
          const listEl = document.getElementById(listId);
          if (listEl) {
            candidates.push(...listEl.querySelectorAll('[role="option"], li, .sid-autocomplete__option, .sid-autocomplete__item, div'));
          }
        }
      }
      candidates.push(
        ...document.querySelectorAll(
          '#sid-birthdate__month-menu [role="option"], #sid-birthdate__month-list [role="option"], [id*="birthdate__month" i] [role="option"], [id*="birthdate__month" i] li, [role="listbox"] [role="option"], [role="listbox"] > li, [role="listbox"] > div, .sid-autocomplete__option, .sid-autocomplete__item'
        )
      );

      const seen = new Set();
      const result = [];
      for (const el of candidates) {
        if (!el || seen.has(el)) continue;
        seen.add(el);
        if (!isVisible(el)) continue;
        if (el.getAttribute("role") === "listbox" || el.tagName === "UL" || el.tagName === "OL") continue;
        if (el.querySelector('[role="option"], li')) continue;
        const text = normalizeSchoolText(el.textContent || "");
        if (!text || text.length > 40) continue;
        result.push(el);
      }
      return result;
    }

    function findMatchingMonthOption(options) {
      return options.find(it => {
        const t = normalizeSchoolText(it.textContent || "");
        return t === normVn || t === normEn;
      }) || options.find(it => {
        const valAttr = normalizeSchoolText(it.getAttribute("data-value") || it.getAttribute("value") || "");
        return valAttr === targetNum || valAttr === targetPad || valAttr === normVn || valAttr === normEn;
      });
    }

    function isMonthSelectedCorrectly(control) {
      if (!control) return false;
      const rawVal = control.value !== undefined ? String(control.value) : String(control.textContent || "");
      const normVal = normalizeSchoolText(rawVal);
      return normVal === normVn || normVal === normEn;
    }

    // 2. Kiểm tra dropdown dạng trigger / combobox (#sid-birthdate__month mở danh sách "Tháng Một" .. "Tháng Mười Hai")
    const monthTrigger = document.querySelector(
      "#sid-birthdate__month, [aria-labelledby*='birthdate__month'], [data-testid*='month'], .sid-birthdate__month"
    ) || Array.from(document.querySelectorAll("input[role='combobox'], div[role='combobox'], button[role='combobox'], div, button")).find(el => {
      if (!isVisible(el) || el === document.querySelector("#sid-college-name")) return false;
      const desc = describe(el).toLowerCase();
      const txt = (el.textContent || "").toLowerCase();
      return (desc.includes("tháng") || desc.includes("month") || txt.includes("tháng")) && el.children.length <= 3;
    });

    if (monthTrigger && monthTrigger.tagName !== "SELECT") {
      if (isMonthSelectedCorrectly(monthTrigger)) {
        return true;
      }

      monthTrigger.scrollIntoView({ block: "nearest" });

      // Nếu ô tháng đang chứa giá trị rác (như "08") làm lọc mất danh sách, xóa trắng trước khi mở dropdown
      if (monthTrigger.tagName === "INPUT" && (monthTrigger.value || "").trim() && !isMonthSelectedCorrectly(monthTrigger)) {
        const inputProto = window.HTMLInputElement ? window.HTMLInputElement.prototype : Object.getPrototypeOf(monthTrigger);
        const valueSetter = Object.getOwnPropertyDescriptor(inputProto, "value")?.set;
        if (valueSetter) valueSetter.call(monthTrigger, "");
        else monthTrigger.value = "";
        monthTrigger.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        await sleep(80);
      }

      // Click mở danh sách tháng (hoặc nút mũi tên đi kèm nếu có)
      clickSuggestionElement(monthTrigger);
      monthTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, bubbles: true }));
      monthTrigger.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, bubbles: true }));

      let options = [];
      let matchItem = null;
      for (let w = 0; w < 10; w++) {
        await sleep(120);
        options = getVisibleMonthOptions(monthTrigger);
        matchItem = findMatchingMonthOption(options);
        if (matchItem) break;
        if (w === 3) {
          const toggleBtn = monthTrigger.parentElement?.querySelector("button, [role='button'], svg, [class*='arrow' i], [class*='icon' i]");
          if (toggleBtn && toggleBtn !== monthTrigger && isVisible(toggleBtn)) {
            clickSuggestionElement(toggleBtn);
          } else {
            clickSuggestionElement(monthTrigger);
          }
        }
      }

      // Nếu chưa mở được danh sách hoặc chưa thấy mục khớp, gõ tên tháng ("Tháng Tám") để lọc rồi chọn
      if (!matchItem && monthTrigger.tagName === "INPUT") {
        setNativeValue(monthTrigger, targetVn);
        for (let w = 0; w < 8; w++) {
          await sleep(120);
          options = getVisibleMonthOptions(monthTrigger);
          matchItem = findMatchingMonthOption(options);
          if (matchItem) break;
        }
      }

      if (matchItem) {
        clickSuggestionElement(matchItem);
        await sleep(180);

        // Đảm bảo sau khi click, giá trị trên combobox đã là tên tháng (ví dụ "Tháng Tám")
        if (monthTrigger.tagName === "INPUT" && !isMonthSelectedCorrectly(monthTrigger)) {
          matchItem.click();
          await sleep(120);
        }
        monthTrigger.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        monthTrigger.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
        return true;
      }

      // Nếu combobox lọc bằng bàn phím: gõ tên tháng ("Tháng Tám") rồi nhấn ArrowDown + Enter
      if (monthTrigger.tagName === "INPUT") {
        setNativeValue(monthTrigger, targetVn);
        await sleep(150);
        const retryOptions = getVisibleMonthOptions(monthTrigger);
        const retryMatch = findMatchingMonthOption(retryOptions) || retryOptions[0];
        if (retryMatch) {
          clickSuggestionElement(retryMatch);
          await sleep(150);
          return true;
        }
        monthTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, bubbles: true }));
        monthTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        monthTrigger.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        monthTrigger.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
        await sleep(150);
        return true;
      }
    }

    return false;
  }

  function findSubmitButton() {
    const sidBtn = document.querySelector("#sid-submit-btn-collect-info, button[id*='submit' i]");
    if (sidBtn && isVisible(sidBtn)) return sidBtn;

    const buttons = Array.from(document.querySelectorAll("button, input[type='submit'], [role='button']")).filter(isVisible);
    const submitBtn = buttons.find(b => {
      const text = (b.textContent || b.value || "").trim().toLowerCase();
      return /^(tiếp tục|next|submit|gửi|xác nhận|nộp|tiếp theo|gửi hồ sơ|xác minh.*)$/i.test(text)
        || b.matches("button[type='submit'], input[type='submit']")
        || (/tiếp tục|next|submit|xác minh/i.test(text) && !b.matches(".brand-mark, .tab, .autocomplete-item"));
    });
    return submitBtn;
  }

  async function executeFullAutoFlow(profile, options = {}) {
    cancelFlow = false;
    isFlowRunning = true;

    let pageStatus = detectPageStatus();
    showToast(`Bắt đầu quy trình tự động: ${pageStatus.title}`);

    if (pageStatus.step === "STEP_1" || pageStatus.step === "UNKNOWN") {
      if (cancelFlow) return { cancelled: true };

      // Lần lượt 1: Kiểm tra và chọn quốc gia Việt Nam
      showToast("1/6. Đang chọn Quốc gia: Việt Nam...");
      await selectCountry(profile.country || "Việt Nam");
      await sleep(350);

      if (cancelFlow) return { cancelled: true };

      // Lần lượt 2: Nhập tên trường + nhấn cách 1 cái -> chờ gợi ý -> chọn đúng trường -> kiểm tra trang đã ghi nhận tổ chức
      const targetSchool = (profile.schoolName || "Trường Đại Học Xây Dựng Hà Nội").trim();
      showToast(`2/6. Đang chọn Trường học: ${targetSchool}...`);
      const schoolResult = await selectSchoolAutocomplete(targetSchool);
      if (cancelFlow || schoolResult?.cancelled) return { cancelled: true };

      if (!schoolResult || !schoolResult.ok || !isSchoolSelected(targetSchool, { allowCanonicalInputUpdate: true })) {
        const errMsg = schoolResult?.error || `Không thể chọn chính xác tổ chức "${targetSchool}" từ danh sách gợi ý. Đã dừng quy trình.`;
        showToast(errMsg, "error");
        return { ok: false, error: errMsg, step: "STEP_1" };
      }
      await sleep(450);

      if (cancelFlow) return { cancelled: true };

      // Chỉ sau khi đã xác nhận trang ghi nhận tổ chức mới tiếp tục điền Tên, Họ, Ngày sinh và Email
      // Lần lượt 3: Nhập Tên (First Name)
      const fNameVal = profile.firstName || (profile.fullName && profile.lastName ? profile.fullName.replace(new RegExp(`^${profile.lastName}\\s*`, "i"), "").trim() : "");
      const fNameInput = document.querySelector("#sid-first-name, input[name='firstName'], input[name='first-name'], input[autocomplete='given-name']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && !/lastName|sid[-_]last[-_]name|email|school|organization|birth/i.test(i.id + " " + i.name) && /(?:sid[-_]first[-_]name|firstName|\btên\b)/i.test(describe(i)));
      if (fNameInput && fNameVal) {
        showToast(`3/6. Đang nhập Tên: ${fNameVal}...`);
        fNameInput.scrollIntoView({ block: "center", behavior: "smooth" });
        setNativeValue(fNameInput, fNameVal);
        await sleep(300);
      }

      if (cancelFlow) return { cancelled: true };

      // Lần lượt 4: Nhập Họ (Last Name)
      const lNameInput = document.querySelector("#sid-last-name, input[name='lastName'], input[name='last-name'], input[autocomplete='family-name']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && !/firstName|sid[-_]first[-_]name|email|school|organization|birth/i.test(i.id + " " + i.name) && /(?:sid[-_]last[-_]name|lastName|\bhọ\b)/i.test(describe(i)));
      if (lNameInput && profile.lastName) {
        showToast(`4/6. Đang nhập Họ: ${profile.lastName}...`);
        lNameInput.scrollIntoView({ block: "center", behavior: "smooth" });
        setNativeValue(lNameInput, profile.lastName);
        await sleep(300);
      }

      if (cancelFlow) return { cancelled: true };

      // Lần lượt 5: Nhập Ngày sinh (Ngày - Tháng - Năm)
      showToast("5/6. Đang nhập Ngày sinh...");
      // Ngày (Day)
      const bDayInput = document.querySelector("#sid-birthdate-day, input[name='birthDate-day'], input[name*='day' i]")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /(?:sid[-_]birthdate[-_]*day|birthdate[-_]*day|\bday\b|\bdd\b)/i.test(describe(i)));
      if (bDayInput && profile.birthDay) {
        setNativeValue(bDayInput, profile.birthDay);
        await sleep(250);
      }

      // Tháng (Month) - sử dụng selectBirthMonth theo đúng dropdown tiếng Việt của SheerID
      if (profile.birthMonth) {
        await selectBirthMonth(profile.birthMonth);
        await sleep(250);
      }

      // Năm (Year)
      const bYearInput = document.querySelector("#sid-birthdate-year, input[name='birthDate-year'], input[name*='year' i]")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /(?:sid[-_]birthdate[-_]*year|birthdate[-_]*year|\byear\b|\byyyy\b)/i.test(describe(i)));
      if (bYearInput && profile.birthYear) {
        setNativeValue(bYearInput, profile.birthYear);
        await sleep(250);
      }

      if (cancelFlow) return { cancelled: true };

      // Lần lượt 6: Nhập Email
      const emailInput = document.querySelector("#sid-email, input[type='email'], input[name='email']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /email|thư\s*điện\s*tử/i.test(describe(i)));
      if (emailInput && profile.email) {
        showToast(`6/6. Đang nhập Email: ${profile.email}...`);
        emailInput.scrollIntoView({ block: "center", behavior: "smooth" });
        setNativeValue(emailInput, profile.email);
        await sleep(300);
      }

      // 7. Điền các trường bổ sung khác nếu có
      const proposals = buildProposals(profile, {}, options);
      for (const proposal of proposals || []) {
        if (cancelFlow) return { cancelled: true };
        if (["studentCardImage", "schoolName", "country", "firstName", "lastName", "birthDay", "birthMonth", "birthYear", "email"].includes(proposal.key)) continue;
        if (proposal.element.type !== "file") {
          setNativeValue(proposal.element, proposal.value, proposal);
          await sleep(200);
        }
      }

      // 8. Kiểm tra lần cuối đảm bảo trường học vẫn đang ở trạng thái đã ghi nhận tổ chức trước khi gửi
      if (!isSchoolSelected(targetSchool, { allowCanonicalInputUpdate: true })) {
        const errMsg = `Trang chưa ghi nhận tổ chức "${targetSchool}" (chỉ còn chuỗi văn bản). Đã dừng quy trình, không tự động bỏ qua.`;
        showToast(errMsg, "error");
        return { ok: false, error: errMsg, step: "STEP_1" };
      }

      await sleep(400);
      if (cancelFlow) return { cancelled: true };

      const step1Submit = findSubmitButton();
      if (step1Submit) {
        showToast("Đã điền đầy đủ và kiểm tra chính xác, đang chuyển sang bước tiếp...");
        step1Submit.click();
      }

      const startWait = Date.now();
      while (Date.now() - startWait < 15000) {
        if (cancelFlow) return { cancelled: true };
        await sleep(500);
        pageStatus = detectPageStatus();
        if (pageStatus.step === "STEP_2") break;
      }
    }

    if (pageStatus.step === "STEP_2") {
      if (cancelFlow) return { cancelled: true };
      showToast("Đang ở màn Upload tài liệu...");

      // Find file input in DOM (do NOT click 'Thêm tài liệu' button because it triggers system file dialog)
      let fileInput = document.querySelector("input[type='file']");
      if (!fileInput) {
        for (let i = 0; i < 15; i++) {
          if (cancelFlow) return { cancelled: true };
          await sleep(200);
          fileInput = document.querySelector("input[type='file']");
          if (fileInput) break;
        }
      }

      if (fileInput) {
        const { fileDataUrl, filename } = resolveUploadDocument(profile, options);

        if (fileDataUrl) {
          showToast(`Đang đính kèm file: ${filename} (SV: ${profile.fullName || ""} - MSSV: ${profile.studentId || ""})...`);
          const success = setFileInputValue(fileInput, fileDataUrl, filename);
          await sleep(1200);

          if (cancelFlow) return { cancelled: true };

          if (!success) {
            showToast("Không thể đính kèm file tài liệu vào trang.", "error");
            return { ok: false, error: "Không thể đính kèm file tài liệu vào trang." };
          }

          showToast(`✓ Đã đính kèm thành công: ${filename}`);

          // Chờ nút Gửi khả dụng (không bị disabled) rồi mới bấm
          let step2Submit = null;
          for (let w = 0; w < 10; w++) {
            step2Submit = findSubmitButton();
            if (step2Submit && !step2Submit.disabled) break;
            await sleep(250);
          }

          if (step2Submit && !step2Submit.disabled && options.autoSubmit !== false) {
            step2Submit.click();
            showToast(`Đã gửi xác nhận với file: ${filename}!`);
          }
          return { ok: true, step: "COMPLETED", uploaded: true, filename, fullName: profile.fullName, studentId: profile.studentId };
        }
      } else {
        showToast("Không tìm thấy ô upload tài liệu.", "error");
        return { ok: false, error: "Không tìm thấy ô upload tài liệu." };
      }
    }

    return { ok: true, step: pageStatus.step };
  }

  async function executeImageUploadOnly(profile, options = {}) {
    cancelFlow = false;
    isFlowRunning = true;

    showToast("Đang chạy chế độ: Chỉ upload lại hình ảnh thẻ SV (.png)...");

    // 1. Nếu chưa có input[type="file"] hiển thị, kiểm tra xem trang có nút "Thử lại" / "Tải lại" không (khi tài liệu lần đầu bị từ chối)
    let fileInput = document.querySelector("input[type='file']");
    if (!fileInput) {
      const retryBtn = Array.from(document.querySelectorAll("button, a, [role='button']")).find(el => {
        if (!isVisible(el)) return false;
        const txt = (el.textContent || el.value || "").trim().toLowerCase();
        return /^(thử\s*lại|tải\s*lại.*|gửi\s*lại.*|tải\s*bằng\s*chứng.*|tải\s*tài\s*liệu.*|try\s*again|upload\s*again|re-?upload.*)$/i.test(txt);
      });
      if (retryBtn) {
        retryBtn.scrollIntoView({ block: "center", behavior: "smooth" });
        retryBtn.click();
        await sleep(600);
      }

      for (let i = 0; i < 15; i++) {
        if (cancelFlow) return { cancelled: true };
        fileInput = document.querySelector("input[type='file']");
        if (fileInput) break;
        await sleep(200);
      }
    }

    // 2. Nếu trên màn hình đang có sẵn thẻ file cũ bị lỗi (ví dụ file .pdf bị lỗi icon như lần đầu) có nút xóa (×), bấm xóa trước khi đính kèm ảnh mới
    if (options.clearPreviousFiles !== false) {
      const pdfLabels = Array.from(document.querySelectorAll("div, span, p")).filter(el => {
        if (!isVisible(el) || el.children.length > 0) return false;
        const t = (el.textContent || "").trim();
        return /\.(pdf|png|jpg|jpeg)$/i.test(t) && t.length < 120;
      });
      for (const lbl of pdfLabels) {
        const card = lbl.parentElement?.parentElement || lbl.parentElement;
        if (!card) continue;
        const removeBtn = Array.from(card.querySelectorAll("button, [role='button']")).find(
          b => isVisible(b) && b.id !== "closeOverlay" && b.id !== "minimizeOverlay"
        );
        if (removeBtn) {
          removeBtn.click();
          await sleep(300);
        }
      }
    }

    fileInput = document.querySelector("input[type='file']");
    if (!fileInput) {
      const errMsg = "Không tìm thấy ô upload hình ảnh trên trang hiện tại.";
      showToast(errMsg, "error");
      return { ok: false, error: errMsg };
    }

    // 3. Luôn lấy định dạng ảnh PNG (.png) cho chức năng upload hình ảnh riêng
    const { fileDataUrl, filename } = resolveUploadDocument(profile, {
      ...options,
      docFormat: "png"
    });

    if (!fileDataUrl) {
      const errMsg = "Chưa có dữ liệu hình ảnh thẻ sinh viên (.png) để upload.";
      showToast(errMsg, "error");
      return { ok: false, error: errMsg };
    }

    if (cancelFlow) return { cancelled: true };

    showToast(`Đang upload hình ảnh: ${filename} (SV: ${profile.fullName || ""} - MSSV: ${profile.studentId || ""})...`);
    const success = setFileInputValue(fileInput, fileDataUrl, filename);
    await sleep(1200);

    if (cancelFlow) return { cancelled: true };

    if (!success) {
      const errMsg = "Không thể đính kèm hình ảnh vào ô upload của trang.";
      showToast(errMsg, "error");
      return { ok: false, error: errMsg };
    }

    showToast(`✓ Đã đính kèm hình ảnh thành công: ${filename}`);

    // 4. Chờ nút Gửi khả dụng (không bị disabled) rồi bấm gửi xác nhận
    if (options.autoSubmit !== false) {
      let submitBtn = null;
      for (let w = 0; w < 12; w++) {
        submitBtn = findSubmitButton();
        if (submitBtn && !submitBtn.disabled) break;
        await sleep(250);
      }

      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        showToast(`Đã gửi lại hình ảnh xác minh: ${filename}!`);
      }
    }

    return {
      ok: true,
      step: "COMPLETED",
      uploaded: true,
      imageOnly: true,
      filename,
      fullName: profile.fullName,
      studentId: profile.studentId
    };
  }

  function elementLooksLikeSubmit(element) {
    const text = `${describe(element)} ${element.textContent || ""}`.toLowerCase();
    return element.matches("button[type='submit'], input[type='submit']")
      || /\b(submit|send application|finish|confirm)\b|gửi\s*(hồ\s*sơ|đăng\s*ký)|hoàn\s*tất|xác\s*nhận/i.test(text);
  }

  async function waitForSelector(selector, timeoutMs) {
    const timeout = Math.min(Math.max(Number(timeoutMs) || 5000, 100), 10000);
    const started = Date.now();
    while (Date.now() - started < timeout) {
      let element;
      try {
        element = document.querySelector(selector);
      } catch {
        return null;
      }
      if (element && isVisible(element)) return element;
      await sleep(100);
    }
    return null;
  }

  async function runActions(actions, options) {
    const results = [];
    for (const action of actions || []) {
      if (action.type === "pause") {
        const delay = Math.min(Math.max(Number(action.delayMs) || 300, 0), 10000);
        await sleep(delay);
        results.push({ type: "pause", ok: true, detail: `${delay} ms` });
        continue;
      }

      const element = await waitForSelector(action.selector, action.timeoutMs);
      if (!element) {
        results.push({ type: action.type, ok: false, detail: `Không thấy ${action.selector}` });
        break;
      }

      if (action.type === "waitFor") {
        results.push({ type: "waitFor", ok: true, detail: action.selector });
        continue;
      }

      if (action.type === "click") {
        if (elementLooksSensitive(element, options)) {
          results.push({ type: "click", ok: false, detail: "Đã dừng ở CAPTCHA hoặc SSO." });
          break;
        }
        if (elementLooksLikeSubmit(element) && !options.allowSubmit) {
          results.push({ type: "click", ok: false, detail: "Đã dừng trước nút gửi/xác nhận cuối." });
          break;
        }
        element.scrollIntoView({ block: "center", behavior: "smooth" });
        element.click();
        results.push({ type: "click", ok: true, detail: action.selector });
        await sleep(Math.min(Math.max(Number(action.delayMs) || 350, 0), 10000));
      }
    }
    return results;
  }

  async function handleMessage(message) {
    if (!message || message.namespace !== "autoform-local") return null;

    if (message.type === "TOGGLE_OVERLAY") {
      return { ok: true, ...createOverlay() };
    }

    if (message.type === "PING") {
      return { ok: true, url: location.href, title: document.title };
    }

    const rule = message.rule || {};
    if (rule.match && !core.matchUrlPattern(location.href, rule.match)) {
      return { ok: false, error: "Quy tắc không khớp URL hiện tại." };
    }

    if (message.type === "SCAN") {
      const proposals = buildProposals(message.profile, rule, message.options);
      return {
        ok: true,
        candidateCount: getCandidates().length,
        proposals: publicProposals(proposals)
      };
    }

    if (message.type === "FILL") {
      const normalizedProfile = core.deriveProfile(message.profile);
      await selectCountry(normalizedProfile.country || "Việt Nam");
      await sleep(250);

      const targetSchool = (normalizedProfile.schoolName || "Trường Đại Học Xây Dựng Hà Nội").trim();
      const schoolResult = await selectSchoolAutocomplete(targetSchool);
      if (!schoolResult || !schoolResult.ok || !isSchoolSelected(targetSchool, { allowCanonicalInputUpdate: true })) {
        const errMsg = schoolResult?.error || `Không thể chọn chính xác tổ chức "${targetSchool}". Đã dừng điền thông tin.`;
        showToast(errMsg, "error");
        return { ok: false, error: errMsg, filled: 0, failed: ["Trường học"] };
      }
      await sleep(300);

      const proposals = buildProposals(normalizedProfile, rule, message.options);
      const priority = { firstName: 1, lastName: 2, birthDay: 3, birthMonth: 4, birthYear: 5, email: 6, studentId: 7 };
      proposals.sort((a, b) => (priority[a.key] || 99) - (priority[b.key] || 99));

      let filled = 1; // Đã chọn trường học thành công
      const failed = [];
      for (const proposal of proposals) {
        if (["schoolName", "country", "birthMonth"].includes(proposal.key)) continue;
        if (setNativeValue(proposal.element, proposal.value, proposal)) filled += 1;
        else failed.push(proposal.label);
        await sleep(200);
      }

      // Explicit fallback verification for SheerID specific fields
      const fNameVal = normalizedProfile.firstName || (normalizedProfile.fullName && normalizedProfile.lastName ? normalizedProfile.fullName.replace(new RegExp(`^${normalizedProfile.lastName}\\s*`, "i"), "").trim() : "");
      const fNameInput = document.querySelector("#sid-first-name, input[name='firstName'], input[name='first-name'], input[autocomplete='given-name']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && !/lastName|sid[-_]last[-_]name|email|school|organization|birth/i.test(i.id + " " + i.name) && /(?:sid[-_]first[-_]name|firstName|\btên\b)/i.test(describe(i)));
      if (fNameInput && (!fNameInput.value.trim() || fNameInput.value.trim() !== fNameVal) && fNameVal) {
        if (setNativeValue(fNameInput, fNameVal)) filled += 1;
        await sleep(150);
      }

      const lNameInput = document.querySelector("#sid-last-name, input[name='lastName'], input[name='last-name'], input[autocomplete='family-name']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && !/firstName|sid[-_]first[-_]name|email|school|organization|birth/i.test(i.id + " " + i.name) && /(?:sid[-_]last[-_]name|lastName|\bhọ\b)/i.test(describe(i)));
      if (lNameInput && (!lNameInput.value.trim() || lNameInput.value.trim() !== normalizedProfile.lastName) && normalizedProfile.lastName) {
        if (setNativeValue(lNameInput, normalizedProfile.lastName)) filled += 1;
        await sleep(150);
      }

      const bDayInput = document.querySelector("#sid-birthdate-day, input[name='birthDate-day'], input[name*='day' i]")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /(?:sid[-_]birthdate[-_]*day|birthdate[-_]*day|\bday\b|\bdd\b)/i.test(describe(i)));
      if (bDayInput && (!bDayInput.value.trim() || bDayInput.value.trim() !== normalizedProfile.birthDay) && normalizedProfile.birthDay) {
        if (setNativeValue(bDayInput, normalizedProfile.birthDay)) filled += 1;
        await sleep(150);
      }

      if (normalizedProfile.birthMonth) {
        if (await selectBirthMonth(normalizedProfile.birthMonth)) filled += 1;
        await sleep(150);
      }

      const bYearInput = document.querySelector("#sid-birthdate-year, input[name='birthDate-year'], input[name*='year' i]")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /(?:sid[-_]birthdate[-_]*year|birthdate[-_]*year|\byear\b|\byyyy\b)/i.test(describe(i)));
      if (bYearInput && (!bYearInput.value.trim() || bYearInput.value.trim() !== normalizedProfile.birthYear) && normalizedProfile.birthYear) {
        if (setNativeValue(bYearInput, normalizedProfile.birthYear)) filled += 1;
        await sleep(150);
      }

      const emailInput = document.querySelector("#sid-email, input[type='email'], input[name='email']")
        || Array.from(document.querySelectorAll("input")).find(i => isVisible(i) && /email|thư\s*điện\s*tử/i.test(describe(i)));
      if (emailInput && (!emailInput.value.trim() || emailInput.value.trim() !== normalizedProfile.email) && normalizedProfile.email) {
        if (setNativeValue(emailInput, normalizedProfile.email)) filled += 1;
        await sleep(150);
      }

      showToast(`Đã điền ${filled} trường${failed.length ? `, ${failed.length} trường cần kiểm tra` : ""}.`);
      return { ok: true, filled, failed, proposals: publicProposals(proposals) };
    }

    if (message.type === "RUN") {
      const proposals = buildProposals(message.profile, rule, message.options);
      let filled = 0;
      for (const proposal of proposals) {
        if (setNativeValue(proposal.element, proposal.value, proposal)) filled += 1;
      }
      const actions = await runActions(rule.actions, message.options || {});
      const stopped = actions.find((result) => !result.ok);
      showToast(stopped ? stopped.detail : `Đã điền ${filled} trường và chạy xong quy tắc.`, stopped ? "error" : "ok");
      return { ok: !stopped, filled, actions, error: stopped?.detail };
    }

    if (message.type === "STOP_FLOW") {
      cancelFlow = true;
      isFlowRunning = false;
      showToast("Đã dừng quy trình tự động.", "error");
      return { ok: true, stopped: true };
    }

    if (message.type === "GET_PAGE_STATUS") {
      return {
        ok: true,
        status: detectPageStatus(),
        url: location.href,
        host: location.host,
        title: document.title
      };
    }

    if (message.type === "RUN_FULL_AUTO_FLOW") {
      cancelFlow = false;
      isFlowRunning = true;
      try {
        const result = await executeFullAutoFlow(message.profile, message.options || {});
        return { ok: result?.ok !== false, ...result };
      } catch (err) {
        showToast(err.message || "Lỗi tự động hóa", "error");
        return { ok: false, error: err.message || String(err) };
      } finally {
        isFlowRunning = false;
      }
    }

    if (message.type === "UPLOAD_IMAGE_ONLY") {
      cancelFlow = false;
      isFlowRunning = true;
      try {
        const result = await executeImageUploadOnly(message.profile, message.options || {});
        return { ok: result?.ok !== false, ...result };
      } catch (err) {
        showToast(err.message || "Lỗi upload hình ảnh", "error");
        return { ok: false, error: err.message || String(err) };
      } finally {
        isFlowRunning = false;
      }
    }

    return { ok: false, error: "Lệnh không được hỗ trợ." };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  });
})();
