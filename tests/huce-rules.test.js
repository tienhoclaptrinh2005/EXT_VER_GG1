const test = require("node:test");
const assert = require("node:assert/strict");
const HuceRules = require("../src/shared/huce-rules.js");

test("HuceRules: deriveEmail correctly follows HUCE pattern", () => {
  // Test with original sample
  const emailSample = HuceRules.deriveEmail("NGUYỄN VŨ MINH ĐỨC", "0174268");
  assert.equal(emailSample, "duc0174268@huce.edu.vn");

  // Test with other Vietnamese names
  const email2 = HuceRules.deriveEmail("Trần Hoàng Nam", "0185268");
  assert.equal(email2, "nam0185268@huce.edu.vn");

  const email3 = HuceRules.deriveEmail("Lê Thị Phương Thảo", "0199969");
  assert.equal(email3, "thao0199969@huce.edu.vn");
});

test("HuceRules: generateStudentId matches 7-digit pattern and cohort suffix", () => {
  for (const k of [68, 69, 67, 66]) {
    const id = HuceRules.generateStudentId(k);
    assert.equal(id.length, 7, `ID ${id} should have length 7`);
    assert.ok(id.startsWith("01"), `ID ${id} should start with 01`);
    assert.ok(id.endsWith(String(k)), `ID ${id} should end with cohort ${k}`);
  }
});

test("HuceRules: generateRandomProfile produces consistent logical data and only unexpired courses", () => {
  const profile = HuceRules.generateRandomProfile({ cohortK: 68, gender: "male" });
  assert.ok(profile.fullName);
  assert.ok(profile.birthDate.includes("/"));
  assert.ok(profile.studentId.startsWith("01"));
  assert.ok(profile.studentId.endsWith("68"));
  assert.ok(profile.className.startsWith("68"));
  assert.equal(profile.course, "2023-2027");
  assert.ok(profile.email.endsWith("@huce.edu.vn"));
  assert.ok(profile.email.includes(profile.studentId));
  assert.equal(profile.gender, "male");

  // Ensure all cohorts in COHORTS and random profiles have unexpired graduation years (>= 2027)
  for (const cohort of HuceRules.COHORTS) {
    assert.ok(cohort.k >= 68, `Cohort K${cohort.k} must be active (>= K68)`);
    assert.ok(cohort.endYear >= 2027, `Course endYear ${cohort.endYear} must not be expired`);
  }
  for (let i = 0; i < 30; i++) {
    const rand = HuceRules.generateRandomProfile();
    const endYear = Number(rand.course.split("-")[1]);
    assert.ok(endYear >= 2027, `Random course ${rand.course} must have unexpired end year >= 2027`);
  }
});

test("HuceRules: getOriginalSampleProfile matches authentic card in image", () => {
  const orig = HuceRules.getOriginalSampleProfile();
  assert.equal(orig.fullName, "NGUYỄN VŨ MINH ĐỨC");
  assert.equal(orig.birthDate, "25/11/2005");
  assert.equal(orig.studentId, "0174268");
  assert.equal(orig.className, "68QD1");
  assert.equal(orig.faculty, "Kinh tế & Quản lý xây dựng");
  assert.equal(orig.email, "duc0174268@huce.edu.vn");
  assert.equal(orig.course, "2023-2027");
});

test("HuceRules: assets and PDF generation are valid and high quality", () => {
  // Official high-resolution HUCE logo
  assert.ok(HuceRules.ASSETS.original_logo.startsWith("data:image/png;base64,"));
  assert.ok(HuceRules.ASSETS.original_logo.length > 50000, "Logo should be high-resolution official asset");

  // PDF generator: borderless single wooden background without white page letterboxing
  const dummyJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const pdf = HuceRules.createPdfFromJpeg(dummyJpeg, 920, 1400);
  assert.ok(pdf.startsWith("data:application/pdf;base64,JVBERi"));
  const pdfText = Buffer.from(pdf.split(",")[1], "base64").toString();
  assert.ok(pdfText.includes("MediaBox [0 0 920.00 1400.00]"), "PDF page size must exactly match image size");
  assert.ok(pdfText.includes("920.00 0 0 1400.00 0.00 0.00 cm"), "Image must render edge-to-edge with zero white margins");
});
