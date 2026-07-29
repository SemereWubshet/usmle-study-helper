---
name: design-motion-principles
description: Principles for adding purposeful, restrained motion and micro-interactions to this project's Streamlit UI (progress indicators, question transitions, submit/answer feedback, the explanation accordion). Use whenever building or refining app.py's UI, writing the injected custom CSS, or when the user asks for animation, transitions, polish, or the interface to "feel" better.
---

# Design Motion Principles

Motion here should clarify state changes in a quiz-taking flow, not decorate them. Every animation should answer "what just changed, and where did it go" for the user — a question submitted, an option ruled out, a new question arriving. If a motion doesn't answer that, cut it.

## The Streamlit constraint

Streamlit reruns the whole script top-to-bottom on every interaction — there's no persistent client-side JS state between reruns unless you build a custom component, which is a lot of machinery for polish. That means:

- Favor CSS transitions/keyframes triggered by class changes in the freshly-rendered markup (`st.markdown(..., unsafe_allow_html=True)`), not JS-driven animation libraries.
- Anything that needs to survive across a rerun (e.g., "animate only on the *change* from unsubmitted to submitted, not on every render") needs a CSS trick that keys off state already present in the render — e.g. apply an `animate-in` class conditionally based on `st.session_state` flags computed this run, using CSS `@keyframes` for the one-shot entrance rather than trying to detect "did this just change" in JS.
- Don't fight the framework by reaching for `streamlit-extras`-style animation components unless a specific effect is impossible in pure CSS — added dependency and complexity should buy something CSS genuinely can't do.

## Timing and easing

- Micro-interactions (elimination strikethrough, button press, option highlight): 120-200ms, `ease-out`. Fast enough to feel responsive, not so fast it's missed.
- Entrances (new question card, explanation accordion opening): 200-300ms, `ease-out`. Content should arrive like it's settling into place, not bouncing.
- Exits/collapses: slightly faster than entrances (150-200ms), `ease-in`. Things leaving shouldn't linger.
- Never animate the progress bar or timer with a bouncy/elastic easing — those are informational, not celebratory; a linear or ease-out fill reads as trustworthy data, not a toy.

## Where motion earns its place in this app

- **Progress header**: the progress bar fill transitions smoothly on question advance (`transition: width 250ms ease-out`), not an instant jump — reinforces "you moved forward."
- **Option elimination**: the strikethrough and opacity fade in over ~150ms when toggled — confirms the click registered without redrawing the whole card.
- **Submit feedback**: correct/incorrect option highlighting fades in (~200ms), not an instant color snap — gives the eye a half-second to land on the right place before the color arrives.
- **Explanation accordion**: expands with a height/opacity transition, not just an instant show/hide (`st.expander` alone is instant — if a custom-CSS version is used instead, animate its reveal).
- **New question arriving**: one quiet entrance (fade + tiny upward slide, ~8-12px) on the vignette card. This is the closest thing to a "signature moment" in this app — keep it to exactly this one spot rather than scattering entrance effects on every element (option rows, buttons, labels all arriving separately reads as busy, not polished).

## Restraint

Spend the one deliberate flourish on the new-question entrance. Everything else should be quick, quiet, and functional — a 150ms fade, not a flourish. If in doubt, cut the animation rather than add one; a static UI that's clear beats a busy one that's impressive. Respect `prefers-reduced-motion` in the injected CSS (`@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`) so motion is never forced on users who've asked their system to minimize it.
