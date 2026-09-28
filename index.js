import { createReadStream, existsSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

/** Required host service: without it there is nowhere to serve fonts from. */
export const inject = ["webServer"];

/** This package's own directory, so the bundled font is found after install. */
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));
const BUNDLED = join(PACKAGE_ROOT, "fonts");

/**
 * Font resolution order. The bundled copy comes first so every installation
 * renders identically; the author's local font directories remain as a fallback
 * for development, where a family may exist that this package does not ship.
 */
const LOCAL_DIRS = [
    join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts"),
    "D:\\fontwork",
];

/** Only a bare file name is accepted, which is what keeps the path from escaping. */
const safeName = (raw) => {
    let decoded;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        return null;
    }
    if (decoded === "" || decoded === "." || decoded === "..") return null;
    const base = normalize(decoded).replace(/^([/\\])+/, "");
    if (base === "" || base === "." || base === "..") return null;
    if (base.includes("..") || base.includes(sep) || base.includes("/")) return null;
    return base;
};

export function apply(ctx) {
    ctx.effect(() =>
        ctx.webServer.register({
            kind: "prefix",
            /* No trailing slash: the server matches a prefix as `pathname ===
               prefix || pathname.startsWith(prefix + "/")`, so a stored trailing
               slash demands a double slash in the request and never matches. */
            path: "/api/dsh-skin-win2000/fonts",
            handler: (req, res) => {
                const url = new URL(req.url, "http://localhost");
                const raw = url.pathname.replace(/^\/api\/dsh-skin-win2000\/fonts\/?/, "");
                const name = safeName(raw);
                if (name === null) {
                    res.writeHead(400, { "content-type": "text/plain" });
                    res.end("Bad font name");
                    return;
                }
                const candidates = [join(BUNDLED, name), ...LOCAL_DIRS.map((dir) => join(dir, name))];
                const found = candidates.find((candidate) => existsSync(candidate));
                if (found === undefined) {
                    res.writeHead(404, { "content-type": "text/plain" });
                    res.end("Font not found");
                    return;
                }
                res.writeHead(200, {
                    "content-type": name.endsWith(".otf") ? "font/otf" : "font/ttf",
                    "cache-control": "public, max-age=604800, immutable",
                    "access-control-allow-origin": "*",
                });
                createReadStream(found).pipe(res);
            },
        }),
    );
}
