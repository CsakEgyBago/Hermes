# Manual test data

Example inputs for manually exercising every feature of the app in a browser.
The app is paste-only — there's no file upload — so "using" a file here means
opening it, copying its contents, and pasting it into a source box in the UI.

Run `just run` (or `npm run dev` from the project root) and open
`http://localhost:5173` before working through these.

Every scenario below now has three difficulty tiers in its folder:

- **easy/** — the obvious, unambiguous case. Exact outcomes are asserted.
- **medium/** — a step up: paraphrasing, competing candidates, or borderline
  cases. Outcomes are still fairly precise, but some are described as "should
  generally..." where the exact numbers legitimately depend on wording.
- **hard/** — a genuine stress test: more sources, red herrings, adversarial
  edge cases, or setups designed to make Fast and Precise disagree. Outcomes
  here are intentionally qualitative — the point is to observe _how_ the
  algorithm behaves, not to hit an exact number. Every hard-tier claim below
  that states a specific outcome was actually run through `analyzeStatistical`
  to confirm it, the same way the original autosplit heading bug was caught.

| #                              | Scenario                            | Exercises                                                                       |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------- |
| [01](01-basic-corroboration)   | Basic corroboration                 | Statistical mode, cross-source agreement, exact-quote highlighting              |
| [02](02-topic-relevance)       | Topic relevance                     | Topic field + the corroboration↔topic-relevance slider                          |
| [03](03-markdown-detection)    | Markdown detection                  | The auto-detect heuristic (strong vs. weak signals) and the manual override     |
| [04](04-autosplit-same-file)   | Autosplit + same-file corroboration | "Split by headings", `groupId`, and the same-file-doesn't-self-corroborate rule |
| [05](05-markdown-to-plaintext) | Markdown → plain text               | The "Convert to plain text" button                                              |
| [06](06-speed-vs-precision)    | Speed vs. precision                 | Fast / Balanced / Precise presets (word-overlap vs. TF-IDF)                     |
| [07](07-tied-weights)          | Tied weights                        | The degenerate-normalization fix (ties show 100, not 0)                         |

All scenarios default to **Statistical mode**. Scenario 01/easy can also be
replayed in **AI mode** (see the note at the bottom).

---

## What's new since the last pass

- **Single-source bug fix**: a single source with multiple sentences used to
  rank everything as a flat tie (an edge-suppression bug). To see it fixed,
  paste `01-basic-corroboration/single-source-bug-demo.txt` alone into one
  box and Analyze (Statistical, no topic) — verified: the repeated
  "database migration" sentence comes out at weight **100** while the
  unrelated one-off sentences all sit at **0**, instead of everything tying.
- **Summary panel**: a "Top result" callout now sits above the ranked list —
  headline (the #1 point) plus a synthesized blurb.
- **Collapsed-by-default sections**: Sources, "How this was computed", and
  Statistics now start collapsed under the ranked list; clicking a ranked
  point auto-expands Sources so the highlight is still visible without an
  extra click.
- **AI mode now has a model picker and an API key field** (in the mode panel,
  visible when AI is selected). The key is stored only in your browser
  (localStorage) and sent with each request — leave it blank to keep using
  whatever key is in `server/.env`.

---

## 01 — Basic corroboration

### easy

Paste each file into its own source box (Statistical mode, no topic, any speed preset).

1. `source-1-news-report.txt` → Source 1
2. `source-2-internal-memo.txt` → Source 2
3. `source-3-engineer-notes.txt` → Source 3
4. Click **Analyze**.

**Expect:** the top ranked point is _"The Q3 server outage was caused by a
memory leak in the caching layer."_ with rationale _"Corroborated across 3
sources"_ and three source quotes. The Summary panel headlines the same
sentence. Click it and confirm all three source panels (expand "Sources"
first, or just click the point — it auto-expands) scroll to and highlight
that exact sentence.

### medium

Paste all 4 files (Balanced preset, no topic). The shared fact is
**paraphrased** differently in each source instead of repeated verbatim, and
two secondary facts ("ten percent discount", "incident review Tuesday") each
appear in exactly 2 of the 4 sources.

**Expect:** the payment-worker-memory idea should rank at or near the top
even though no two sources word it identically — this is the single-source
edge-suppression fix's cousin: cross-source centrality has to work on
_paraphrases_, not just exact duplicates. The two 2-of-4 facts should land
below it but still show "Corroborated across 2 sources".

### hard

Paste all 6 files (any preset). Corroboration depth varies: the
security-bug/launch-delay idea appears in 5 of 6 sources, the marketing-assets
idea in 3 of 6, and a "beta tester" mention appears in 2 of 6 sources —
**but source 3 also has a _different_, distinct beta-tester sentence** (a
near-duplicate red herring) that should stay a separate point rather than
merging with the real 2-of-6 cluster.

**Expect (qualitative):** breadth of corroboration should dominate — the
5-of-6 point on top, the 3-of-6 point next, the 2-of-6 point after that.
Worth specifically checking whether source 3's red-herring sentence merged
into the 2-of-6 cluster or stayed separate (either is a defensible outcome
depending on exact wording overlap — this is the kind of thing worth eyeballing
rather than assuming).

---

## 02 — Topic relevance

### easy

1. `source-1-office-note.txt` → Source 1
2. `source-2-office-and-security.txt` → Source 2
3. Topic field: `security vulnerability`
4. Slider to the far **left** (0%) → Analyze.

**Expect:** top point is the lunch sentence (corroborated in both, topic ignored).

5. Slider to the far **right** (100%) → Analyze again.

**Expect:** top point flips to _"A critical security vulnerability was
discovered in the authentication library."_

### medium

1. Paste all 3 files. Topic: `data breach`.
2. This time **two** facts are each corroborated by 2 of 3 sources (parking
   garage closure, company picnic) — a genuine tie at low topic weight — while
   the data-breach sentence is mentioned only once.

**Expect:** at topic weight 0%, the parking-garage and picnic points should
land close together (don't be surprised if they tie) well above the
data-breach point. At 100%, the data-breach point should jump to the top.

### hard

1. Paste all 5 files. Topic: `customer refunds`.
2. The tool-rollout fact is corroborated by **all 5** sources. Source 3 alone
   mentions _"clients were reimbursed for shipping delays"_ — related to the
   topic in meaning, but sharing **zero exact words** with "customer refunds".

**Expect:** even at topic weight 100%, the reimbursement sentence likely
_won't_ out-rank the 5-source tool-rollout fact — verified by running this
exact input: both Jaccard and TF-IDF cosine score the topic similarity at 0
here, since neither method understands that "reimbursed clients" means
roughly the same thing as "customer refunds" without a shared word to anchor
on. **This is a real, worth-knowing limitation of lexical similarity.** Try
the same sources + topic in **AI mode** and compare — a model can bridge that
synonym gap in a way word-overlap math can't.

---

## 03 — Markdown detection

### easy

Paste each file into its own box one at a time and watch the Markdown checkbox.

| File                       | Auto-detect                           |
| -------------------------- | ------------------------------------- |
| `plain-prose.txt`          | off                                   |
| `headings-only.md`         | on (heading alone is a strong signal) |
| `weak-signals-combo.md`    | on (bold + link = two weak signals)   |
| `false-positive-check.txt` | off                                   |

Manually toggle it on `plain-prose.txt`, then keep typing — it should **stay**
however you set it.

### medium — borderline cases

| File                       | Auto-detect | Why                                                                       |
| -------------------------- | ----------- | ------------------------------------------------------------------------- |
| `one-weak-signal-only.txt` | **off**     | a numbered list is only one weak signal category — needs a second to trip |
| `blockquote-only.txt`      | **off**     | same — one weak signal alone isn't enough                                 |
| `heading-deeply-buried.md` | **on**      | a heading is a strong signal regardless of how much prose surrounds it    |
| `list-plus-blockquote.md`  | **on**      | list + blockquote = two weak signals together                             |

### hard — adversarial / known limitations

These aren't bugs to fix here, just honest limitations of a heuristic that
doesn't parse full context:

- `code-comment-false-positive.txt`: a Python-style `# TODO:` comment reads as
  a Markdown heading (strong signal) and **will** auto-check — indistinguishable
  from a real heading by this heuristic.
- `escaped-markdown-false-positive.txt`: the author only escaped the leading
  character of each pair (`\**bold**`, `` \`code\` ``) — a common mistake,
  since real Markdown requires escaping every special character to fully
  suppress it. The trailing `**` and `` ` `` are still unescaped and adjacent,
  so both the bold and inline-code weak signals fire (two signals, past the
  threshold) and this still gets auto-detected as Markdown despite the
  author's best effort to escape it.
- `chat-transcript-not-markdown.txt`: a chat log with `- name:` lines and a
  backtick command reads as list + inline-code (two weak signals) and
  **will** auto-check, despite being a transcript rather than authored Markdown.

---

## 04 — Autosplit + same-file corroboration

### easy

1. Paste `quarterly-report.md` into Source 1 (Markdown auto-checks).
2. Click **Split by headings (3)** — replaces it with three linked boxes.
3. Analyze with just those three.

**Expect:** top point _"The migration to the new billing system is now
complete."_ — rationale **"Mentioned in 1 source"**, despite appearing three times.

4. Add `independent-confirmation.txt` as a new source, Analyze again.

**Expect:** rationale flips to **"Corroborated across 2 sources"**.

### medium — paraphrased repetition

1. Paste `quarterly-engineering-update.md`, split by headings (4 pieces).
2. Analyze with just those four.

**Expect:** the "caching layer rewrite improved server response times" idea is
worded **differently in every section** — verified: it still shows
**"Mentioned in 1 source"** for every point that touches this idea (some
sections may or may not merge into one row depending on exact wording overlap,
but none of them will say "Corroborated" against each other, since the fix is
about the shared file identity, not the literal text).

3. Add `independent-audit.txt`, Analyze again.

**Expect (verified):** the top point becomes _"An external audit confirmed
that the caching layer rewrite improved server response times."_, merged with
one of the report sections, rationale **"Corroborated across 2 sources"**.

### hard — multiple simultaneous groups

1. Paste `auth-migration-report.md` (three `##` sections), split by headings.
2. Paste `campaign-recap.md` (two `#` sections) into a separate box, split by
   headings too — a second, independent group.
3. Paste `finance-note.txt` as a third, unsplit, independent source.
4. Analyze all of it together.

**Expect (verified):** _"The auth service migration to the new identity
provider is now complete."_ tops the list with **"Corroborated across 2
sources"** (the 3-piece split file counts once, plus the independent finance
note). _"The Q3 campaign drove a twelve percent increase in signups."_
(the other split file, 2 pieces) shows **"Mentioned in 1 source"** — its two
pieces share a group with each other but nothing else. This confirms multiple
independent split-groups don't leak into each other's corroboration count.

---

## 05 — Markdown → plain text

### easy

Paste `rich-sample.md`, click **Convert to plain text**.

**Expect:** clean prose, no `#`, `**`, `*`, `` ` ``, `[]()`, or `>` characters;
the fenced code block's content disappears entirely (code isn't prose, so
it's dropped rather than flattened).

### medium — nested lists, mixed emphasis, links

Paste `sprint-recap.md` and convert.

**Expect (verified):** nested bullet sub-items flatten to their own lines,
`***critical***` (bold+italic together) becomes plain `critical`, and both
links keep their link text ("API docs", "changelog") with the URLs dropped.

### hard — images, reference links, hr, nested quotes, multi-language code

Paste `release-notes.md` and convert.

**Expect (verified):**

- The image becomes just its alt text (`architecture diagram`), URL dropped.
- The reference-style link resolves to its text (`see the migration guide`);
  the `[ref]: ...` definition line disappears entirely.
- The `---` horizontal rule disappears with no artifact.
- Both quote levels become plain paragraphs (nesting markers stripped).
- **Both fenced code blocks vanish completely** (js and python alike) — same
  "code isn't prose" behavior as the easy tier.
- **The table's pipes and dashes survive completely unconverted** — this
  converter doesn't load the GFM plugin, so table syntax isn't Markdown to it
  as far as parsing goes. Known limitation, not a bug: worth knowing before
  you paste a table in expecting it to clean up.

---

## 06 — Speed vs. precision

### easy

Paste all 4 files, run Fast then Precise. Both should recognize the
parking-rate-increase idea as important; Precise (TF-IDF cosine) is generally
better at recognizing paraphrases as the same underlying point than Fast's
plain word overlap.

### medium — two competing, equally-corroborated topics

Paste all 6 files (3 about a road closure, 3 about school budget cuts, each
internally paraphrased). Run Fast, note the ranking, then switch to Precise.

**Expect:** a genuine head-to-head — both topics are corroborated by exactly
3 of 6 sources, so which one comes out on top can legitimately flip between
presets. That's the point: watch whether Fast and Precise agree.

### hard — three candidates at different corroboration/wording levels

Paste all 8 files. One fact is **verbatim identical** in 3 sources (easy for
any method), a second is corroborated by **4** sources but worded differently
every time, and a third is verbatim in 2 sources.

**Expect (qualitative):** compare how Fast vs. Precise order these three —
the verbatim 3-source fact is a "gimme" for both, but the paraphrased 4-source
fact is the interesting one: it has more corroboration but weaker lexical
overlap, so it's a real test of whether TF-IDF's better paraphrase recognition
is enough to let breadth-of-corroboration win over Fast's cruder matching.
Check the "How this was computed" edge counts for each preset — they should differ.

---

## 07 — Tied weights

### easy

Paste the two unrelated one-off statements, Analyze.

**Expect:** both points show weight **100**, not 0.

### medium — two independent tied pairs

Paste all 4 files (two paraphrased pairs about unrelated topics: solar panels,
coffee machine).

**Expect (verified):** exactly 2 output points (each pair merges into one),
**both at weight 100** — the tie-handling fix holds even with multiple
simultaneous tied clusters, not just a single pair.

### hard — near-ties plus a genuinely isolated point

Paste all 5 files (two pairs with different degrees of wording overlap, plus
one fully isolated sentence with no partner at all).

**Expect (verified, Precise preset):** the tightly-worded headquarters pair
merges into one point at weight **100**; the more loosely-worded mailroom pair
stays as **two separate points, both tied at weight 74**; the isolated
CEO-appointment sentence lands well below both at **21**, beneath even the
extra filler sentences in that same source. That's worth sitting with: the
CEO-appointment sentence is arguably the most "newsworthy" one-off fact here,
but the statistical algorithm ranks by corroboration _structure_, not
perceived narrative importance — an uncorroborated point never outranks a
corroborated one, no matter how significant it sounds. That's a real,
worth-knowing tradeoff of this approach vs. AI mode, which can and does weigh
narrative significance directly. (Exact numbers drift a little any time the
surrounding text changes — TF-IDF's idf weighting is corpus-wide — but the
ordering and the near-tie between the two mailroom points are the stable,
structural part of this demo.)

---

## Bonus: AI mode

Switch the mode toggle to **AI**. You'll see a model picker and an API key
field. Leave the key blank to use whatever's in `server/.env`, or paste your
own — it's stored only in your browser and sent with each request, never
written to disk server-side. Replay scenario 01/easy's three files and compare
Claude's phrasing, weighting, and summary against the statistical result for
the same input.
