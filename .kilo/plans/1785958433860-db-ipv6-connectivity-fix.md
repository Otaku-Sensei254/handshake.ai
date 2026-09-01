# Fix: IPv6 connectivity causing DB connection failure

## Root cause

New Supabase connection string is correct:
```
postgresql://postgres:Handshake%40ai2026@db.tmcsffludppvngdzmmlj.supabase.co:5432/postgres
```

But DNS resolves the hostname to **both IPv4 and IPv6**. Node.js tries IPv6 first (`2a05:d014:8ef:5901:4e5a:3aea:cbd9:4e95`), and the network (school WiFi) has no IPv6 route — `ENETUNREACH`. The TCP connection to port 5432 never happens.

This is not a port block. It is an IPv6 connectivity gap.

## Fix (choose one — recommended: approach 1)

### Approach 1 — Node.js DNS flag (simplest, no code changes)

Add `--dns-result-order=ipv4first` to Node.js. This makes `dns.lookup()` return IPv4 addresses first, so the `postgres` library will connect via IPv4.

**Files to change:**

1. `.env` (root) — add:
   ```
   NODE_OPTIONS=--dns-result-order=ipv4first
   ```

2. `web/.env.local` — add:
   ```
   NODE_OPTIONS=--dns-result-order=ipv4first
   ```

3. `package.json` (root) — update dev script:
   ```json
   "dev": "NODE_OPTIONS=--dns-result-order=ipv4first ts-node-dev --respawn --transpile-only src/index.ts"
   ```

4. `web/package.json` — update dev script:
   ```json
   "dev": "NODE_OPTIONS=--dns-result-order=ipv4next dev"
   ```
   Wait — Next.js dev server also needs the flag. Use:
   ```json
   "dev": "NODE_OPTIONS=--dns-result-order=ipv4next dev"
   ```
   Actually, Next.js uses `next dev` which is a Node.js script. `NODE_OPTIONS` will be inherited.

**Caveat:** `NODE_OPTIONS` is a Linux-style env var prefix. If you ever run on Windows, use `cross-env` package instead. For now, Linux is fine.

### Approach 2 — Code-level fix (more explicit)

Force IPv4 by passing a custom `socket` factory to the `postgres` library. This works regardless of Node.js flags or OS.

**Files to change:**

1. `src/db/supabase.ts` — import `net`, add `socket` option:
   ```ts
   import postgres from 'postgres';
   import net from 'net';
   
   // ...
   export function getDb(): ReturnType<typeof postgres> {
     if (!_sql) _sql = postgres(DATABASE_URL, {
       max: 10,
       socket: () => new net.Socket({ family: 4 })
     });
     return _sql;
   }
   ```

2. `web/lib/db.ts` — import `net`, add `socket` option:
   ```ts
   import postgres from 'postgres';
   import net from 'net';
   
   // ...
   const sql = postgres(process.env.DATABASE_URL!, {
     ssl: isProd ? 'require' : false,
     max: 10,
     socket: () => new net.Socket({ family: 4 })
   });
   ```

## Validation

1. Restart bot: `npm run dev`
2. Restart web: `cd web && npm run dev`
3. Verify bot logs show matching cycle completing without `CONNECT_TIMEOUT` or `ENETUNREACH`
4. Verify web `/api/users` returns data (not hanging)
5. Verify `/api/consent` and `/api/negotiate` respond

## Risk

- Approach 1: `NODE_OPTIONS` may conflict with other Node.js flags if added later. Low risk.
- Approach 2: `net.Socket({ family: 4 })` is standard Node.js API, well-supported. Low risk.
- Both approaches: If the Supabase project moves to a different IP range, the hostname still resolves correctly — this fix is future-proof.

## Recommendation

Use **Approach 2** (code-level fix). It is more explicit, doesn't depend on environment variables or shell syntax, and works across all deployment environments (local dev, Vercel, etc.). `NODE_OPTIONS` is a band-aid; the `socket` option is the correct fix.
