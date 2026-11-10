# GMC pre-review checker (working name)

Shopify app + free web checker. It reads a store's public storefront the way Google's crawler does, checks it against Google Merchant Center's published rules, and keeps a dated record of what the merchant changed before each review request — plus, with opt-in, whether Google reinstated them.

Independent tool, not affiliated with Google. It never predicts or guarantees reinstatement.

## Layout
| Path | What |
|---|---|
| `gmc-app/` | The Shopify app (React Router template). Public pages: `/scan`, `/privacy`, `/outcome/:token`, `/unsubscribe/:token`. Embedded admin: `/app/*` |
| `gmc-app/app/engine/` | Check engine: pure TypeScript, no Shopify imports. `crawl.server.ts` is the only file that touches the network |
| `research/` | Steps 1–7 research and plan, RET-02 walkthrough (Vietnamese) |
| `docs/` | Listing draft, forum post draft, reviewer instructions, public-pairs coding guide |
| `data/public-pairs.csv` | Hand-coded fix → outcome pairs from public posts (never mixed into ranking stats) |
| `SETUP.md` | Everything that needs Long's own accounts (Vietnamese) |

## Commands (in `gmc-app/`)
```bash
npm install
npm test            # engine unit tests
npm run typecheck
npm run dev         # needs a linked Shopify app: see SETUP.md
npm run outcome:send            # dry run of the day-14 outcome emails
npm run outcome:send -- --send  # really send (needs RESEND_API_KEY etc.)
```

Env vars: see `gmc-app/.env.example`.
