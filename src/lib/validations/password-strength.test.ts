import { describe, expect, it } from "vitest";

import {
  analyzePasswordStrength,
  isWeakPasswordPattern,
  passwordsMatchIdentity,
} from "@/lib/validations/password-strength";

describe("password strength helpers", () => {
  it("marks common weak passwords", () => {
    expect(isWeakPasswordPattern("password1")).toBe(true);
    expect(isWeakPasswordPattern("qwerty123")).toBe(true);
    expect(isWeakPasswordPattern("12345678")).toBe(true);
    expect(isWeakPasswordPattern("aaaaaaaa")).toBe(true);
    expect(isWeakPasswordPattern("GucluSifre1!")).toBe(false);
  });

  it("scores strength levels as the user types", () => {
    expect(analyzePasswordStrength("a").level).toBe("very_weak");
    expect(analyzePasswordStrength("ornekabc").level).toBe("weak");
    expect(analyzePasswordStrength("Ornekabc").level).toBe("medium");
    expect(analyzePasswordStrength("GucluSifre1!").level).toBe("strong");
  });

  it("detects password matching email or full name", () => {
    expect(passwordsMatchIdentity("Ahmet@Sirket.com", "ahmet@sirket.com")).toBe(true);
    expect(passwordsMatchIdentity("AhmetYilmaz", "Ahmet Yilmaz")).toBe(true);
    expect(passwordsMatchIdentity("GucluSifre1!", "ahmet@sirket.com")).toBe(false);
  });
});
