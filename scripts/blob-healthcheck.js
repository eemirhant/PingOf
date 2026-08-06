const fs = require("fs");
const { put, del } = require("@vercel/blob");

function loadEnv(filePath) {
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const raw = fs.readFileSync(".env", "utf8");
  const env = loadEnv(".env");
  const token = (env.BLOB_READ_WRITE_TOKEN || "").trim();
  const storeId = (env.BLOB_STORE_ID || "").trim() || null;

  const diskHasBlobLine = /BLOB_READ_WRITE_TOKEN\s*=/.test(raw);
  const keys = Object.keys(env);

  if (!token) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "TOKEN_MISSING",
        diskHasBlobLine,
        keys,
        hint: diskHasBlobLine
          ? "Token line found but empty/unparsed"
          : "Save .env to disk — editor buffer may be unsaved",
      }),
    );
    process.exit(1);
  }

  const formatOk = token.startsWith("vercel_blob_rw_");
  const tokenStore = token.match(/^vercel_blob_rw_([^_]+)_/)?.[1] || null;
  const storeIdMatchesToken =
    !storeId ||
    !tokenStore ||
    storeId === `store_${tokenStore}` ||
    storeId.replace(/^store_/, "") === tokenStore;

  try {
    const blob = await put(
      "avatars/pingof-blob-healthcheck.txt",
      Buffer.from("pingof-blob-ok"),
      {
        access: "public",
        contentType: "text/plain",
        addRandomSuffix: true,
        token,
      },
    );
    await del(blob.url, { token });
    console.log(
      JSON.stringify({
        ok: true,
        formatOk,
        storeIdPresent: Boolean(storeId),
        storeIdMatchesToken,
        urlHost: new URL(blob.url).host,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        ok: false,
        formatOk,
        storeIdPresent: Boolean(storeId),
        storeIdMatchesToken,
        error: error?.message || String(error),
        status: error?.status || null,
      }),
    );
    process.exit(1);
  }
}

main();
