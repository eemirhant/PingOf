import { randomBytes } from "crypto";

const INVITE_CODE_LENGTH = 8;
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateInviteCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let code = "";

  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[bytes[i]! % INVITE_ALPHABET.length];
  }

  return code;
}
