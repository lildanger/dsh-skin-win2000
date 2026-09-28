// Read the OTF name table so the licence can be checked before redistributing.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const buf = readFileSync(file);
const numTables = buf.readUInt16BE(4);

let nameOffset = null;
for (let i = 0; i < numTables; i++) {
    const at = 12 + i * 16;
    const tag = buf.toString("ascii", at, at + 4);
    if (tag === "name") nameOffset = buf.readUInt32BE(at + 8);
}
if (nameOffset === null) throw new Error("no name table");

const count = buf.readUInt16BE(nameOffset + 2);
const stringOffset = nameOffset + buf.readUInt16BE(nameOffset + 4);
const WANTED = new Map([
    [0, "Copyright"],
    [1, "Family"],
    [5, "Version"],
    [9, "Designer"],
    [11, "Vendor URL"],
    [12, "Designer URL"],
    [13, "License"],
    [14, "License URL"],
]);

const seen = new Set();
for (let i = 0; i < count; i++) {
    const rec = nameOffset + 6 + i * 12;
    const platform = buf.readUInt16BE(rec);
    const nameId = buf.readUInt16BE(rec + 6);
    const length = buf.readUInt16BE(rec + 8);
    const offset = buf.readUInt32BE(rec + 10);
    const label = WANTED.get(nameId);
    if (!label) continue;
    const key = label + ":" + platform;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = buf.subarray(stringOffset + offset, stringOffset + offset + length);
    const text = platform === 3 ? raw.swap16().toString("utf16le") : raw.toString("latin1");
    const clean = text.replace(/\0/g, "").trim();
    if (clean) console.log(`${label}: ${clean}`);
}
