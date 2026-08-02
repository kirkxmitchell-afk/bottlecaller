# Godot R2 Publishing

The Vite/Worker deployment does not contain the Godot Web binaries. The complete
Godot export is published separately from `public/godot-shift/` to the
`bottlecaller-godot` R2 bucket under the `godot-shift/` prefix.

## One-time setup

From `my-vite-app/`:

```bash
npm ci
npx wrangler login
```

The Cloudflare account must have access to the `bottlecaller-godot` R2 bucket.
No R2 token, access key, or upload password is stored in the repository.

## Publish a Godot Web export

1. In Godot 4.4.1, export Web to:

   `my-vite-app/public/godot-shift/index.html`

2. Restore BottleCaller's Web bridge, synchronize the exported binary sizes, and
   derive the browser cache key from the PCK SHA-256:

   ```bash
   npm run godot:web:restore
   ```

3. Inspect the files and multipart plan without contacting Cloudflare:

   ```bash
   npm run godot:r2:dry-run
   ```

4. Upload and verify the complete export:

   ```bash
   npm run godot:r2:publish
   ```

The publish command:

- deploys `bottlecaller-r2-uploader-temp` with an R2 binding;
- generates a one-run bearer token and sends it through an owner-only temporary file;
- uploads files larger than 20 MiB in uniform multipart chunks;
- retries failed parts and verifies every object by byte size and SHA-256 metadata;
- leaves the previous R2 object live until its replacement is complete;
- uploads `index.html` last; and
- deletes the temporary Worker whether the upload succeeds or fails.

The command does not deploy the BottleCaller Vite Worker and does not push Git.

## Interrupted cleanup

If the computer loses power or the process is forcibly terminated before cleanup,
remove the temporary Worker from `my-vite-app/`:

```bash
npx wrangler delete bottlecaller-r2-uploader-temp --force
```

Incomplete R2 multipart uploads expire automatically according to the bucket's
multipart lifecycle policy. A failed multipart transfer does not replace the live
object because R2 only exposes the new object after completion.

## Windows

Run the same commands in PowerShell from `my-vite-app`. The publisher uses Node and
Wrangler directly and does not depend on Bash, `curl`, `shasum`, or macOS utilities.

## Runtime location

Production Vite builds must continue to use:

```text
VITE_GODOT_SHIFT_BASE=https://pub-2c9ed8881e4b4261b588f743fcfdd5b7.r2.dev/godot-shift
```

The Vite build strips `godot-shift/` from `dist/`; R2 is the runtime source for the
Godot export, while Git LFS remains the repository copy of `.pck` and `.wasm`.
