# Settld brand context

> Copy everything below and paste it into ChatGPT (or any image model) to generate brand
> imagery — pitch deck slides, social cards, mockups.
>
> Note: the real landing page already exists and is in production. For an image to come out
> faithful, also attach a screenshot of <https://split-zeta-one.vercel.app>. This document
> describes that page as built.

---

## The product

Settld is a shared-expense app. You split dinner, the Airbnb or a trip with your friends,
and when it's time to settle up, **the money actually moves** from inside the app. Other
apps tell you who owes you and stop there; Settld gets you paid.

Underneath, every user has a self-custodial wallet and payments are real transfers of
digital dollars — but **the user never finds out**. Not one screen says "wallet", "token",
"blockchain" or "crypto". It talks about balance, adding money, paying and settling up,
like any banking app.

Audience: ordinary people in their twenties and thirties who go out to eat with friends and
are tired of chasing the ones who don't pay. They aren't technical and have no interest in
becoming technical.

Core line: **"Split expenses. Settle instantly."**
Subline: "Other apps tell you who owes you and stop there. Settld calculates and executes
the payment in USD₮ directly from your wallet."

## Visual identity

The most important design decision was **not looking like a crypto app**. No black
background with purple gradients, no futuristic aesthetic. Instead: warm paper, near-black
ink, and a signal lime that only appears when there's something to do. The reference in
tone is Wise, not an exchange.

**Exact colours**

| Role | Hex |
|---|---|
| Background, warm paper | `#faf6ee` |
| Text, near-black ink | `#16150f` |
| Cards, pure white | `#ffffff` |
| Signal lime, buttons and accents | `#c3f04e` |
| Deep green, text on the lime | `#204c2c` |
| Green for "settled" | `#2c7248` |
| Red for "owes" | `#b54a2e` |

**Typography**

- Headlines and amounts: **Bricolage Grotesque**, weight 800, very tight tracking
  (-0.04em), extremely tight leading (0.85). Headlines look dense and stacked, like a
  printed poster.
- Interface text: **Manrope**, weight 500–600.
- Section micro-labels: uppercase, 11px, wide letter-spacing, grey — the detail that gives
  it the printed-receipt feel.
- Amounts always in tabular figures and huge. **The number is the protagonist of every
  screen**, not the decoration.

**Shapes and texture**

- Fully rounded pill buttons, tall, generous padding.
- Cards with very round corners (32px) and almost no shadow: a hairline 1px border and, on
  the hero card only, one soft deep shadow.
- A subtle dot texture over the background, barely visible, suggesting paper.
- Lots of air. Nothing cramped.

## The landing as built

Mobile-first, but the layout changes on desktop: two columns.

**Header:** the wordmark `Settld.` on the left, and a black pill button reading **Open App**
on the right.

**Left column:**
- Giant headline, stacked on two very tight lines, in ink:
  `Split expenses.` / `Settle instantly.`
  — with the word **"Settle" in green** (`#2c7248`), the rest in ink.
- Subline in ink at 80% opacity: "Other apps tell you who owes you and stop there. Settld
  calculates and executes the payment in USD₮ directly from your wallet."
- A solid lime pill button reading **Start now** with a right arrow, and beside it, in tiny
  spaced uppercase grey: "BUILT ON WDK".

**Right column:** a look at the product, not a generic phone mockup. A white card with very
round corners, slightly rotated in 3D (about -5° on Y, +2° on X) that straightens out on
hover, showing a real expense:

```
DINNER AT OSAKA
$120.00
──────────────────────────────────────────
M  @mateo      $30    ✓ SETTLED
J  @julian     $30    OWES          ← highlighted on a soft red background
A  @ana        $30    ✓ SETTLED
Y  @you (paid)        +$90
──────────────────────────────────────────
[         Remind @julian          ]   ← black pill button
```

The names carry circular avatars with initials. "SETTLED" is green on a pale green chip;
"OWES" is red. The `@you` row shows `+$90` in green with a lime avatar.

**Differentiators strip:** a full-width white band, four columns divided by hairlines, each
with a bold headline and a paragraph at 60% opacity:
- "Real settlement." — We are not a grocery ledger. Others calculate; Settld collects and transfers.
- "No ETH, ever." — Network fees are paid in USD₮. Nobody needs an absurd second token.
- "Self-custodial." — Your wallet lives on your device. We only store your public address.
- "Smart crossing." — If 4 people have 4 crossing expenses, the app resolves it with 3 payments, not 12.

**Closing quote:** centred, huge, in the display typeface:
"Don't teach people how to use crypto. Build products where they don't need to know they're
using it." — followed by a big lime pill button reading **Create free account**, with a soft
lime glow beneath it.

**Footer:** hairline rule, and in small spaced uppercase at 40% opacity: "© 2026 Settld" on
the left, "# VERIFIABLE RECEIPTS" on the right.

---

## The image prompt

Generate a mockup of the landing page for Settld, a shared-expense app for friends.
Editorial fintech style, warm and full of air — the opposite of a crypto app.

Warm paper background `#faf6ee`, with an almost imperceptible dot texture. Two-column
composition in a 16:9 desktop format.

On the left: an enormous, very dense typographic headline on two stacked lines with
extremely tight leading, a heavy grotesque in the style of Bricolage Grotesque at weight
800, reading "Split expenses. Settle instantly." — with the word "Settle" in green
`#2c7248` and the rest in warm black `#16150f`. Below it, a short subline in the same ink
at reduced opacity, and a lime pill button `#c3f04e` with dark green text reading "Start
now", next to tiny spaced grey uppercase text reading "BUILT ON WDK". Above everything, a
small wordmark reading "Settld." and a black pill button reading "Open App".

On the right: a white card with very round corners (32px), one soft deep shadow, slightly
rotated in 3D, showing a shared expense titled "DINNER AT OSAKA" for "$120.00", with four
people listed — each with a small circular avatar bearing their initial and their $30
share — and status chips in green ("SETTLED") and red ("OWES"), with one row highlighted on
a pale red background. At the bottom of the card, a black pill button reading "Remind
@julian".

No harsh shadows, no gradients, no purple fades, no futuristic aesthetic and no crypto
imagery. Clean, warm, typographic, with lots of white space.
