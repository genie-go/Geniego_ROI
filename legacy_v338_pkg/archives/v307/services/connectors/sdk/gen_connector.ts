import fs from "fs";
import path from "path";

function arg(name: string, def?: string) {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  if (idx >= 0 && process.argv[idx+1]) return process.argv[idx+1];
  return def;
}

const provider = arg("provider");
if (!provider) {
  console.error("Usage: npm run sdk:gen -- --provider=my_provider");
  process.exit(1);
}

const providersDir = path.join(__dirname, "..", "src", "providers");
const file = path.join(providersDir, `${provider}.ts`);
if (fs.existsSync(file)) {
  console.error("Provider already exists:", file);
  process.exit(1);
}

const tmpl = `import { Provider, ProviderActionResult } from "../contracts";

export const ${provider}: Provider = {
  name: "${provider}",
  async healthcheck() {
    return { ok: true };
  },
  async fetchEvents(_ctx, _cursor) {
    // TODO: implement incremental event pull
    return { items: [], next_cursor: _cursor || null };
  },
  async sendAction(_ctx, action): Promise<ProviderActionResult> {
    // TODO: implement sending (email/sms/ad/etc.)
    return { ok: true, provider_message_id: "demo-" + Date.now(), raw: { action } };
  },
};
`;
fs.writeFileSync(file, tmpl, "utf-8");

// Update providers index.ts
const idxFile = path.join(providersDir, "index.ts");
let idx = fs.readFileSync(idxFile, "utf-8");
if (!idx.includes(`./${provider}`)) {
  idx = idx.replace("/* AUTO-INSERT-PROVIDERS */", `export * from "./${provider}";
/* AUTO-INSERT-PROVIDERS */`);
  fs.writeFileSync(idxFile, idx, "utf-8");
}
console.log("Created provider:", file);
