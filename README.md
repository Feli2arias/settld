# Settld

**Split expenses. Settle instantly.** — Aleph Hackathon 2026, WDK track.

Shared-expense apps tell you who owes you. Settld gets you paid: it works out what people
owe each other and clears it with a real USD₮ transfer from a self-custodial wallet built
with [Tether's Wallet Development Kit](https://docs.wdk.tether.io).

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

There's one story: Felipe pays for dinner, Daniel ends up owing, Daniel settles, and the
money actually moves.

1. **Felipe** creates his account. Underneath, WDK generates a seed on the device and
   derives his wallet. Felipe never sees a seed phrase or knows he has one.
2. He taps **Add money** → **Test funds** and $50 shows up.
3. He taps **New settld**: *Dinner at Sikwa*, **$20**, split with **@daniel**. Settld works
   out **$10 each** and shows it while he types.
4. **Daniel** opens the app and sees **"You owe Felipe $10.00"**.
5. He taps through to Felipe → **Settle up** → the preview shows who he's paying, how much,
   what the network costs and what he'll have left. Nothing has gone out yet.
6. **Confirm and pay** → WDK transfers 10 USD₮ from Daniel's wallet to Felipe's.
7. The **receipt with the hash** appears, linked to Sepolia Etherscan.
8. Both dashboards update: Daniel is clear, Felipe's balance goes up.

The moment that matters to judges is step 7. It's a real transaction, verifiable on a
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
users, settlds            self-custodial wallet
splitting the amount      address and balance
netting per person        payment preview
who owes whom             USD₮ transfer
payment status            receipt
   │                       │
   └──────────┬────────────┘
              ▼
         blockchain
```

| Folder | What's in it |
|---|---|
| `src/lib/split/` | The brain: who owes whom, and everything the screens add up. Pure functions, with tests. |
| `src/lib/wdk/` | Everything that touches the blockchain: wallet, amounts, receipts, network config. |
| `src/lib/store/` | Persistence, input validation and the migration off groups. `backend.ts` picks where to store. |
| `src/lib/client/` | Session, local seed and the API client. |
| `src/app/` | Screens and API routes. |

### The UI changes with the device

It isn't one screen stretched: they're two different layouts sharing the same components.

| | mobile (<768) | tablet (768–1023) | desktop (≥1024) |
|---|---|---|---|
| Navigation | bottom tab bar on the four main screens, a top bar with a back button everywhere else | same | fixed sidebar: where to go, and you |
| Width | a single 28rem column, built for the thumb | 42rem–48rem | up to 72rem, left-aligned next to the sidebar |
| Landing | headline and buttons stacked | same | headline left, a look at the product right |
| Dashboard | one stack of cards | three figures across, then the stack | same as tablet until 1280, where it opens into two columns: the people either side of your balance left, your settlds and the month right |
| Forms | full screen, button at the bottom | same | vertically centred card |


### The four screens

Everything hangs off four places you can always get back to — the tab bar on a phone, the
rail on a desktop. Each one answers a different question, which is why each one exists:

| | Answers |
|---|---|
| **Dashboard** | What's still open, and what do I do about it |
| **Settlds** | What have I split, with whom, and for how much |
| **Activity** | Did that payment actually go through, and when |
| **Settings** | Who am I, how do people pay me, and how do I get back in if I lose this device |

Activity is the only screen that links out to the public explorer. That's on purpose: it's
where somebody goes to check that the money really moved, and the receipt is the proof.

Adding money stays a dialog rather than becoming a fifth screen — you come back to whatever
you were doing, and half of it happens inside somebody else's checkout.

### There are no groups

A settld is one thing somebody paid for, split between some people. That's the whole model.
There is no folder above it: a dinner is not a container you file expenses into, it *is* the
expense. Whoever paid owns it and is the only one who can edit or delete it — enforced in
the store, not in the button.

The arithmetic that follows from this is **pairwise**, and that is the decision worth
defending. With groups, everybody in a group saw the same expenses, so "who pays whom"
could be optimised across the whole group and everyone agreed on the answer. Without
groups there is no shared set: somebody you split a dinner with is in other settlds you
cannot see. Netting globally would mean computing their balance from half the facts and
telling you to pay a third party on the strength of it — and they would see a different
number on their screen.

So a debt only ever exists between two people, and both of them can see every settld that
produced it. Debts running both ways cancel: if you owe them $18 and they owe you $22.50,
what is left is one row saying $4.50, and one payment clears it.

Deleting a settld leaves the payments alone. Money that moved on a public blockchain did
move, and deleting the reason for it doesn't undo it — what the arithmetic does with that
is show the payer owing it back, which is the truth.

### The dashboard

Every other screen looks at one thing: a settld, a person, a payment. The dashboard is the
only one that answers the question you actually open the app with — what's still open, and
what do I do about it. It leads with three figures (what you can spend, what you owe, what
you're owed), then puts the people either side of your balance next to what produced it.

Nothing on it is decorative. Every figure is derived from your ledger by
`src/lib/split/dashboard.ts` — pure functions over integers, which is where the arithmetic
is tested. The only number that doesn't come from there is the balance, which comes from
the blockchain.

One thing the design deliberately does not have: a reminder button, because Settld can't
send anyone a message.

### Opening a database from before

Groups used to exist, and there is real data written that way. `src/lib/store/migrate.ts`
runs on every read: the folders are dropped and what was inside them stands on its own,
same amount, same payer, same people. Payments keep working because they were always
between two people — the group they were filed under never affected who owed what. The
first write after that stores the new shape, and the old fields are gone for good.

### How you add money

"Add money" opens a menu with three routes, all written for someone who doesn't know —
and doesn't care — that there's a blockchain underneath:

| | What it does | Status |
|---|---|---|
| **With a card** | Opens MoonPay's checkout via WDK. Pay by debit or credit and the funds land straight in the wallet. | Hidden until a key is set (below) |
| **Get paid** | Shows a QR and the address so someone else can send you money. | Working |
| **Test funds** | $50 from the treasury. | Working |

The address only appears as a fallback for whoever scans the QR, never as the main path.
No screen says "wallet", "token" or "blockchain".

#### Turning on card payments

The row only shows up once a key is configured — a permanently greyed-out option is worse
than one that isn't there: it takes the first slot in the menu and leads nowhere. Get a
publishable key at
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

**The recovery phrase is the fallback**, for when the password is forgotten. It lives in
Settings, alongside your address and the sign-out button. We don't show it to anyone at
signup: that would ruin the moment of walking in.

Details that matter:

- The vault never travels alongside the rest of the user. `/api/users/lookup` and the ledger
  strip it from the response; it's served only through `/api/users/vault`, at sign-in.
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
- [x] Settlds: what you paid for, split between people found by `@username`
- [x] Editing and deleting your own settlds
- [x] Working out who owes whom, netted per person
- [x] Payment preview with network cost and resulting balance
- [x] Explicit user confirmation
- [x] Real USD₮ transfer via WDK
- [x] Receipt with a tx hash linked to the explorer
- [x] Debt marked as settled

Deliberately out of scope: smart contracts, multisig, bridges, DeFi, pre-signatures, and
anything that would custody the user's keys.

---

## Known risks

**The public bundler is rate limited.** This is the failure that actually shows up. It has
two faces:

- *Querying a payment's status* returns "Public API key rate limit exceeded". That's why
  confirmation doesn't ask the bundler at all: it reads the `UserOperationEvent` the
  EntryPoint contract emits, straight from the RPC (`src/lib/wdk/receipt.ts`), which gives
  us both the real transaction hash and whether the operation succeeded.
- *Pricing a payment* throws `sendRPCRequest(pimlico_getUserOperationGasPrice) failed`,
  which kills the payment before it starts. `retryPreflight` in `src/lib/wdk/errors.ts`
  gives it two more chances with a growing pause.

The retry draws a hard line, and it is the most important line in that file: it only fires
while the error names a call that happens **before anything is signed**. From
`eth_sendUserOperation` onwards an error throws straight through, because repeating it
could pay somebody twice — far worse than failing.

**Get a Pimlico key for anything live.** It's free at
[dashboard.pimlico.io](https://dashboard.pimlico.io). Then:

```bash
npx vercel env add NEXT_PUBLIC_BUNDLER_URL production --cwd split
# value: https://api.pimlico.io/v2/11155111/rpc?apikey=YOUR_KEY
npx vercel deploy --prod --cwd split
```

The redeploy is not optional: `NEXT_PUBLIC_*` variables are baked into the bundle at build
time, so adding one changes nothing until the app is built again.

**No library error ever reaches the interface.** Everything the wallet layer throws goes
through `describeWalletError`, which turns the known failures into sentences and swallows
the rest into the caller's own wording. A screen that has spent the whole app avoiding the
words "RPC" and "gas" cannot print them in a red box the one time something breaks. The
original is logged to the console, for whoever is debugging.

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
