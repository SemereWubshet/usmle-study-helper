---
name: impeccable
description: Hold implementation, UI, and finished work in this project to an impeccable, no-half-measures quality bar. Use this whenever building or finishing a feature, before declaring any task "done," when polishing or refining the app or its UI, or when the user asks for something to be solid, production-quality, clean, or polished.
---

# Impeccable

This is a personal medical-education tool the user will actually study from — sloppy edges (a stack trace instead of a message, a chunk boundary that silently drops a page, a quiz that double-logs an answer on rerun) cost them study time and trust in the tool. Treat "impeccable" as the default bar, not an occasional extra pass.

## Before calling anything done

- Re-read the actual diff, not your memory of what you intended to write. Confirm the code does what you think it does.
- Trace the unhappy paths on purpose: empty inputs, a zero-question chunk, a missing/expired auth session, a malformed LLM response, an empty history table. Each of these has an explicit, human-readable message somewhere in this project's design — never let one surface as a raw traceback in the Streamlit UI.
- If the change touches the UI, actually run it (`uv run streamlit run app.py`) and click through the golden path plus at least one edge case before reporting success. Type checks and unit tests verify correctness, not that the feature *feels* right — say so explicitly if you can't test the UI live.
- Check state that's supposed to persist actually persists across a rerun/restart (Streamlit reruns the whole script on every interaction — this is where "works once" bugs hide: double-submitted history rows, a chunk cache recomputed every keystroke, a notebook recreated instead of reused).

## Sweat the details users will actually hit

- Error messages speak in the interface's voice: say what happened and what to do about it, never "an error occurred" and never a bare exception repr.
- Empty and loading states are designed, not accidental — "no questions match your filters" and "generating questions via Gemini Notebook..." are real UI states, not afterthoughts.
- Consistency matters more than any single clever touch: the same action (submit, next, elimination toggle) should look and behave the same everywhere it appears.
- Don't leave a rough default in place just because it technically works when a specific, deliberate choice was just as easy — but don't gold-plate parts of the app nobody asked for either. Impeccable means no rough edges on what exists, not maximal scope.

## Self-critique pass

Before reporting work finished, take one pass through it adversarially: what's the first thing that would break if the user did something slightly unexpected? Fix that before handing it back, not after they find it.
