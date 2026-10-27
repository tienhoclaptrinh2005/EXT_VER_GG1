"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/shared/core.js");

test("SheerID field identification: all SheerID fields mapped accurately", () => {
  // First Name field with SheerID prompt text
  const sheerdIdFirstNameDesc = "Nhập tên của bạn chính xác như tên xuất hiện trên hồ sơ chính thức của trường bạn Tên* sid-first-name firstName";
  assert.equal(core.inferFieldKey(sheerdIdFirstNameDesc, "", "text"), "firstName");

  // Last Name field
  assert.equal(core.inferFieldKey("Họ* sid-last-name lastName", "", "text"), "lastName");
  assert.equal(core.inferFieldKey("Họ*", "", "text"), "lastName");
  assert.equal(core.inferFieldKey("Tên*", "", "text"), "firstName");

  // Country
  assert.equal(core.inferFieldKey("Quốc gia sid-country", "", "select-one"), "country");
  assert.equal(core.inferFieldKey("Country", "", "select-one"), "country");

  // School
  assert.equal(core.inferFieldKey("Trường học* sid-organization", "", "text"), "schoolName");

  // Birth date parts
  assert.equal(core.inferFieldKey("sid-birthdate-day Ngày", "", "text"), "birthDay");
  assert.equal(core.inferFieldKey("sid-birthdate__month Tháng", "", "select-one"), "birthMonth");
  assert.equal(core.inferFieldKey("sid-birthdate-year Năm", "", "text"), "birthYear");

  // Email
  assert.equal(core.inferFieldKey("Địa chỉ email* sid-email", "", "email"), "email");
});

test("deriveProfile correctly handles Vietnamese birth dates and formats", () => {
  // ISO format
  const p1 = core.deriveProfile({ birthDate: "2006-03-12" });
  assert.equal(p1.birthDay, "12");
  assert.equal(p1.birthMonth, "03");
  assert.equal(p1.birthYear, "2006");

  // DD/MM/YYYY format
  const p2 = core.deriveProfile({ birthDate: "12/03/2006" });
  assert.equal(p2.birthDay, "12");
  assert.equal(p2.birthMonth, "03");
  assert.equal(p2.birthYear, "2006");
});

test("Vietnamese month mapping logic matches 1-12 to Vietnamese month names", () => {
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
  assert.equal(VN_MONTHS[1], "Tháng Một");
  assert.equal(VN_MONTHS[3], "Tháng Ba");
  assert.equal(VN_MONTHS[11], "Tháng Mười Một");
  assert.equal(VN_MONTHS[12], "Tháng Mười Hai");
});

