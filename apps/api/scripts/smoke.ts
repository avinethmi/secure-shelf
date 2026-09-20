// Phase 0 smoke test: proves every risky native/runtime dependency works on this machine
// before any feature depends on it. Run with: npm run smoke
import argon2 from 'argon2';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { fileTypeFromBuffer } from 'file-type';
import { Client } from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Check = { name: string; run: () => Promise<string> };

const checks: Check[] = [
  {
    name: 'argon2id (NFR-01: m=19456 KiB, t=2, p=1)',
    run: async () => {
      const hash = await argon2.hash('correct horse battery staple', {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const ok = await argon2.verify(hash, 'correct horse battery staple');
      const bad = await argon2.verify(hash, 'wrong');
      if (!ok || bad) throw new Error('verify mismatch');
      return hash.slice(0, 40) + '...';
    },
  },
  {
    name: 'otplib TOTP (FR-03)',
    run: async () => {
      const secret = generateSecret();
      const code = await generate({ secret });
      const result = await verify({ secret, token: code });
      if (!result.valid) throw new Error('TOTP verify failed');
      const wrong = await verify({ secret, token: '000000' });
      if (wrong.valid) throw new Error('TOTP accepted a wrong code');
      return `secret ${secret.slice(0, 6)}..., code ${code}`;
    },
  },
  {
    name: 'qrcode data URL',
    run: async () => {
      const uri = generateURI({ issuer: 'SecureShelf', label: 'owner@marvels.example', secret: generateSecret() });
      const url = await QRCode.toDataURL(uri);
      if (!url.startsWith('data:image/png;base64,')) throw new Error('unexpected output');
      return `${url.length} chars`;
    },
  },
  {
    name: 'AES-256-GCM (NFR-05)',
    run: async () => {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const ct = Buffer.concat([cipher.update('199912345678', 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
      if (pt !== '199912345678') throw new Error('roundtrip failed');
      return 'roundtrip ok';
    },
  },
  {
    name: 'pdfkit writes a PDF (FR-14)',
    run: async () => {
      const out = path.join(os.tmpdir(), `secureshelf-smoke-${Date.now()}.pdf`);
      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(out);
        doc.pipe(stream);
        doc.fontSize(18).text('SecureShelf compliance gap report (smoke)');
        doc.moveDown().fontSize(11).text('If you can read this, pdfkit works on this machine.');
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      const size = fs.statSync(out).size;
      fs.unlinkSync(out);
      if (size < 500) throw new Error('PDF too small');
      return `${size} bytes`;
    },
  },
  {
    name: 'file-type magic bytes (evidence upload allowlist)',
    run: async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
      const exe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00', 'binary');
      const a = await fileTypeFromBuffer(png);
      const b = await fileTypeFromBuffer(exe);
      if (a?.mime !== 'image/png') throw new Error(`png detected as ${a?.mime}`);
      if (b?.mime === 'image/png' || b?.mime === 'application/pdf') throw new Error('exe accepted');
      return `png -> ${a.mime}, exe -> ${b?.mime ?? 'unknown'} (rejected)`;
    },
  },
  {
    name: 'PostgreSQL reachable as migrator and app roles',
    run: async () => {
      const results: string[] = [];
      for (const [label, url] of [
        ['migrator', process.env.MIGRATOR_DATABASE_URL],
        ['app', process.env.DATABASE_URL],
      ] as const) {
        if (!url) throw new Error(`${label} URL missing from .env`);
        const c = new Client({ connectionString: url });
        await c.connect();
        const r = await c.query('select current_user, version()');
        results.push(`${label}=${r.rows[0].current_user}`);
        await c.end();
      }
      return results.join(', ');
    },
  },
];

let failed = 0;
for (const c of checks) {
  try {
    const detail = await c.run();
    console.log(`OK    ${c.name}: ${detail}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${c.name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exit(failed ? 1 : 0);
