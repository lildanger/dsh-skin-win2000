import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const inject = ["webServer"];

const FONT_MAP = {
    "zpix.ttf": [
        join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", "zpix.ttf"),
        "D:\\fontwork\\zpix.ttf"
    ],
    "unscii-16-full-orig.ttf": [
        "D:\\fontwork\\unscii-16-full-orig.ttf",
        join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", "unscii-16-full-orig.ttf")
    ],
    "unsciiCJKV.otf": [
        join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", "unsciiCJKV.otf"),
        "D:\\fontwork\\unsciiCJKV.otf"
    ],
    "unsciiCJKV18.otf": [
        join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", "unsciiCJKV18.otf"),
        "D:\\fontwork\\unsciiCJKV18.otf"
    ]
};

export function apply(ctx) {
    ctx.effect(() => {
        return ctx.webServer.register({
            kind: "prefix",
            path: "/api/dsh-skin-win2000/fonts/",
            handler: (req, res) => {
                const url = new URL(req.url, "http://localhost");
                const name = url.pathname.replace(/^\/api\/dsh-skin-win2000\/fonts\//, "");
                const candidates = FONT_MAP[name] || [
                    join(homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", name),
                    join("D:\\fontwork", name)
                ];
                let found = null;
                for (const c of candidates) {
                    if (existsSync(c)) { found = c; break; }
                }
                if (!found) {
                    res.writeHead(404, { "content-type": "text/plain" });
                    res.end("Font not found");
                    return;
                }
                const ext = name.endsWith(".otf") ? "font/otf" : "font/ttf";
                res.writeHead(200, {
                    "content-type": ext,
                    "cache-control": "public, max-age=86400",
                    "access-control-allow-origin": "*"
                });
                createReadStream(found).pipe(res);
            }
        });
    });
}

