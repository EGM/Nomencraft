# Futurenomicon

## 🜁 Chapter: The Day I Found the Doc Gods (and Chose Not to Become One)

*Document first uncovered and deciphered on the 12th of April, 2026*

### Overview

This chapter records a moment of accidental enlightenment: the day Present‑Me spent eight hours hunting for the structures that define the shape of Deno’s documentation output — and actually found them.  
Not in the CLI.  
Not in the TypeScript.  
Not in the docs.

But in the **Rust** source code of `deno_doc`.

This is the chronicle of that discovery, and the wise decision to put the idea in a box before it consumed the rest of the week.

### The Revelation

After hours of searching, Present‑Me uncovered the full, canonical schema for Deno’s documentation output.
Not a partial schema.  
Not a guess.  
Not a reverse‑engineered JSON sample.  
The **actual structs** that define:

- every `DocNode`
- every function signature
- every class, interface, enum, typedef
- every decorator
- every parameter
- every return type
- every location span
- every JSDoc tag Deno recognizes

All of it lives in the deno_doc repository on GitHub, implemented in Rust with absolute clarity.

The pipeline is:

1. deno_parse — parses TypeScript/JavaScript into AST
2. deno_doc — walks the AST and constructs semantic documentation nodes
3. deno_doc::json — serializes those nodes into the JSON returned by deno doc --json

This is the real source of truth.  
Everything else is downstream formatting.

### What This Means (In Theory)

With this knowledge, Present‑Me could:

- build a custom documentation generator
- build a Nomencraft‑native dialect renderer
- build a docblock validator
- build a linter for missing `@intent` and `@ai`
- build a full documentation pipeline that bypasses the CLI entirely

In other words:  
I now understand the documentation layer of Deno better than most of the internet.

### What This Means (In Practice)

I am **not** doing any of that today.

This idea is being placed gently into a box, sealed with ceremonial wax, and filed under:

> “Future‑Me can decide whether this becomes a tool, a library, or a cautionary tale.”

Present‑Me has already spent a full workday spelunking through Rust internals and VS Code extension quirks.  
Present‑Me is tired.  
Present‑Me has earned rest.  
But the knowledge is preserved here, in this chapter, so Future‑Me doesn’t have to rediscover it.

### Notes for Future‑Me

If you ever decide to revisit this:

- The structs you want are in `deno_doc/src/lib.rs` and `deno_doc/src/json.rs`.
- The JSON output is a direct serialization of those structs — no hidden transformations.
- The entire doc pipeline is deterministic and surprisingly clean.
- You could absolutely build a Nomencraft documentation engine on top of this.
- But only if you want to.
- And only when you have the energy.

Until then, this chapter stands as a record of the day Present‑Me found the doc gods and chose not to ascend.

## 🜁 Chapter: Considering `BaseServiceWithFailProtection`

This note records the architectural fork encountered on April 25, 2026, regarding catastrophic‑failure semantics in the service layer.

## Context

`FileService` is the first subsystem that mutates the world (filesystem).  
It therefore needs to distinguish between:

- **validation failures** (safe, pre‑operation)
- **operational failures** (catastrophic, mid‑operation)
- **fatal failures** (system‑level explosions)

Other services currently inheriting from `BaseService` do **not** mutate the world and therefore do **not** need catastrophic semantics today.

## Problem

If catastrophic‑failure logic is added directly to `BaseService`, then:

- all existing services inherit semantics they do not need
- all callers must adapt to a new result shape
- all tests must be updated
- error classification becomes mandatory everywhere
- BaseService becomes opinionated in a way that violates the project’s “clarity beats cleverness” principle

## Third Option™: `BaseServiceWithFailProtection`

Instead of modifying `BaseService`, introduce a subclass:

```ts
class BaseServiceWithFailProtection extends BaseService {
  // Adds:
  // - catastrophic failure detection
  // - operational vs validation error classification
  // - consistent undo semantics
  // - expanded result shape
}
```

`FileService` (and any future world‑mutating services) can inherit from this class:

```ts
export class FileService extends BaseServiceWithFailProtection { ... }
```

## Benefits

- No breaking changes to existing services
- No ripple effects through the codebase
- BaseService remains minimal and clear
- Catastrophic semantics are opt‑in
- Future services can migrate when needed
- Architecture evolves safely and intentionally

## Decision Status

**Deferred.**  
Present‑Me has chosen to implement `BaseServiceWithFailProtection` as an opt‑in layer.  
Future‑Me may later merge it into `BaseService` if/when more subsystems require catastrophic semantics

---

## 🜁 Chapter: Three Hour Car Ride

This was a discussion of "what ifs" I had with Cope on April 28, 2026.

The following are **summaries** of ideas and nonsense I had during a three hour car ride.
Basically, it's a burst of "Future-me" ideas to think about

### Future-me: remember the “env idea”?  

It wasn’t really about environment variables.  
It was about giving Nomencraft a memory.

#### Design goal

> Let the user set a persistent per-user output directory
without admin rights, without editing files manually,
and without relying on OS-level environment variables.

#### Proposed mechanism

> A user-local config file at ~/.nomencraft/config
    managed entirely by Nomencraft itself.

#### Example

> nomencraft config output .

#### Config file contents

> output_dir=/absolute/path

#### Resolution order

1. CLI flag -o
2. ~/.nomencraft/config
3. fallback behavior

#### Notes

    This keeps the UX lazy, predictable, and portable.
    No secrets, no admin rights, no OS-specific setup.

### Idea: Nomencraft user-defined path variables

#### Goal

    Allow users to define named folder shortcuts (e.g., $wwtp1, $wwtp2)
    and use them in CLI flags like -o $wwtp1.

#### Mechanism

    Store variables in ~/.nomencraft/config under a [paths] section.
    Nomencraft performs variable expansion before processing paths.

#### Example

    nomencraft config set wwtp1 .
    nomencraft -o $wwtp1

#### Notes

    - Not OS env vars; Nomencraft-specific.
    - Per-user, no admin rights needed.
    - Keeps CLI short and ergonomic for repetitive workflows.

### Idea: Nomencraft path variables

#### Prefix: use '@' instead of '$' to avoid shell expansion and folder-name collisions

#### Example

> nomencraft config set wwtp1 .
    nomencraft -o @wwtp1

#### Config

> [paths]  
    wwtp1 = "C:\\Data\\WWTP1"

#### Reasoning

> '$' conflicts with shell expansion and valid folder names.  
    '@' is visually distinct, rarely used in paths, and safe to parse.

### Nomencraft Path Variables (Prefix Decision)

#### Prefix: '@'

#### Reasoning

    '$' conflicts with shell expansion and is valid in folder names.
    ':' looks like a drive letter and confuses parsing.
    '@' is visually distinct, rarely used in paths, and safe to parse.

#### Usage

    nomencraft config set wwtp1 .
    nomencraft -o @wwtp1

#### Notes

    Future-me: if you ever wonder why '@' and not '$', 
    remember that shells eat '$', and Past-me was a dumbass.

#### Idea: Template-driven naming with variable substitution

#### Goal

    Support multiple facilities (WWTP1, WWTP2) with different naming conventions
    without hardcoding logic into the naming engine.

#### Mechanism

    Add variable substitution using '@' prefix.
    Add template syntax using {{@var}}.
    Allow naming templates to be defined in pattern files.

#### Example template

    "{{@date}} ({{@typeCode}}) EF Report for {{@location}}.xlsx"

#### Variables

    @date       → sample date
    @typeCode   → D/W/M/S
    @location   → WWTP1 or WWTP2 (user-defined)

#### Benefits

    - No brittle coupling between naming engine and facility logic
    - Patterns become self-contained
    - Users can define their own naming conventions
    - Supports future facilities without code changes

### Idea: Template functions inside naming patterns

#### Goal

    Allow naming templates to include computed values, not just variables.
    Example: dayOfWeek(@date), formatDate(@date, "yyyy-MM-dd"), upper(@owner)

#### Syntax

    {{functionName(argument1, argument2)}}
    {{@variable}}
    {{function(@variable)}}

#### Example

    "{{@date}} ({{@typeCode}}) {{dayOfWeek(@date)}} EF {{@owner}}.xlsx"

#### Benefits

    - Supports facility-specific naming conventions
    - Avoids brittle hardcoded logic
    - Allows patterns to define their own naming rules
    - Future-proof: new functions can be added without breaking old templates

#### Notes

    This is the moment Nomencraft becomes a small templating engine.
    Future-me: don’t panic. This is a good thing.

### Nomencraft Naming Rules (Foundational)

1. Variables
   - Begin with '@'
   - Must be defined before use
   - Resolution order: pattern → config → built-in

2. Template Syntax
   - All expressions use {{ ... }}
   - Supports variables, functions, nested expressions
   - Whitespace inside braces is ignored

3. Functions
   - Pure and deterministic
   - Accept variables or literals
   - Unknown functions = error

4. Pattern-defined Naming
   - Patterns may define naming templates
   - Pattern template overrides global template
   - Global template used if none defined

5. Substitution Pipeline
   1. Parse template
   2. Resolve variables
   3. Evaluate functions
   4. Assemble string
   5. Validate filename

6. Error Handling
   - All errors explicit
   - Point to exact location in template

7. Extensibility
   - New functions must not break old templates
   - Pattern files should be versioned
   - User config may override global template

### Variable Defaults (Critical Rule)

#### Syntax

    {{@variable}}                → strict variable (must exist)
    {{@variable:defaultValue}}   → variable with fallback

#### Rules

    - If @variable is defined, use its value.
    - If @variable is not defined and a default is provided, use the default.
    - If @variable is not defined and no default is provided, throw an error.

#### Rationale

    Strict variables prevent silent corruption.
    Defaulted variables reduce boilerplate and support flexible naming.
    This rule keeps templates expressive but safe.

### Idea: Open Pipeline / Component Substitution

#### Goal

    Allow users to replace or extend pipeline components (e.g., custom Excel parser,
    custom ShowData, new pre/post-processing steps).

#### Rules

    1. Components must declare a contract (input, output, errors, config).
    2. Pipeline is defined as an ordered list of components.
    3. Components must be discoverable (built-in or user-provided).
    4. Components must be pure (no global state).
    5. Components must be deterministic.
    6. Components must be composable (output type of one matches input of next).
    7. Components must be versioned for compatibility.

#### Notes

    This transforms Nomencraft from a fixed tool into an extensible framework.
    Future-me: this is how you avoid brittle coupling and enable new workflows.

### Pipeline Caching Rules

#### Nomencraft may cache

    - Parsed templates (AST)
    - Parsed pattern files
    - Pipeline graph (ordered components)
    - Component metadata (version, contract)

#### Nomencraft must NOT cache

    - Input files
    - Excel contents
    - File system state
    - Output data

#### Invalidation rules

    - If template text changes → invalidate template cache
    - If pattern file changes → invalidate pattern cache
    - If pipeline definition changes → invalidate pipeline cache
    - If component code changes → invalidate component cache

#### Rationale

    Cache structure (stable), not data (volatile).
    Ensures speed without stale behavior.

### Compiled Template Storage

#### Goal

    Store parsed templates (AST) for fast reuse across runs.

#### Storage

    ~/.nomencraft/cache/templates/<hash>.json

#### Contents

    - templateHash (hash of original template text)
    - engineVersion (template engine version)
    - patternVersion (pattern file version)
    - ast (serialized template AST)

#### Invalidation

    - If template text changes → recompile
    - If engine version changes → recompile
    - If pattern version changes → recompile
    - If component version changes → recompile

#### Rationale

    Cache structure, not data.
    Ensures fast startup and zero stale behavior.

### Nomencraft Template AST

#### Node Types

    LiteralNode:
        type = "Literal"
        value = string

    VariableNode:
        type = "Variable"
        name = string
        default = optional string

    FunctionNode:
        type = "Function"
        name = string
        args = array of nodes

    TemplateNode:
        type = "Template"
        children = array of nodes

#### Rules

    - Variables and functions appear only inside {{ ... }}.
    - Arguments to functions are nodes (allowing nesting).
    - TemplateNode is the root container.
    - AST is deterministic and safe to serialize.

### Template Engine Decision

Do not embed Jinja, Liquid, or Handlebars directly.
They are too large, too web-focused, and assume HTML escaping,
string-only variables, and silent failure on missing variables.

#### Instead

    - Borrow their syntax ({{ ... }})
    - Borrow their AST concepts
    - Borrow their function-call grammar
    - Borrow their error-reporting style

#### But implement a micro-engine tailored to Nomencraft

    - Typed variables (dates, sample types, metadata)
    - Strict missing-variable errors
    - Pure deterministic functions
    - No escaping
    - No loops, blocks, or HTML features
    - Easy caching
    - Easy embedding in pattern files

#### Rationale

    Cannibalize the ideas, not the engines.

### Nomencraft Template Engine Architecture

#### Stages

    1. Tokenizer
        - Converts template text into tokens
        - Recognizes {{ }}, @var, defaults, functions, literals

    2. Parser
        - Converts tokens into an AST
        - Enforces grammar
        - Produces TemplateNode, VariableNode, FunctionNode, LiteralNode

    3. AST
        - Pure data structure
        - Safe to serialize and cache
        - Deterministic

    4. Evaluator
        - Walks the AST
        - Resolves variables
        - Applies defaults
        - Evaluates functions
        - Concatenates literals

    5. Output
        - Final filename string

#### Notes

    Variables are strings at the edges, but semantically typed internally.
    This architecture is simple, fast, and extensible.

### Alternative Reality Language Choice

#### Observation

    As Nomencraft evolves toward a templating engine, parser, AST, evaluator,
    and pluggable pipeline, the architecture resembles compiler engineering.

#### Implication

    Rust is a natural fit for this kind of system:
        - deterministic execution
        - strong typing
        - zero-cost abstractions
        - safe plugin boundaries
        - fast CLI startup
        - excellent parsing libraries
        - long-term maintainability

#### Reality

    TypeScript was the correct choice for early exploration and rapid iteration.
    Rust may be the correct choice for a future rewrite once the design stabilizes.

#### Conclusion

    Not a mistake — just a future possibility.

#### Language Reflection

#### Observation

    Nomencraft began as a fast-moving prototype. TypeScript was the right choice
    because I needed speed, flexibility, and familiarity.

#### Current Reality

    The project has evolved into a deterministic, AST-driven, pluggable pipeline
    with caching, parsing, and component contracts. This is compiler territory.

#### Implication

    Rust aligns naturally with the long-term architecture:
        - deterministic execution
        - strong typing
        - safe plugin boundaries
        - fast CLI startup
        - excellent parsing libraries
        - long-term maintainability

#### Conclusion

    TypeScript was the correct choice for exploration.
    Rust may be the correct choice for the stable, future version.
    Python and C# are less aligned with the emerging architecture.

### Incremental Rust Port Strategy

1. Port the core engine first:
    - template parser
    - AST
    - evaluator
    - pattern loader
    - cache system

2. Keep the TypeScript CLI and call into Rust via FFI or WASM.

3. Port the pipeline runtime next:
    - component contracts
    - deterministic execution

4. Keep plugins in TypeScript:
    - Rust hosts Deno for plugin execution
    - Plugins remain easy to write and maintain

5. Optional future:
    - Add WASM plugin support for multi-language extensibility

#### Rationale

    Rust provides correctness and performance.
    TypeScript provides ergonomics and extensibility.
    Incremental port avoids rewrites and preserves the ecosystem.

### Plugin Architecture Options

1. No Plugins (DSL-Only)
    - Patterns become expressive enough to replace scripting.
    - Simplest, safest, most deterministic architecture.

2. Rust Core + Embedded Scripting
    - Lua: tiny, fast, embeddable.
    - Rhai: Rust-native, safe, JS-like.
    - WASM: multi-language, sandboxed, future-proof.
    - Python: familiar but heavy.
    - TypeScript: powerful but heavy (via Deno embed).

3. Hybrid Model
    - Rust engine for performance and correctness.
    - TypeScript plugins for extensibility.
    - Most flexible, but highest complexity.

#### Conclusion

    Compiled patterns may eliminate the need for plugins entirely.
    If plugins remain desirable, Rhai or WASM are the most aligned with
    Nomencraft’s emerging architecture.

### Rhai Decision

#### Reason

    Rhai guarantees that any panic is a bug and will never panic the host.
    This aligns perfectly with Nomencraft’s deterministic, safety-first design.

#### Implications

    - Plugins cannot crash the engine.
    - Scripts run in a sandboxed, safe environment.
    - Rust integration is seamless.
    - Startup is instant.
    - Syntax is familiar (JavaScript-like).
    - No external runtime required (unlike Deno/Node/Python).

#### Conclusion

    Rhai is the ideal scripting layer for Nomencraft’s future architecture.
    It provides safety, determinism, and extensibility without runtime risk.

### Fresh CLI Replacement

#### Goal

    Replace the CLI with a Deno Fresh web interface and API layer.

#### Architecture

    - Keep the TypeScript engine unchanged.
    - Expose pipeline execution through Fresh API routes.
    - Build a UI in Fresh for selecting patterns, uploading files, and running jobs.
    - Optional: keep a thin CLI wrapper that calls the Fresh API.

#### Benefits

    - Modern UI for operators.
    - Zero-install usage.
    - API endpoints for automation.
    - Engine remains TypeScript.
    - Plugin system unaffected.

### Fresh Integration Concept

#### Goal

    Replace the CLI with a Deno Fresh web interface and API layer while keeping
    the TypeScript engine intact.

#### Architecture

    - Engine remains in TypeScript (tokenizer, parser, AST, evaluator, pipeline).
    - Fresh provides API routes that call the engine.
    - Fresh provides a UI for selecting patterns, uploading files, and running jobs.
    - Optional: CLI becomes a thin wrapper around Fresh API.
    - Plugin system remains flexible (TS, Rhai, or none).

#### Benefits

    - Operator-friendly UI.
    - Zero-install usage.
    - API endpoints for automation.
    - Engine remains unchanged.
    - Future Rust port remains possible.

### Fresh Communication Model

#### Preview

    Browser → POST /api/preview → Engine (preview mode)
    Engine returns proposed renames.
    Browser displays confirmation UI.

#### Confirm

    Browser → POST /api/execute → Engine (execute mode)
    Engine performs renames and returns results.

#### Notes

    - Engine remains pure TypeScript.
    - Fresh handles UI and API routing.
    - No state stored server-side.
    - Undo files and logs returned as JSON or downloadable blobs.
