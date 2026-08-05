import { describe, expect, it } from "vitest";

import {
  emailSchema,
  joinSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { addPlayerSchema } from "@/lib/validations/players";
import {
  analyzePasswordStrength,
  isWeakPasswordPattern,
} from "@/lib/validations/password-strength";

describe("emailSchema", () => {
  it("accepts a valid email and lowercases it", () => {
    const result = emailSchema.safeParse("  Ahmet@Sirket.COM  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("ahmet@sirket.com");
    }
  });

  it.each([
    "",
    "   ",
    "abc",
    "abc@",
    "abc@gmail",
    "abc@gmail.",
    "abc@@gmail.com",
    "@gmail.com",
    "abc..123@gmail.com",
    "abc gmail.com",
    "şahmet@gmail.com",
    "ahmet@gmâil.com",
  ])("rejects invalid email: %s", (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("GucluSifre1!").success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = passwordSchema.safeParse("Ab1!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Şifre en az 8 karakter olmalıdır");
  });

  it("rejects missing uppercase", () => {
    const result = passwordSchema.safeParse("guclusifre1!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("En az bir büyük harf kullanılmalıdır");
  });

  it("rejects missing lowercase", () => {
    const result = passwordSchema.safeParse("GUCLUSIFRE1!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("En az bir küçük harf kullanılmalıdır");
  });

  it("rejects missing digit", () => {
    const result = passwordSchema.safeParse("GucluSifre!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("En az bir rakam kullanılmalıdır");
  });

  it("rejects missing special character", () => {
    const result = passwordSchema.safeParse("GucluSifre1");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "En az bir özel karakter kullanılmalıdır",
    );
  });

  it("rejects spaces", () => {
    const result = passwordSchema.safeParse("Guclu Sifre1!");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Şifrede boşluk karakteri kullanılamaz");
  });

  it.each(["aaaaaaaa", "11111111", "password1", "qwerty123", "12345678"])(
    "rejects weak pattern: %s",
    (value) => {
      expect(isWeakPasswordPattern(value)).toBe(true);
      // May fail earlier rules; still ensure schema rejects
      expect(passwordSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("analyzePasswordStrength", () => {
  it("reports checklist and levels", () => {
    const empty = analyzePasswordStrength("");
    expect(empty.level).toBe("very_weak");
    expect(empty.checklist.minLength).toBe(false);

    const strong = analyzePasswordStrength("GucluSifre1!");
    expect(strong.level).toBe("strong");
    expect(strong.checklist).toEqual({
      minLength: true,
      uppercase: true,
      lowercase: true,
      digit: true,
      special: true,
    });
  });
});

describe("auth flows schemas", () => {
  it("login accepts credentials with valid email format", () => {
    expect(
      loginSchema.safeParse({
        email: "ahmet@sirket.com",
        password: "anything",
      }).success,
    ).toBe(true);
  });

  it("register rejects password equal to email", () => {
    const result = registerSchema.safeParse({
      fullName: "Ahmet Yılmaz",
      email: "strong1!@mail.co",
      organizationName: "Teknoloji A.Ş.",
      password: "Strong1!@mail.co",
      confirmPassword: "Strong1!@mail.co",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("e-posta"))).toBe(
      true,
    );
  });

  it("register accepts a strong matching password pair", () => {
    const result = registerSchema.safeParse({
      fullName: "Ahmet Yılmaz",
      email: "ahmet@sirket.com",
      organizationName: "Teknoloji A.Ş.",
      password: "GucluSifre1!",
      confirmPassword: "GucluSifre1!",
    });
    expect(result.success).toBe(true);
  });

  it("join and add-player use the same password rules", () => {
    expect(
      joinSchema.safeParse({
        inviteCode: "ABC123",
        fullName: "Ahmet Yılmaz",
        email: "ahmet@sirket.com",
        password: "weak",
      }).success,
    ).toBe(false);

    expect(
      addPlayerSchema.safeParse({
        fullName: "Mehmet Kaya",
        email: "mehmet@sirket.com",
        temporaryPassword: "GucluSifre1!",
      }).success,
    ).toBe(true);
  });

  it("reset password requires matching confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      token: "token",
      password: "GucluSifre1!",
      confirmPassword: "FarkliSifre1!",
    });
    expect(result.success).toBe(false);
  });
});
