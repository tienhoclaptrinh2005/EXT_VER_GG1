"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/shared/core.js");

test("deriveProfile normalizes user data without inventing identity fields", () => {
  const result = core.deriveProfile({
    firstName: "  An  ",
    lastName: "Nguyễn ",
    phone: "+84 (912) 345-678"
  });
  assert.equal(result.fullName, "An Nguyễn");
  assert.equal(result.phone, "+84912345678");
  assert.equal(result.studentId, "");
});

test("deriveProfile exposes split birth date parts for multi-control forms", () => {
  const result = core.deriveProfile({ birthDate: "2002-09-07" });
  assert.equal(result.birthDay, "07");
  assert.equal(result.birthMonth, "09");
  assert.equal(result.birthYear, "2002");
});

test("inferFieldKey recognizes common Vietnamese and HTML form fields", () => {
  assert.equal(core.inferFieldKey("Mã sinh viên", "", "text"), "studentId");
  assert.equal(core.inferFieldKey("Email liên hệ", "", "email"), "email");
  assert.equal(core.inferFieldKey("", "family-name", "text"), "lastName");
  assert.equal(core.inferFieldKey("", "bday-month", "text"), "birthMonth");
  assert.equal(core.inferFieldKey("birthDate-year", "", "text"), "birthYear");
  assert.equal(core.inferFieldKey("Họ và tên", "", "text"), "fullName");
  assert.equal(core.inferFieldKey("Ngày tốt nghiệp", "", "date"), "graduationDate");
  // SheerID specific form fields
  assert.equal(core.inferFieldKey("Nhập tên của bạn chính xác như tên xuất hiện trên hồ sơ chính thức của trường bạn Tên*", "", "text"), "firstName");
  assert.equal(core.inferFieldKey("Tên*", "", "text"), "firstName");
  assert.equal(core.inferFieldKey("Họ*", "", "text"), "lastName");
  assert.equal(core.inferFieldKey("sid-first-name", "", "text"), "firstName");
  assert.equal(core.inferFieldKey("sid-last-name", "", "text"), "lastName");
  assert.equal(core.inferFieldKey("sid-birthdate-day", "", "text"), "birthDay");
  assert.equal(core.inferFieldKey("sid-birthdate__month", "", "select-one"), "birthMonth");
  assert.equal(core.inferFieldKey("sid-birthdate-year", "", "text"), "birthYear");
  assert.equal(core.inferFieldKey("Quốc gia", "", "select-one"), "country");
  assert.equal(core.inferFieldKey("sid-country", "", "select-one"), "country");
  assert.equal(core.inferFieldKey("sid-organization", "", "text"), "schoolName");
});

test("renderTemplate replaces known placeholders and leaves unknown ones visible", () => {
  const rendered = core.renderTemplate("{{fullName}} - {{custom.course}} - {{unknown}}", {
    fullName: "Nguyễn Văn An",
    custom: { course: "CNTT" }
  });
  assert.equal(rendered, "Nguyễn Văn An - CNTT - {{unknown}}");
});

test("matchUrlPattern supports explicit wildcard rules", () => {
  assert.equal(core.matchUrlPattern("https://example.edu/verify/123", "https://example.edu/verify/*"), true);
  assert.equal(core.matchUrlPattern("https://other.edu/verify/123", "https://example.edu/verify/*"), false);
});

test("validateRule rejects unsupported actions", () => {
  const result = core.validateRule({ actions: [{ type: "eval", code: "alert(1)" }] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /click, waitFor/);
});
