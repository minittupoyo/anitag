---
name: anti-ai-slop
description: Comprehensive guide and strict rules for identifying and eliminating AI-like tropes (AI Slop) across UI/UX design, UI copy/text writing, architecture, and code style. Apply when building applications, designing interfaces, writing UX copy, or refining code to achieve authentic human-crafted quality.
---

# Anti-AI Slop Guidelines (汎用 AI Slop 排除スキル)

This skill provides universal principles for identifying and eliminating "AI Slop"—the generic, template-bound, or artificially verbose patterns produced by AI models across UI/UX design, UX copy/writing, software architecture, and code style.

---

## When to Apply This Skill

- Building any web, desktop, mobile, or CLI application
- Designing user interfaces (UI) and user interaction flows (UX)
- Writing or refactoring UI copy, notifications, labels, error messages, or documentation
- Defining design systems, color tokens, layout structures, and typography
- Writing, reviewing, or refactoring code in any programming language (TypeScript, Rust, Python, Go, C#, Swift, etc.)

---

## 1. UI / UX Design (デザイン面の脱 AI Slop)

AI generation defaults to generic "dribbble-style" landing pages or predictable SaaS templates. Eliminate these visual tropes unless explicitly requested by the user.

### 🚫 Forbidden Visual Tropes (禁止されるAIデザインパターン)
- **No Unnecessary Step Badges**: Do not force numbered step cards ("1", "2", "3") into utility tools or dashboards. Use authentic task-oriented layouts (toolbar, sidebar, workspace canvas, split view).
- **No Purple-on-Dark Theme**: Avoid purple fonts, violet glowing accents, or indigo gradients on dark backgrounds.
- **No Glowing Border Accents**: Avoid artificial neon border outlines (`shadow-indigo-500/50`, `glow-border`).
- **No Headline Biscuit Pills**: Do not put pill badges with a pulsing dot directly above main headlines (e.g. `🟢 Introducing Next-Gen AI`).
- **No Over-Nested Cards**: Avoid nesting rounded cards inside rounded containers 3+ levels deep.
- **No Icon-Stuffed Bento Boxes**: Do not stuff arbitrary icons into bento grid boxes without functional justification.
- **No Gimmick "Magic/Sparkles" Icons**: Do not use `<Sparkles />` or `<Wand2 />` for standard action buttons. Use clear, functional icons (e.g., `<Check />`, `<Save />`, `<Play />`, `<Download />`).
- **No Scattered Hex Colors**: Avoid hardcoding arbitrary `#123456` hex strings across component files. Use a unified semantic color palette (e.g., Tailwind `zinc`, `neutral`, `slate`, or CSS custom properties).

### ✅ Human-Crafted Design Rules (人間らしい優れたデザインの徹底)
- **Function-Driven Layout**: Design the visual layout based on the primary utility of the product (IDE, audio editor, file manager, canvas, dashboard) rather than a generic marketing LP template.
- **Unified Color Palette**: Maintain strict visual hierarchy using 1 neutral base family for surfaces and borders, reserving distinct signal colors exclusively for states (`success`, `warning`, `error`, `active`).
- **Fluid & Responsive Density**: Ensure component padding, typography scale, and layout hit areas adapt naturally across desktop and mobile viewports without arbitrary static pixel hacks.

---

## 2. UX Copy & Text Writing (文言・テキスト面の脱 AI Slop)

AI-generated UX text is historically verbose, overly polite, generic, and full of repetitive transitional stock phrases.

### 🚫 Forbidden Copy Tropes (禁止されるAIテキストパターン)
- **No Verbose Passive/Polite Clauses**: Eliminate redundant Japanese/English passive filler phrases.
  - *Incorrect (JP)*: "〜することができます", "〜することが可能です", "〜を実行いたします"
  - *Incorrect (EN)*: "Allows you to seamlessly perform...", "You can easily click here to..."
  - *Correct*: Direct noun/verb forms ("スキャン", "保存", "リネーム", "Save", "Export")
- **No Stiff Generic Headers**: Avoid vague marketing headlines like "〜の最適化", "スマート連携", "Seamless Integration". Use explicit functional labels.
- **No Presumptuous Auto-Input**: Never automatically pre-fill or auto-submit user search inputs or form fields without explicit user consent.
- **No Overly Polite Notifications**: Keep toast and alert messages brief, factual, and contextual.
  - *Incorrect*: "〜件のデータを正常に処理することに成功しました"
  - *Correct*: "処理完了 (10件)" / "10 items processed"

### ✅ Human-Crafted Copy Rules (自然な言語設定)
- **Direct & Actionable**: Every button label, header, tooltip, and placeholder should use concise, domain-appropriate language.
- **Respect User Time**: State status changes, errors, and instructions in the fewest words necessary.

---

## 3. Code & Architecture (コード・構造面の脱 AI Slop)

AI models often introduce unnecessary abstractions, dead boilerplate, swallowed exceptions, or brittle dynamic imports.

### 🚫 Forbidden Code Tropes (禁止されるAIコードパターン)
- **No Unused Boilerplate Imports**: Do not include legacy or unused imports (e.g., `import React from 'react'` in React 19+).
- **No Swallowed Exceptions**: Never use empty `catch {}` or silent fallback blocks that mask underlying root causes.
- **No Artificial Wrapper Layers**: Avoid creating single-pass wrapper functions or dummy helper classes that add no real logic or safety.
- **No Fragile Dynamic CDN Imports**: Avoid unbundled dynamic imports (`import('https://cdn...')`) in native desktop or webview environments that trigger DOM security exceptions.
- **No Magic Hardcoded Values**: Avoid static pixel offsets (`+ 12`) or arbitrary layout multipliers without documented structural justification.

### ✅ Human-Crafted Code Rules (品質の高いコード開発)
- **Empirical Diagnostics**: Inspect full error tracebacks and logs before making code edits. Never guess symptoms.
- **Strict Preservations**: Retain explicit API contracts, docstrings, and existing helper utilities found in the codebase.
- **Runtime Verification**: Always verify code edits with clean build/test execution commands (`cargo check`, `npm run build`, `npm test`) before declaring completion.
