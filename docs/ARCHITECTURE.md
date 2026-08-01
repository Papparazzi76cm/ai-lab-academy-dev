# AI Lab Academy architecture

## Product layers

### Public experience

- Landing page
- Course catalogue
- Course detail pages
- Authentication

### Student experience

- Dashboard
- Course player
- Progress and learning streaks
- Saved prompts and resources
- Quizzes and certificates

### Administration

- Course, module and lesson management
- Block-based lesson editor
- User and enrolment management
- Publication workflow
- Analytics

### AI Lab

AI features must be implemented through provider adapters rather than directly inside UI components. This keeps the application independent from any individual model vendor.

Suggested interface:

```ts
export interface AiProvider {
  id: string;
  generateText(input: TextGenerationInput): Promise<TextGenerationResult>;
  streamText?(input: TextGenerationInput): AsyncIterable<string>;
}
```

Provider credentials must remain server-side and calls should be routed through server functions or Supabase Edge Functions.

## Recommended data model

Core entities:

- profiles
- courses
- course_instructors
- modules
- lessons
- lesson_blocks
- lesson_resources
- enrolments
- lesson_progress
- quizzes
- quiz_questions
- quiz_attempts
- certificates
- prompt_library_items
- ai_lab_sessions

Use stable UUID primary keys, `created_at` and `updated_at` timestamps, explicit ordering fields for modules, lessons and blocks, and draft/published lifecycle states.

## Security baseline

- Enable Row Level Security on all application tables.
- Students may read published content and modify only their own progress, attempts and saved resources.
- Instructors may edit only assigned courses unless they are administrators.
- Administrative privileges must be stored server-side and never inferred solely from client metadata.
- Never expose Supabase service-role keys or third-party AI secrets in `VITE_` variables.

## Performance and accessibility

- Lazy-load large administrative and course-player routes.
- Use responsive images and avoid autoplay video with sound.
- Preserve keyboard navigation, visible focus states and semantic headings.
- Respect `prefers-reduced-motion` for animations.
- Use skeletons for loading states and meaningful empty/error states.

## Delivery phases

1. Reliable UI skeleton and navigation.
2. Authentication, roles and database schema.
3. Course authoring and publication.
4. Student enrolment, progress and quizzes.
5. AI Lab provider abstraction.
6. Payments, certificates and analytics.
