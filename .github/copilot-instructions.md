# Copilot instructions

## TypeScript conventions

- Prefer `undefined` over `null` for own TypeScript state variables and prop types
- Keep `null` as-is when it comes from external sources (e.g. Supabase `Session | null`)
- Keep `|| null` in Supabase insert/update payloads (DB nullable columns require null, not undefined)
