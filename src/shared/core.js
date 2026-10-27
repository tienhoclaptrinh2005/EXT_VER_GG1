(function initAutoFormCore(globalScope) {
  "use strict";

  const FIELD_ALIASES = Object.freeze({
    "given-name": "firstName",
    "family-name": "lastName",
    firstname: "firstName",
    "first-name": "firstName",
    lastname: "lastName",
    "last-name": "lastName",
    name: "fullName",
    bday: "birthDate",
    "bday-day": "birthDay",
    "bday-month": "birthMonth",
    "bday-year": "birthYear",
    email: "email",
    tel: "phone",
    "street-address": "addressLine1",
    "address-line1": "addressLine1",
    "address-line2": "addressLine2",
    "address-level2": "city",
    "address-level1": "state",
    "postal-code": "postalCode",
    country: "country",
    "country-name": "country",
    organization: "schoolName",
    school: "schoolName"
  });

  const FIELD_PATTERNS = Object.freeze([
    ["studentCardImage", /\b(student\s*id\s*card|id\s*card|card\s*(photo|image)|student\s*card|enrollment\s*document|verification\s*document|upload\s*(id|card|document)|proof\s*(of\s*enrollment)?|student\s*proof|identity\s*document)\b|ảnh\s*(thẻ|thẻ\s*sinh\s*viên|mặt\s*trước)|thẻ\s*sinh\s*viên|tải\s*(lên\s*)?thẻ|minh\s*chứng|giấy\s*tờ|tài\s*liệu/i],
    ["studentId", /\b(student\s*(id|number|no)|matriculation\s*(id|number)|mssv)\b|mã\s*(số\s*)?sinh\s*viên/i],
    ["country", /\b(country|nation|country-name|sid[-_]country)\b|quốc\s*gia/iu],
    ["fullName", /\b(full|legal|student)[-_ ]*name\b|họ\s*(và|&)?\s*tên/iu],
    ["firstName", /\b(first|given|forename)[-_ ]*name\b|sid[-_]first[-_]name|(?:^|[^\p{L}\p{N}])(tên(\s*gọi)?)(?:[^\p{L}\p{N}]|$)/iu],
    ["lastName", /\b(last|family|sur)[-_ ]*name\b|sid[-_]last[-_]name|(?:^|[^\p{L}\p{N}])(họ)(?:[^\p{L}\p{N}]|$)/iu],
    ["birthDay", /\b(birth(?:\s*date)?|dob)[\s_.-]*(day|dd)\b|\b(day|dd)[\s_.-]*(?:of[\s_.-]*)?(birth(?:\s*date)?|dob)\b|sid[-_]birthdate[-_]*day|ngày\s*sinh[^\n]*(ngày|dd)|(?:^|[^\p{L}\p{N}])(ngày(?!\s*sinh)|dd)(?:[^\p{L}\p{N}]|$)/iu],
    ["birthMonth", /\b(birth(?:\s*date)?|dob)[\s_.-]*(month|mm)\b|\b(month|mm)[\s_.-]*(?:of[\s_.-]*)?(birth(?:\s*date)?|dob)\b|sid[-_]birthdate.*month|ngày\s*sinh[^\n]*(tháng|mm)|(?:^|[^\p{L}\p{N}])(tháng|mm)(?:[^\p{L}\p{N}]|$)/iu],
    ["birthYear", /\b(birth(?:\s*date)?|dob)[\s_.-]*(year|yyyy)\b|\b(year|yyyy)[\s_.-]*(?:of[\s_.-]*)?(birth(?:\s*date)?|dob)\b|sid[-_]birthdate[-_]*year|ngày\s*sinh[^\n]*(năm|yyyy)|(?:^|[^\p{L}\p{N}])(năm|yyyy)(?:[^\p{L}\p{N}]|$)/iu],
    ["birthDate", /\b(date\s*of\s*birth|birth\s*date|birthday|dob)\b|ngày\s*sinh/iu],
    ["graduationDate", /\b(graduation|graduate|completion)\s*(date|year)?\b|ngày\s*tốt\s*nghiệp|năm\s*tốt\s*nghiệp/iu],
    ["schoolName", /\b(school|university|college|institution|campus|organization)\b|sid[-_]organization|trường\s*(học|đại\s*học)?|cơ\s*sở\s*đào\s*tạo/iu],
    ["email", /\be-?mail\b|thư\s*điện\s*tử|sid[-_]email/iu],
    ["phone", /\b(phone|mobile|telephone|tel)\b|điện\s*thoại|số\s*di\s*động/iu],
    ["addressLine2", /\b(address\s*(line)?\s*2|apartment|apt|suite|unit)\b|địa\s*chỉ\s*2/iu],
    ["addressLine1", /\b(street\s*address|address\s*(line)?\s*1|address)\b|địa\s*chỉ/iu],
    ["postalCode", /\b(postal|zip)\s*(code)?\b|mã\s*bưu\s*(chính|điện)/iu],
    ["city", /\b(city|town|locality)\b|thành\s*phố|quận|huyện/iu],
    ["state", /\b(state|province|region)\b|tỉnh|khu\s*vực/iu]
  ]);

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function compactSpaces(value) {
    return text(value).replace(/\s+/g, " ");
  }

  function normalizePhone(value) {
    const original = text(value);
    if (!original) return "";
    const hasPlus = original.startsWith("+");
    const digits = original.replace(/\D/g, "");
    return `${hasPlus ? "+" : ""}${digits}`;
  }

  function deriveProfile(rawProfile) {
    const raw = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    const custom = raw.custom && typeof raw.custom === "object" && !Array.isArray(raw.custom)
      ? { ...raw.custom }
      : {};

    const birthDate = text(raw.birthDate);
    const birthParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
      || (() => {
        const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(birthDate);
        return dmy ? [null, dmy[3], dmy[2].padStart(2, "0"), dmy[1].padStart(2, "0")] : null;
      })();
    const profile = {
      profileName: compactSpaces(raw.profileName),
      firstName: compactSpaces(raw.firstName),
      middleName: compactSpaces(raw.middleName),
      lastName: compactSpaces(raw.lastName),
      fullName: compactSpaces(raw.fullName),
      birthDate,
      birthDay: text(raw.birthDay) || (birthParts ? birthParts[3] : ""),
      birthMonth: text(raw.birthMonth) || (birthParts ? birthParts[2] : ""),
      birthYear: text(raw.birthYear) || (birthParts ? birthParts[1] : ""),
      email: text(raw.email),
      phone: normalizePhone(raw.phone),
      studentId: compactSpaces(raw.studentId),
      schoolName: compactSpaces(raw.schoolName),
      graduationDate: text(raw.graduationDate),
      addressLine1: compactSpaces(raw.addressLine1),
      addressLine2: compactSpaces(raw.addressLine2),
      city: compactSpaces(raw.city),
      state: compactSpaces(raw.state),
      postalCode: compactSpaces(raw.postalCode),
      country: compactSpaces(raw.country),
      cardImage: text(raw.cardImage) || (raw.custom && text(raw.custom.cardImage)) || "",
      cardFilename: text(raw.cardFilename) || (raw.custom && text(raw.custom.cardFilename)) || "the_sinh_vien.png",
      cardPdf: text(raw.cardPdf) || (raw.custom && text(raw.custom.cardPdf)) || "",
      cardPdfFilename: text(raw.cardPdfFilename) || (raw.custom && text(raw.custom.cardPdfFilename)) || "the_sinh_vien.pdf",
      custom
    };

    if (!profile.fullName) {
      profile.fullName = compactSpaces(`${profile.firstName} ${profile.lastName}`);
    }

    return profile;
  }

  function inferFieldKey(descriptor, autocomplete, inputType) {
    const autoToken = text(autocomplete).toLowerCase().split(/\s+/).find((token) => FIELD_ALIASES[token]);
    if (autoToken) return FIELD_ALIASES[autoToken];

    const type = text(inputType).toLowerCase();
    if (type === "email") return "email";
    if (type === "tel") return "phone";
    if (type === "file") {
      const fileDesc = compactSpaces(descriptor);
      if (/card|id|thẻ|sinh\s*viên|proof|document|minh\s*chứng|photo|image|tài\s*liệu/i.test(fileDesc)) {
        return "studentCardImage";
      }
      return "studentCardImage"; // default file target in verification form
    }
    if (type === "date") {
      const dateDescriptor = compactSpaces(descriptor);
      if (/graduat|tốt\s*nghiệp/i.test(dateDescriptor)) return "graduationDate";
      if (/birth|birthday|dob|ngày\s*sinh/i.test(dateDescriptor)) return "birthDate";
    }

    const haystack = compactSpaces(descriptor);
    for (const [key, pattern] of FIELD_PATTERNS) {
      if (pattern.test(haystack)) return key;
    }
    return null;
  }

  function getByPath(source, path) {
    if (!source || typeof source !== "object" || typeof path !== "string") return undefined;
    return path.split(".").reduce((value, segment) => {
      if (!value || typeof value !== "object") return undefined;
      return Object.prototype.hasOwnProperty.call(value, segment) ? value[segment] : undefined;
    }, source);
  }

  function renderTemplate(template, profile) {
    const data = deriveProfile(profile);
    return String(template ?? "").replace(/{{\s*([a-zA-Z][\w.-]*)\s*}}/g, (token, key) => {
      const value = getByPath(data, key);
      return value === undefined || value === null ? token : String(value);
    });
  }

  function wildcardToRegExp(pattern) {
    const escaped = String(pattern)
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  }

  function matchUrlPattern(url, pattern) {
    if (!text(pattern)) return true;
    try {
      return wildcardToRegExp(pattern).test(String(url));
    } catch {
      return false;
    }
  }

  function validateRule(rule) {
    const errors = [];
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      return { valid: false, errors: ["Quy tắc phải là một JSON object."] };
    }

    if (rule.match !== undefined && typeof rule.match !== "string") {
      errors.push("match phải là chuỗi URL, có thể dùng dấu *.");
    }

    if (rule.fields !== undefined) {
      if (!rule.fields || typeof rule.fields !== "object" || Array.isArray(rule.fields)) {
        errors.push("fields phải là object dạng selector: fieldKey.");
      } else {
        for (const [selector, key] of Object.entries(rule.fields)) {
          if (!text(selector)) errors.push("Selector trong fields không được để trống.");
          if (typeof key !== "string" || !/^[a-zA-Z][\w.-]*$/.test(key)) {
            errors.push(`Field key không hợp lệ cho selector ${selector || "(trống)"}.`);
          }
        }
      }
    }

    if (rule.actions !== undefined) {
      if (!Array.isArray(rule.actions)) {
        errors.push("actions phải là một mảng.");
      } else {
        rule.actions.forEach((action, index) => {
          if (!action || typeof action !== "object") {
            errors.push(`Action ${index + 1} không hợp lệ.`);
            return;
          }
          if (!["click", "waitFor", "pause"].includes(action.type)) {
            errors.push(`Action ${index + 1}: type chỉ nhận click, waitFor hoặc pause.`);
          }
          if (["click", "waitFor"].includes(action.type) && !text(action.selector)) {
            errors.push(`Action ${index + 1}: thiếu selector.`);
          }
          if (action.delayMs !== undefined && (!Number.isFinite(action.delayMs) || action.delayMs < 0 || action.delayMs > 10000)) {
            errors.push(`Action ${index + 1}: delayMs phải từ 0 đến 10000.`);
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  const api = Object.freeze({
    deriveProfile,
    getByPath,
    inferFieldKey,
    matchUrlPattern,
    normalizePhone,
    renderTemplate,
    validateRule
  });

  globalScope.AutoFormCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
