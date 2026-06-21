# Runtime Assets

Runtime art is organized by gameplay role:

```text
sprites/
  buildings/
  characters/
  enemies/
  environment/
  resources/
effects/
ui/
  icons/
```

`manifest.json` is the canonical list of required and available assets. Runtime
code should refer to stable manifest IDs or stable relative paths, not infer
filenames by scanning directories.

See `docs/art-style.md` for geometry, export, naming, originality, and replacement
rules.

