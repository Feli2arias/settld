# Settld

**Split expenses. Settle instantly.** — Aleph Hackathon 2026, WDK track.

Shared-expense apps tell you who owes you. Settld gets you paid: it works out the group's
debts and clears them with a real USD₮ transfer from a self-custodial wallet built with
[Tether's Wallet Development Kit](https://docs.wdk.tether.io).

> Settld decides **who pays whom**. WDK makes the payment **actually happen**.

---

## Running it

```bash
npm install --prefix split && npm run dev --prefix split
```

Open <http://localhost:3000>. To demo with two people, `next dev` also serves the app on
your local network IP (it prints it on startup): open it from two phones on the same wifi.

You need a `.env.local` with the treasury account's seed, which is what funds new users
when they tap "Add money" → "Test funds":

```
TREASURY_SEED_PHRASE="the twelve words of the treasury wallet"
```

Optional but **strongly recommended for a live demo** (see *Known risks*):

```
NEXT_PUBLIC_BUNDLER_URL="https://api.pimlico.io/v2/11155111/rpc?apikey=YOUR_API_KEY"
```

### Where the data lives

The environment picks this on its own, in `src/lib/store/backend.ts`:

- **Local**: a JSON file at `.data/split.json`. Zero setup.
- **Vercel**: Redis (Upstash), because the serverless filesystem is read-only. It kicks in
  as soon as `KV_REST_API_URL` and `KV_REST_API_TOKEN` exist, which Vercel's integration
  injects on its own. Speaks the REST API with bare `fetch`, no new dependencies.

Careful: if you run locally with those variables present, you're writing to the same
database as production. To work against the local file instead, without touching them:

```bash
npm run dev:local --prefix split
```

Other commands:

```bash
npm run test --prefix split        # tests for the debt logic and the money handling
npm run typecheck --prefix split   # tsc
npm run build --prefix split       # production build
```

---

## Demo script

There's one story: Daniel pays for dinner, Felipe ends up owing, Felipe settles, and the
money actually moves.

1. **Daniel** creates his account. Underneath, WDK generates a seed on the device and
   derives his wallet. Daniel never sees a seed phrase or knows he has one.
2. Daniel taps **Add money** → **Test funds** and $50 shows up.
3. He creates the **Aleph Hackathon** group and adds **@felipe**.
4. He enters the expense **Dinner, $20**, split between the two. Settld works out **$10 each**.
5. **Felipe** opens the group and sees **"You owe $10.00"**.
6. He taps **Settle up** → the preview shows him who he's paying, how much, what the
   network costs and what he'll have left. Nothing has gone out yet.
7. **Confirm and pay** → WDK transfers 10 USD₮ from Felipe's wallet to Daniel's.
8. The **receipt with the hash** appears, linked to Sepolia Etherscan.
9. The group updates: Felipe **✓ settled**, and Daniel's balance goes up.

The moment that matters to judges is step 8. It's a real transaction, verifiable on a
public explorer, fired from an app that never said the word "blockchain".

---

## How it's put together

```
user
   ↓
Settld UI  ────────────────┐
   │                       │
   ▼                       ▼
Settld logic              WDK
users, groups             self-custodial wallet
expenses, splitting       address and balance
who owes whom             payment preview
net settlement            USD₮ transfer
payment status            receipt
   │                       │
   └──────────┬────────────┘
              ▼
         blockchain
```

| Folder | What's in it |
|---|---|
| `src/lib/split/` | The brain: net balances, minimum settlement and everything the dashboard adds up. Pure functions, with tests. |
| `src/lib/wdk/` | Everything that touches the blockchain: wallet, amounts, receipts, network config. |
| `src/lib/store/` | Persistence and input validation. `backend.ts` picks where to store. |
| `src/lib/client/` | Session, local seed and the API client. |
| `src/app/` | Screens and API routes. |

### The UI changes with the device

It isn't one screen stretched: they're two different layouts sharing the same components.

| | mobile (<768) | tablet (768–1023) | desktop (≥1024) |
|---|---|---|---|
| Navigation | sticky top bar with a back button | same | fixed sidebar: where to go, the groups, and you |
| Width | a single 28rem column, built for the thumb | 42rem–48rem | up to 72rem, left-aligned next to the sidebar |
| Landing | headline and buttons stacked | same | headline left, a look at the product right |
| Dashboard | one stack of cards; the group status rides with the member count | three figures across, then the stack | same as tablet until 1280, where it opens into two columns: groups and activity left, the group that needs you and the month right |
| Group | everything in one column | same | two columns: summary and debts left, expenses right |
| Forms | full screen, button at the bottom | same | vertically centred card |

The trick that avoids duplicating the group markup is `display: contents`: on mobile the
column containers disappear and everything falls into a single column; from `lg` up they
become flex and build the two columns.

### The dashboard

Every other screen looks at one thing: a group, an expense, a payment. The dashboard is the
only one that answers the question you actually open the app with — what's still open, and
what do I do about it. It leads with three figures (owed to you, owed by you, what you can
spend), then puts the group that needs you next to everything else.

Nothing on it is decorative. The three figures, the group rows, the activity feed, the
member table and the month's totals are all derived from the same groups the app already
loaded, by `src/lib/split/dashboard.ts` — pure functions over integers, which is where the
arithmetic is tested. The only number that doesn't come from there is the balance, which
comes from the blockchain.

Two things the design deliberately does not have: a reminder button, because Settld can't
send anyone a message, and group photos, because we don't store any — a group gets a tinted
square with its initials instead.

### How you add money

"Add money" opens a menu with three routes, all written for someone who doesn't know —
and doesn't care — that there's a blockchain underneath:

| | What it does | Status |
|---|---|---|
| **With a card** | Opens MoonPay's checkout via WDK. Pay by debit or credit and the funds land straight in the wallet. | Needs a key (below) |
| **Get paid** | Shows a QR and the address so someone else can send you money. | Working |
| **Test funds** | $50 from the treasury. | Working |

The address only appears as a fallback for whoever scans the QR, never as the main path.
No screen says "wallet", "token" or "blockchain".

#### Turning on card payments

The button only shows up once a key is configured — we'd rather hide it than offer
something that leads nowhere. Get a publishable key at
[dashboard.moonpay.com](https://dashboard.moonpay.com/signup) and add to `.env.local`:

```
NEXT_PUBLIC_MOONPAY_API_KEY="pk_test_..."
NEXT_PUBLIC_MOONPAY_ENVIRONMENT="sandbox"
```

In `sandbox` MoonPay simulates the whole purchase without charging a cent, so it can be
demoed end to end.

⚠️ **Careful what you promise in the demo:** we run on Sepolia with a *mock* USD₮, which is
a test contract and not an asset MoonPay can sell. The checkout opens and completes, but
the funds will not show up in the balance. For a purchase to actually land you'd have to
move to a real network with real USD₮. It's honest to show it as "this is how you buy",
not as "watch the money come in".

### Accounts and recovery

The account **is** the wallet. That poses a problem: if the credential were the 12-word
phrase, signing in would feel like anything but a normal app. And if the server stored the
key so it could offer a username and password, Settld would be custodial and could spend
its users' money.

The way out is encrypting the wallet with the password, on the device:

1. When the account is created, the browser generates the wallet and encrypts it with the
   password (PBKDF2 at 300,000 rounds + AES-GCM, all WebCrypto, no dependencies).
2. The server only ever receives **the encrypted bundle**. The password never leaves the
   device, and without it the bundle doesn't open, not even for us.
3. On sign-in, the browser downloads the bundle, opens it with the password and recovers
   the wallet.

The result: you sign in with a username and password like any app, and the keys stay the
user's.

**The recovery phrase is the fallback**, for when the password is forgotten. It's one tap
away, by tapping your name on the home screen, alongside your address and the sign-out
button. We don't show it to anyone at signup: that would ruin the moment of walking in.

Details that matter:

- The vault never travels alongside the rest of the user. `/api/users/lookup` and the group
  detail strip it from the response; it's served only through `/api/users/vault`, at sign-in.
- AES-GCM verifies integrity, so a wrong password or a tampered bundle fail instead of
  returning garbage.
- **Known limit**: anyone can request a user's vault and try passwords against it offline.
  The 300,000 rounds make that expensive, but against a weak password it isn't enough. A
  real app also needs rate limiting and stronger password requirements.

Useful side effect for the demo: this lets you show the two-person flow on a single device,
signing out and signing back in as the other account.

### Decisions that matter

**The wallet runs in the browser.** The seed is generated on the device and never leaves it.
The server only knows the public address, which is all that's needed for others to pay you.

**Gas is paid in USD₮.** We use ERC-4337 with a paymaster, so no user needs to hold ETH.
They create an account, receive USD₮ and can pay. Without this, every person in the demo
would have to go through a captcha-gated ETH faucet before doing anything.

**Confirmation comes from the blockchain, not the bundler.** See *Known risks*.

**Amounts are integers.** Everything is stored in cents and split so the sum always closes:
if $10 is divided between 3, somebody pays $3.34 and not a single cent is lost or invented.

---

## Status

Works end to end, verified on-chain:

- [x] Onboarding that creates the wallet with WDK
- [x] Adding money: card (MoonPay via WDK), QR to get paid, or test funds
- [x] Signing in with username and password (the wallet is encrypted with it, on the device)
- [x] Recovery phrase as the fallback, and signing out
- [x] Real address and balance
- [x] Groups and members by `@username`
- [x] Expenses split evenly
- [x] Working out who owes whom + minimum settlement
- [x] Payment preview with network cost and resulting balance
- [x] Explicit user confirmation
- [x] Real USD₮ transfer via WDK
- [x] Receipt with a tx hash linked to the explorer
- [x] Debt marked as settled

Deliberately out of scope: smart contracts, multisig, bridges, DeFi, pre-signatures, and
anything that would custody the user's keys.

---

## Known risks

**The public bundler is rate limited.** This happened during development: the transfer goes
through fine, but querying its status returns *"Public API key rate limit exceeded"*. That's
why confirmation doesn't ask the bundler: it reads the `UserOperationEvent` the EntryPoint
contract emits, straight from the RPC (`src/lib/wdk/receipt.ts`). That gives us both the
real transaction hash and whether the operation succeeded. Even so, for a live demo it's
worth getting a free API key at [dashboard.pimlico.io](https://dashboard.pimlico.io) and
putting it in `NEXT_PUBLIC_BUNDLER_URL`: the payment preview does query the bundler to
quote the fee.

**Once sent, a payment is never reported as failed.** If `transfer()` returned, the money is
on its way. From that point on, the worst that can happen is that we don't know yet whether
it arrived, and that shows as pending, never as an error. The settlement is recorded before
waiting for confirmation, so there's a trace even if the user closes the app.

**The seed is stored in localStorage unencrypted.** Acceptable here because we run on
Sepolia with test USD₮, which is worth nothing. For real money you'd ask the user for a
passphrase and encrypt with WebCrypto before touching disk.

**The storage has no transactions.** Every mutation is read → modify → write the whole
state. With two or three people acting one at a time that's plenty, but two exactly
simultaneous writes from different instances could clobber each other. If this project
outlives the hackathon, that's the first thing to swap for a database with real transactions.

---

## The network

| | |
|---|---|
| Network | Ethereum Sepolia (testnet) |
| USD₮ | `0xd077a400968890eacc75cdc901f0356c943e4fdb` — 6 decimals, no real value |
| RPC | `ethereum-sepolia-rpc.publicnode.com` |
| USD₮ faucet | [dashboard.pimlico.io/test-erc20-faucet](https://dashboard.pimlico.io/test-erc20-faucet) |

The USD₮ on this testnet are not Tether Tokens, cannot be redeemed and are worth nothing.

> The RPC listed in WDK's official docs (`sepolia.drpc.org`) stopped serving Sepolia on the
> free plan. If something won't connect, start there.
