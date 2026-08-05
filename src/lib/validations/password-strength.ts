export const PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=?.,:;";

export const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=?.:,;]/;

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "qwerty",
  "qwerty1",
  "qwerty12",
  "qwerty123",
  "12345678",
  "123456789",
  "1234567890",
  "abcdefgh",
  "abcdefg1",
  "11111111",
  "00000000",
  "aaaaaaaa",
  "zzzzzzzz",
  "iloveyou",
  "welcome1",
  "admin123",
  "letmein1",
]);

export type PasswordStrengthLevel = "very_weak" | "weak" | "medium" | "strong";

export type PasswordChecklist = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  special: boolean;
};

export type PasswordStrengthResult = {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  checklist: PasswordChecklist;
  isWeakPattern: boolean;
};

export function getPasswordChecklist(password: string): PasswordChecklist {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: PASSWORD_SPECIAL_CHAR_REGEX.test(password),
  };
}

export function isWeakPasswordPattern(password: string): boolean {
  if (!password) return false;

  const lower = password.toLowerCase();

  if (COMMON_WEAK_PASSWORDS.has(lower)) return true;
  if (/^(.)\1{7,}$/.test(password)) return true;
  if (isSequentialChars(lower)) return true;
  if (isKeyboardWalk(lower)) return true;

  return false;
}

function isSequentialChars(value: string): boolean {
  if (value.length < 8) return false;

  let ascending = 0;
  let descending = 0;

  for (let i = 1; i < value.length; i++) {
    const prev = value.charCodeAt(i - 1);
    const curr = value.charCodeAt(i);

    if (curr === prev + 1) {
      ascending += 1;
      descending = 0;
    } else if (curr === prev - 1) {
      descending += 1;
      ascending = 0;
    } else {
      ascending = 0;
      descending = 0;
    }

    if (ascending >= 7 || descending >= 7) return true;
  }

  return false;
}

function isKeyboardWalk(value: string): boolean {
  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

  for (const row of rows) {
    if (row.includes(value) || [...row].reverse().join("").includes(value)) {
      return true;
    }
  }

  return false;
}

export function analyzePasswordStrength(password: string): PasswordStrengthResult {
  const checklist = getPasswordChecklist(password);
  const isWeakPattern = isWeakPasswordPattern(password);

  const metCount = [
    checklist.minLength,
    checklist.uppercase,
    checklist.lowercase,
    checklist.digit,
    checklist.special,
  ].filter(Boolean).length;

  let score = metCount;
  if (isWeakPattern) {
    score = Math.min(score, 1);
  }

  let level: PasswordStrengthLevel;
  let label: string;

  if (!password || score <= 1) {
    level = "very_weak";
    label = "Çok Zayıf";
  } else if (score === 2) {
    level = "weak";
    label = "Zayıf";
  } else if (score <= 4) {
    level = "medium";
    label = "Orta";
  } else {
    level = "strong";
    label = "Güçlü";
  }

  return { score, level, label, checklist, isWeakPattern };
}

export function passwordsMatchIdentity(
  password: string,
  identity?: string | null,
): boolean {
  if (!identity) return false;

  const normalizedPassword = password.trim().toLowerCase();
  const normalizedIdentity = identity.trim().toLowerCase();

  if (!normalizedPassword || !normalizedIdentity) return false;

  if (normalizedPassword === normalizedIdentity) return true;

  const compactIdentity = normalizedIdentity.replace(/\s+/g, "");
  return compactIdentity.length >= 3 && normalizedPassword === compactIdentity;
}
