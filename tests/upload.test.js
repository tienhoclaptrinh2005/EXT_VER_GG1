"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/shared/core.js");
const HuceRules = require("../src/shared/huce-rules.js");

test("core: inferFieldKey recognizes file inputs and document upload labels", () => {
  assert.equal(core.inferFieldKey("Tải lên thẻ sinh viên", "", "file"), "studentCardImage");
  assert.equal(core.inferFieldKey("Student ID card photo", "", "file"), "studentCardImage");
  assert.equal(core.inferFieldKey("Upload proof document", "", "file"), "studentCardImage");
  assert.equal(core.inferFieldKey("Minh chứng sinh viên", "", "file"), "studentCardImage");
});

test("core: deriveProfile preserves cardImage, cardPdf and filenames", () => {
  const profile = core.deriveProfile({
    fullName: "NGUYỄN VŨ MINH ĐỨC",
    cardImage: "data:image/png;base64,iVBORw0KGgo...",
    cardFilename: "HUCE_0174268_the.png",
    cardPdf: "data:application/pdf;base64,JVBERi0xLjQK...",
    cardPdfFilename: "HUCE_0174268_the.pdf"
  });
  assert.equal(profile.fullName, "NGUYỄN VŨ MINH ĐỨC");
  assert.equal(profile.cardImage, "data:image/png;base64,iVBORw0KGgo...");
  assert.equal(profile.cardFilename, "HUCE_0174268_the.png");
  assert.equal(profile.cardPdf, "data:application/pdf;base64,JVBERi0xLjQK...");
  assert.equal(profile.cardPdfFilename, "HUCE_0174268_the.pdf");
});

test("huce-rules: getCardFilename produces clean sanitized filenames for png and pdf", () => {
  const profile = {
    studentId: "0174268",
    fullName: "NGUYỄN VŨ MINH ĐỨC"
  };
  assert.equal(HuceRules.getCardFilename(profile), "HUCE_0174268_NGUYEN_VU_MINH_DUC.png");
  assert.equal(HuceRules.getCardFilename(profile, "pdf"), "HUCE_0174268_NGUYEN_VU_MINH_DUC.pdf");
});
