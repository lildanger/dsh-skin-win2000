// Drive the host half directly: register the route, then feed it requests and
// assert what it serves. This is the font path an installed copy will take, and
// it runs without a restart.
import { Writable } from "node:stream";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { apply, inject } = await import("./index.js");

assert.deepEqual(inject, ["webServer"], "the host half must declare the webServer service");

let route = null;
apply({
    effect: (callback) => callback(),
    webServer: {
        register: (definition) => {
            route = definition;
            return () => {};
        },
    },
});
assert.ok(route, "apply must register a route");
assert.equal(route.path, "/api/dsh-skin-win2000/fonts/", "the route prefix must match what the client requests");

/** Collect a response into { status, headers, bytes }. */
const fetchRoute = (url) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        const sink = new Writable({
            write(chunk, _encoding, done) {
                chunks.push(chunk);
                done();
            },
        });
        sink.on("finish", () =>
            resolve({ status: header.status, headers: header.headers, body: Buffer.concat(chunks) }));
        sink.on("error", reject);
        const header = { status: 0, headers: {} };
        const res = Object.assign(sink, {
            writeHead(status, headers) {
                header.status = status;
                header.headers = headers;
                return this;
            },
        });
        route.handler({ url }, res);
    });

// The bundled face is what an installed copy serves.
const font = await fetchRoute("/api/dsh-skin-win2000/fonts/unsciiCJKV18.otf");
assert.equal(font.status, 200, "the bundled font must be served");
assert.equal(font.headers["content-type"], "font/otf", "an .otf must be typed as font/otf");
assert.ok(font.body.length > 6_000_000, `the served font must be the real file, got ${font.body.length} bytes`);
assert.equal(font.body.subarray(0, 4).toString("latin1"), "OTTO", "the payload must be an OTF, not an error page");
console.log(`  ok  bundled font: ${font.body.length} bytes, ${font.headers["content-type"]}`);

// A font this package does not ship resolves from nowhere: 404, not a crash.
const missing = await fetchRoute("/api/dsh-skin-win2000/fonts/nothing-here.otf");
assert.equal(missing.status, 404, "an unknown name must 404");
console.log("  ok  unknown name: 404");

// Traversal attempts stay inside the font directories.
for (const url of [
    "/api/dsh-skin-win2000/fonts/..%2f..%2fpackage.json",
    "/api/dsh-skin-win2000/fonts/..%5c..%5cpackage.json",
    "/api/dsh-skin-win2000/fonts/",
    "/api/dsh-skin-win2000/fonts/.",
]) {
    const res = await fetchRoute(url);
    assert.ok(res.status === 400 || res.status === 404, `${url} must be refused, got ${res.status}`);
    assert.ok(!res.body.includes("dsh-skin-win2000"), `${url} must not leak a file`);
}
console.log("  ok  traversal attempts refused");

console.log("ok — host font route serves the bundled face and refuses the rest");
