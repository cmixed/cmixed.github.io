# TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `src/main.js` and `blog/build.js` to TypeScript with proper type annotations.

**Architecture:** Rename files to `.ts`, add `tsconfig.json`, install TypeScript + type definitions, add interfaces and type annotations. Vite handles frontend TS natively; `tsx` runs the build script.

**Tech Stack:** TypeScript, Vite, tsx, @types/node

## Global Constraints

- Vite 6.x, Node.js 24.x
- Keep all existing functionality intact
- No new features beyond type annotations
- Build output must remain identical

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `tsconfig.json` | Create | TypeScript configuration |
| `package.json` | Modify | Add typescript, tsx, @types/node |
| `src/main.js` → `src/main.ts` | Rename + Edit | Frontend TypeScript |
| `blog/build.js` → `blog/build.ts` | Rename + Edit | Build script TypeScript |

---

### Task 1: Setup TypeScript Configuration

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing Vite project structure
- Produces: TypeScript config that Vite and tsx can use

- [ ] **Step 1: Install dependencies**

```bash
npm install -D typescript tsx @types/node
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "blog"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Update package.json scripts**

Change the `blog` script to use tsx:
```json
"blog": "tsx blog/build.ts"
```

- [ ] **Step 4: Verify TypeScript is installed**

```bash
npx tsc --version
```
Expected: Version 5.x.x

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json package.json package-lock.json
git commit -m "chore: add TypeScript configuration"
```

---

### Task 2: Migrate src/main.js to TypeScript

**Files:**
- Rename: `src/main.js` → `src/main.ts`
- Edit: `src/main.ts`

**Interfaces:**
- Consumes: none
- Produces: typed frontend code

- [ ] **Step 1: Rename the file**

```bash
mv src/main.js src/main.ts
```

- [ ] **Step 2: Add interfaces at top of file**

```typescript
interface Project {
  title: string;
  subtitle: string;
  desc: string;
  url: string;
  status: string;
  tags: string[];
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
}

interface BlogData {
  posts: BlogPost[];
  allTags: string[];
}
```

- [ ] **Step 3: Type DOM element lookups**

Replace:
```typescript
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const statusText = document.getElementById('statusText');
const footerStatus = document.getElementById('footerStatus');
```

With:
```typescript
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const html = document.documentElement;
const statusText = document.getElementById('statusText') as HTMLElement;
const footerStatus = document.getElementById('footerStatus') as HTMLElement;
```

- [ ] **Step 4: Type remaining DOM lookups**

Replace:
```typescript
const a11yToggle = document.getElementById('a11yToggle');
```

With:
```typescript
const a11yToggle = document.getElementById('a11yToggle') as HTMLButtonElement;
```

And:
```typescript
const typeElement = document.getElementById('type-text');
```

With:
```typescript
const typeElement = document.getElementById('type-text') as HTMLElement;
```

- [ ] **Step 5: Type the projects array**

```typescript
const projects: Project[] = [
  // ... existing array content unchanged
];
```

- [ ] **Step 6: Type renderProjects function**

```typescript
function renderProjects(): void {
  const grid = document.getElementById('projectsGrid') as HTMLElement;
  // ... rest unchanged
}
```

- [ ] **Step 7: Type the skills array**

```typescript
const skills: string[] = [
  // ... existing array content unchanged
];
```

- [ ] **Step 8: Type renderSkills function**

```typescript
function renderSkills(): void {
  const container = document.getElementById('skillsContainer') as HTMLElement;
  // ... rest unchanged
}
```

- [ ] **Step 9: Type loadBlogPreview function**

```typescript
async function loadBlogPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    const res = await fetch(base + 'blog/data.json');
    const data: BlogData = await res.json();
    const preview = data.posts.slice(0, 4);
    const grid = document.getElementById('blogPreviewGrid') as HTMLElement;
    // ... rest unchanged
  } catch (e) {
    (document.getElementById('blogPreviewGrid') as HTMLElement).innerHTML = '';
  }
}
```

- [ ] **Step 10: Verify build passes**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 11: Commit**

```bash
git add src/main.ts
git commit -m "refactor: migrate src/main.js to TypeScript"
```

---

### Task 3: Migrate blog/build.js to TypeScript

**Files:**
- Rename: `blog/build.js` → `blog/build.ts`
- Edit: `blog/build.ts`

**Interfaces:**
- Consumes: none
- Produces: typed build script

- [ ] **Step 1: Rename the file**

```bash
mv blog/build.js blog/build.ts
```

- [ ] **Step 2: Add interfaces at top of file**

```typescript
interface PostMeta {
  title?: string;
  date?: string;
  tags?: string[];
  description?: string;
}

interface PostInfo {
  mdPath: string;
  slug: string;
  assetsDir: string | null;
}

interface PostData {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  readTime: number;
  content: string;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}
```

- [ ] **Step 3: Type parseFrontmatter function**

```typescript
function parseFrontmatter(content: string): { meta: PostMeta; body: string } {
  // ... existing implementation unchanged
}
```

- [ ] **Step 4: Type copyDirSync function**

```typescript
function copyDirSync(src: string, dest: string): void {
  // ... existing implementation unchanged
}
```

- [ ] **Step 5: Type estimateReadTime function**

```typescript
function estimateReadTime(body: string): number {
  // ... existing implementation unchanged
}
```

- [ ] **Step 6: Type escapeXml function**

```typescript
function escapeXml(str: string): string {
  // ... existing implementation unchanged
}
```

- [ ] **Step 7: Type discoverPosts function**

```typescript
function discoverPosts(): PostInfo[] {
  // ... existing implementation unchanged
}
```

- [ ] **Step 8: Type posts array**

```typescript
const posts: PostData[] = [];
```

- [ ] **Step 9: Type the marked extension**

```typescript
marked.use({
    breaks: true,
    extensions: [{
        name: 'highlight',
        level: 'inline' as const,
        start(src: string): number | undefined { return src.match(/==/)?.index; },
        tokenizer(src: string) {
            const match = src.match(/^==(.+?)==/);
            if (match) return { type: 'highlight', raw: match[0], text: match[1] };
        },
        renderer(token: { text: string }): string { return `<mark>${token.text}</mark>`; }
    }]
});
```

- [ ] **Step 10: Verify build passes**

```bash
npm run blog
```
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 11: Commit**

```bash
git add blog/build.ts
git commit -m "refactor: migrate blog/build.js to TypeScript"
```

---

### Task 4: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full build test**

```bash
npm run build
```
Expected: Complete build succeeds

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: No type errors

- [ ] **Step 3: Verify no JS files remain in src/ and blog/**

```bash
ls src/*.js blog/*.js
```
Expected: No output (all files are .ts now)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: TypeScript migration complete"
```
