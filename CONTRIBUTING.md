# Contributing to AI Lab Academy

## Development workflow

1. Create a feature branch from `main`.
2. Install dependencies with `npm install`.
3. Run the application with `npm run dev`.
4. Before opening a pull request, run:

```bash
npm run check
```

5. Keep pull requests focused and describe the user-facing impact.

## Project principles

- Build mobile-first and preserve accessibility.
- Prefer reusable components over page-specific duplication.
- Keep course content separate from presentation components.
- Do not commit secrets or private service-role keys.
- Use Supabase Row Level Security for every user-owned table.
- Avoid coupling learning content to a single AI provider.

## Content architecture

Course material should follow this hierarchy:

`course → module → lesson → lesson blocks/resources/quizzes`

The platform should support draft and published states so new lessons can be prepared safely before release.
