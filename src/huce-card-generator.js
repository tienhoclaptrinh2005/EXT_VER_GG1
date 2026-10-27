"use strict";

(function initHuceGeneratorPage() {
  const ASSETS = (typeof HuceRules !== "undefined" && HuceRules.ASSETS) ? HuceRules.ASSETS : {};
  let currentProfile = (typeof HuceRules !== "undefined" && HuceRules.getOriginalSampleProfile)
    ? HuceRules.getOriginalSampleProfile()
    : {
        fullName: "NGUYỄN VŨ MINH ĐỨC",
        firstName: "Đức",
        middleName: "Vũ Minh",
        lastName: "Nguyễn",
        gender: "male",
        birthDate: "25/11/2005",
        birthDateFormatted: "25/11/2005",
        birthDateIso: "2005-11-25",
        birthDay: "25",
        birthMonth: "11",
        birthYear: "2005",
        studentId: "0174268",
        className: "68QD1",
        faculty: "Kinh tế & Quản lý xây dựng",
        email: "duc0174268@huce.edu.vn",
        course: "2023-2027",
        cohortK: 68,
        avatarKey: "original_avatar"
      };

  let currentAvatarDataUrl = ASSETS.original_avatar || "";

  const cardWrapper = document.getElementById("cardWrapper");
  const cardScene = document.getElementById("cardScene");
  const cardSheen = document.getElementById("cardSheen");
  const cardLogoImg = document.getElementById("cardLogoImg");
  const cardAvatarImg = document.getElementById("cardAvatarImg");
  const cardStudentName = document.getElementById("cardStudentName");
  const cardStudentDob = document.getElementById("cardStudentDob");
  const cardMssv = document.getElementById("cardMssv");
  const cardClass = document.getElementById("cardClass");
  const cardFaculty = document.getElementById("cardFaculty");
  const cardEmail = document.getElementById("cardEmail");
  const cardCourse = document.getElementById("cardCourse");

  const inputFullName = document.getElementById("inputFullName");
  const inputBirthDate = document.getElementById("inputBirthDate");
  const inputStudentId = document.getElementById("inputStudentId");
  const inputClass = document.getElementById("inputClass");
  const inputFaculty = document.getElementById("inputFaculty");
  const inputEmail = document.getElementById("inputEmail");
  const inputCourse = document.getElementById("inputCourse");
  const checkAutoEmail = document.getElementById("checkAutoEmail");

  const ruleGender = document.getElementById("ruleGender");
  const ruleCohort = document.getElementById("ruleCohort");
  const ruleFaculty = document.getElementById("ruleFaculty");

  const btnQuickRandom = document.getElementById("btnQuickRandom");
  const btnApplyRule = document.getElementById("btnApplyRule");
  const btnResetOriginal = document.getElementById("btnResetOriginal");
  const btnResetSample = document.getElementById("btnResetSample");
  const btnRandomAvatarOnly = document.getElementById("btnRandomAvatarOnly");
  const btnMode3D = document.getElementById("btnMode3D");
  const btnModeFlat = document.getElementById("btnModeFlat");
  const btnDownloadPng = document.getElementById("btnDownloadPng");
  const btnCopyClipboard = document.getElementById("btnCopyClipboard");
  const btnPrintCard = document.getElementById("btnPrintCard");
  const btnCopyJson = document.getElementById("btnCopyJson");
  const toastMsg = document.getElementById("toastMsg");
  const toastText = document.getElementById("toastText");

  const dropzone = document.getElementById("dropzone");
  const fileAvatar = document.getElementById("fileAvatar");

  let toastTimer = null;

  function showToast(msg) {
    if (!toastMsg || !toastText) return;
    clearTimeout(toastTimer);
    toastText.textContent = msg;
    toastMsg.classList.add("show");
    toastTimer = setTimeout(() => toastMsg.classList.remove("show"), 3000);
  }

  function parseDobParts(dobStr) {
    const clean = String(dobStr || "").trim();
    const m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, "0");
      const mm = m[2].padStart(2, "0");
      const yyyy = m[3];
      return {
        birthDay: dd,
        birthMonth: mm,
        birthYear: yyyy,
        birthDateFormatted: `${dd}/${mm}/${yyyy}`,
        birthDateIso: `${yyyy}-${mm}-${dd}`
      };
    }
    return {
      birthDay: currentProfile.birthDay || "25",
      birthMonth: currentProfile.birthMonth || "11",
      birthYear: currentProfile.birthYear || "2005",
      birthDateFormatted: clean || "25/11/2005",
      birthDateIso: currentProfile.birthDateIso || "2005-11-25"
    };
  }

  async function syncProfileToExtensionStorage() {
    try {
      if (typeof chrome === "undefined" || !chrome.storage || typeof HuceRules === "undefined") return;
      const docs = await HuceRules.renderCardDocuments(currentProfile, currentAvatarDataUrl, 2);
      const dobParts = parseDobParts(currentProfile.birthDate || currentProfile.birthDateFormatted);
      const nameParts = String(currentProfile.fullName || "").trim().split(/\s+/);
      const lastName = nameParts[0] || "Nguyễn";
      const givenName = nameParts.slice(1).join(" ") || currentProfile.firstName || "Đức";

      const rawProfile = {
        profileName: currentProfile.fullName,
        firstName: givenName,
        lastName: lastName,
        fullName: currentProfile.fullName,
        birthDate: dobParts.birthDateIso,
        birthDay: dobParts.birthDay,
        birthMonth: dobParts.birthMonth,
        birthYear: dobParts.birthYear,
        studentId: currentProfile.studentId,
        schoolName: "Trường Đại học Xây dựng Hà Nội",
        email: currentProfile.email,
        country: "Việt Nam",
        city: "Hà Nội",
        className: currentProfile.className,
        faculty: currentProfile.faculty,
        course: currentProfile.course,
        cardImage: docs?.pngDataUrl || "",
        cardFilename: docs?.pngFilename || HuceRules.getCardFilename(currentProfile, "png"),
        cardPdf: docs?.pdfDataUrl || "",
        cardPdfFilename: docs?.pdfFilename || HuceRules.getCardFilename(currentProfile, "pdf"),
        custom: {
          class: currentProfile.className,
          faculty: currentProfile.faculty,
          course: currentProfile.course,
          cohortK: currentProfile.cohortK || 68,
          cardImage: docs?.pngDataUrl || "",
          cardFilename: docs?.pngFilename || HuceRules.getCardFilename(currentProfile, "png"),
          cardPdf: docs?.pdfDataUrl || "",
          cardPdfFilename: docs?.pdfFilename || HuceRules.getCardFilename(currentProfile, "pdf")
        }
      };

      const derived = (typeof AutoFormCore !== "undefined" && AutoFormCore.deriveProfile)
        ? AutoFormCore.deriveProfile(rawProfile)
        : rawProfile;

      if (chrome.storage.session?.set) {
        await chrome.storage.session.set({ activeProfile: derived }).catch(() => {});
      }
      if (chrome.storage.local?.set) {
        await chrome.storage.local.set({ savedProfile: derived }).catch(() => {});
      }
    } catch (err) {
      console.warn("Không thể đồng bộ hồ sơ sang storage:", err);
    }
  }

  function renderCardUI(profile, avatarUrl) {
    currentProfile = { ...profile };
    const birthDisplay = currentProfile.birthDateFormatted || currentProfile.birthDate || "25/11/2005";
    currentProfile.birthDate = birthDisplay;
    currentProfile.birthDateFormatted = birthDisplay;

    if (avatarUrl) currentAvatarDataUrl = avatarUrl;

    if (cardStudentName) cardStudentName.textContent = currentProfile.fullName || "";
    if (cardStudentDob) cardStudentDob.textContent = birthDisplay;
    if (cardMssv) cardMssv.textContent = currentProfile.studentId || "";
    if (cardClass) cardClass.textContent = currentProfile.className || "";
    if (cardFaculty) cardFaculty.textContent = currentProfile.faculty || "";
    if (cardEmail) cardEmail.textContent = currentProfile.email || "";
    if (cardCourse) cardCourse.textContent = currentProfile.course || "";
    if (cardAvatarImg && currentAvatarDataUrl) cardAvatarImg.src = currentAvatarDataUrl;

    if (inputFullName) inputFullName.value = currentProfile.fullName || "";
    if (inputBirthDate) inputBirthDate.value = birthDisplay;
    if (inputStudentId) inputStudentId.value = currentProfile.studentId || "";
    if (inputClass) inputClass.value = currentProfile.className || "";
    if (inputFaculty) inputFaculty.value = currentProfile.faculty || "";
    if (inputEmail) inputEmail.value = currentProfile.email || "";
    if (inputCourse) inputCourse.value = currentProfile.course || "";
  }

  function triggerRandomGeneration() {
    if (typeof HuceRules === "undefined") {
      showToast("Lỗi: Chưa nạp thư viện HuceRules!");
      return;
    }
    const gender = ruleGender ? ruleGender.value : "any";
    const cohortK = ruleCohort ? Number(ruleCohort.value) : 68;
    const faculty = (ruleFaculty && ruleFaculty.value !== "all") ? ruleFaculty.value : null;

    const profile = HuceRules.generateRandomProfile({ gender, cohortK, faculty });
    const avatarUrl = ASSETS[profile.avatarKey] || ASSETS.original_avatar;

    document.querySelectorAll(".avatar-thumb").forEach((t) => {
      t.classList.toggle("active", t.dataset.key === profile.avatarKey);
    });

    renderCardUI(profile, avatarUrl);
    syncProfileToExtensionStorage();
    showToast(`Đã tạo & đồng bộ SV: ${profile.fullName} (${profile.className})`);
  }

  function resetToOriginalSample() {
    if (typeof HuceRules === "undefined") return;
    const orig = HuceRules.getOriginalSampleProfile();
    if (ruleGender) ruleGender.value = "male";
    if (ruleCohort) ruleCohort.value = "68";
    if (ruleFaculty) ruleFaculty.value = "Kinh tế & Quản lý xây dựng";

    document.querySelectorAll(".avatar-thumb").forEach((t) => {
      t.classList.toggle("active", t.dataset.key === "original_avatar");
    });

    renderCardUI(orig, ASSETS.original_avatar);
    syncProfileToExtensionStorage();
    showToast("Đã khôi phục thẻ mẫu gốc (Nguyễn Vũ Minh Đức)");
  }

  function randomizeAvatar() {
    const keys = ["original_avatar", "male_avatar_1", "male_avatar_2", "female_avatar_1"].filter(k => Boolean(ASSETS[k]));
    if (!keys.length) return;
    const currentKey = Array.from(document.querySelectorAll(".avatar-thumb.active"))[0]?.dataset?.key;
    const pool = keys.filter(k => k !== currentKey);
    const nextKey = (pool.length ? pool : keys)[Math.floor(Math.random() * (pool.length ? pool.length : keys.length))];
    currentAvatarDataUrl = ASSETS[nextKey];
    currentProfile.avatarKey = nextKey;
    if (cardAvatarImg) cardAvatarImg.src = currentAvatarDataUrl;

    document.querySelectorAll(".avatar-thumb").forEach((t) => {
      t.classList.toggle("active", t.dataset.key === nextKey);
    });
    syncProfileToExtensionStorage();
    showToast("Đã đổi ảnh thẻ sinh viên ngẫu nhiên");
  }

  function updateFromFormInputs() {
    currentProfile.fullName = (inputFullName?.value || "").trim().toUpperCase();
    const dobVal = (inputBirthDate?.value || "").trim();
    const dobParts = parseDobParts(dobVal);
    currentProfile.birthDate = dobVal;
    currentProfile.birthDateFormatted = dobParts.birthDateFormatted;
    currentProfile.birthDateIso = dobParts.birthDateIso;
    currentProfile.birthDay = dobParts.birthDay;
    currentProfile.birthMonth = dobParts.birthMonth;
    currentProfile.birthYear = dobParts.birthYear;

    currentProfile.studentId = (inputStudentId?.value || "").trim();
    currentProfile.className = (inputClass?.value || "").trim().toUpperCase();
    currentProfile.faculty = (inputFaculty?.value || "").trim();
    currentProfile.course = (inputCourse?.value || "").trim();

    if (checkAutoEmail?.checked && currentProfile.fullName && currentProfile.studentId && typeof HuceRules !== "undefined") {
      currentProfile.email = HuceRules.deriveEmail(currentProfile.fullName, currentProfile.studentId);
      if (inputEmail) inputEmail.value = currentProfile.email;
    } else if (inputEmail) {
      currentProfile.email = inputEmail.value.trim();
    }

    if (cardStudentName) cardStudentName.textContent = currentProfile.fullName;
    if (cardStudentDob) cardStudentDob.textContent = currentProfile.birthDate;
    if (cardMssv) cardMssv.textContent = currentProfile.studentId;
    if (cardClass) cardClass.textContent = currentProfile.className;
    if (cardFaculty) cardFaculty.textContent = currentProfile.faculty;
    if (cardEmail) cardEmail.textContent = currentProfile.email;
    if (cardCourse) cardCourse.textContent = currentProfile.course;

    syncProfileToExtensionStorage();
  }

  function handleFileUpload(e) {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  }

  function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentAvatarDataUrl = event.target.result;
      if (cardAvatarImg) cardAvatarImg.src = currentAvatarDataUrl;
      document.querySelectorAll(".avatar-thumb").forEach((t) => t.classList.remove("active"));
      syncProfileToExtensionStorage();
      showToast("Đã tải ảnh thẻ mới thành công!");
    };
    reader.readAsDataURL(file);
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function downloadCardPng() {
    try {
      showToast("Đang kết xuất ảnh thẻ PNG độ phân giải cao...");
      const docs = await HuceRules.renderCardDocuments(currentProfile, currentAvatarDataUrl, 3);
      if (!docs?.pngDataUrl) throw new Error("Không tạo được ảnh PNG");
      const blob = dataUrlToBlob(docs.pngDataUrl);
      triggerBlobDownload(blob, docs.pngFilename);
      await syncProfileToExtensionStorage();
      showToast(`Đã tải ảnh: ${docs.pngFilename}`);
    } catch (err) {
      showToast("Lỗi khi tải ảnh PNG: " + err.message);
    }
  }

  async function downloadCardPdf() {
    try {
      showToast("Đang kết xuất file PDF phôi thẻ sinh viên...");
      const docs = await HuceRules.renderCardDocuments(currentProfile, currentAvatarDataUrl, 2);
      if (!docs?.pdfDataUrl) throw new Error("Không tạo được file PDF");
      const blob = dataUrlToBlob(docs.pdfDataUrl);
      triggerBlobDownload(blob, docs.pdfFilename);
      await syncProfileToExtensionStorage();
      showToast(`Đã tải PDF: ${docs.pdfFilename}`);
    } catch (err) {
      showToast("Lỗi khi tải PDF: " + err.message);
    }
  }

  async function copyCardToClipboard() {
    try {
      showToast("Đang kết xuất ảnh vào bộ nhớ tạm...");
      const docs = await HuceRules.renderCardDocuments(currentProfile, currentAvatarDataUrl, 2);
      if (!docs?.pngDataUrl) throw new Error("Không tạo được ảnh");
      const blob = dataUrlToBlob(docs.pngDataUrl);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Đã sao chép ảnh thẻ vào Clipboard thành công!");
    } catch {
      showToast("Trình duyệt không cho phép ghi trực tiếp, vui lòng bấm Tải Ảnh PNG HD");
    }
  }

  async function copyProfileJson() {
    const dobParts = parseDobParts(currentProfile.birthDate);
    const exportData = {
      profileName: currentProfile.fullName,
      fullName: currentProfile.fullName,
      firstName: currentProfile.firstName,
      lastName: currentProfile.lastName,
      birthDate: dobParts.birthDateIso,
      birthDay: dobParts.birthDay,
      birthMonth: dobParts.birthMonth,
      birthYear: dobParts.birthYear,
      studentId: currentProfile.studentId,
      schoolName: "Trường Đại học Xây dựng Hà Nội",
      email: currentProfile.email,
      custom: {
        class: currentProfile.className,
        faculty: currentProfile.faculty,
        course: currentProfile.course,
        cohortK: currentProfile.cohortK || 68
      }
    };

    try {
      await syncProfileToExtensionStorage();
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      showToast("Đã chép JSON & đồng bộ hồ sơ sang Extension!");
    } catch {
      showToast("Đã đồng bộ hồ sơ sang Extension!");
    }
  }

  function setupCard3DInteractions() {
    if (!cardScene || !cardWrapper || !cardSheen) return;
    cardScene.addEventListener("mousemove", (e) => {
      if (cardWrapper.classList.contains("flat-mode")) return;
      const rect = cardWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      cardWrapper.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      cardSheen.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 60%, transparent 80%)`;
    });

    cardScene.addEventListener("mouseleave", () => {
      if (cardWrapper.classList.contains("flat-mode")) return;
      cardWrapper.style.transform = "rotateX(0deg) rotateY(0deg)";
      cardSheen.style.background = "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 40%, transparent 60%)";
    });
  }

  function setupEventListeners() {
    btnQuickRandom?.addEventListener("click", triggerRandomGeneration);
    btnApplyRule?.addEventListener("click", triggerRandomGeneration);
    btnResetOriginal?.addEventListener("click", resetToOriginalSample);
    btnResetSample?.addEventListener("click", resetToOriginalSample);
    btnRandomAvatarOnly?.addEventListener("click", randomizeAvatar);

    [inputFullName, inputBirthDate, inputStudentId, inputClass, inputFaculty, inputCourse].forEach((inp) => {
      inp?.addEventListener("input", updateFromFormInputs);
    });
    inputEmail?.addEventListener("input", () => {
      currentProfile.email = inputEmail.value.trim();
      if (cardEmail) cardEmail.textContent = currentProfile.email;
      syncProfileToExtensionStorage();
    });
    checkAutoEmail?.addEventListener("change", updateFromFormInputs);

    document.querySelectorAll(".avatar-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        document.querySelectorAll(".avatar-thumb").forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
        const key = thumb.dataset.key;
        if (ASSETS[key]) {
          currentAvatarDataUrl = ASSETS[key];
          currentProfile.avatarKey = key;
          if (cardAvatarImg) cardAvatarImg.src = currentAvatarDataUrl;
          syncProfileToExtensionStorage();
          showToast("Đã chọn ảnh thẻ từ thư viện");
        }
      });
    });

    dropzone?.addEventListener("click", () => fileAvatar?.click());
    fileAvatar?.addEventListener("change", handleFileUpload);

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer?.files?.[0]) {
        processImageFile(e.dataTransfer.files[0]);
      }
    });

    window.addEventListener("paste", (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          processImageFile(item.getAsFile());
          break;
        }
      }
    });

    btnMode3D?.addEventListener("click", () => {
      btnMode3D.classList.add("active");
      btnModeFlat?.classList.remove("active");
      if (cardWrapper) cardWrapper.className = "id-card-wrapper real-mode";
    });
    btnModeFlat?.addEventListener("click", () => {
      btnModeFlat.classList.add("active");
      btnMode3D?.classList.remove("active");
      if (cardWrapper) cardWrapper.className = "id-card-wrapper flat-mode";
    });

    btnDownloadPng?.addEventListener("click", downloadCardPng);
    btnCopyClipboard?.addEventListener("click", copyCardToClipboard);
    btnPrintCard?.addEventListener("click", downloadCardPdf);
    btnCopyJson?.addEventListener("click", copyProfileJson);
  }

  function init() {
    const thumbOrig = document.getElementById("thumb_original");
    const thumbMale1 = document.getElementById("thumb_male1");
    const thumbMale2 = document.getElementById("thumb_male2");
    const thumbFemale1 = document.getElementById("thumb_female1");

    if (thumbOrig && ASSETS.original_avatar) thumbOrig.src = ASSETS.original_avatar;
    if (thumbMale1 && ASSETS.male_avatar_1) thumbMale1.src = ASSETS.male_avatar_1;
    if (thumbMale2 && ASSETS.male_avatar_2) thumbMale2.src = ASSETS.male_avatar_2;
    if (thumbFemale1 && ASSETS.female_avatar_1) thumbFemale1.src = ASSETS.female_avatar_1;
    if (cardLogoImg && ASSETS.original_logo) cardLogoImg.src = ASSETS.original_logo;

    renderCardUI(currentProfile, currentAvatarDataUrl);
    setupEventListeners();
    setupCard3DInteractions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

