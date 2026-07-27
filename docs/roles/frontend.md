# Frontend Guidelines (`/frontend`)

## Tech Stack

Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion, `@react-three/fiber`, React Hook Form, Zod.

## Platform Style

High-performance, premium SaaS UI (dark mode, glassmorphism, 3D spatial elements). See [autonomy.md](../autonomy.md) for the visual bar (Linear/Vercel/Stripe style, deep dark backgrounds, no generic AI-looking templates).

## Applies here

- [architecture.md](../architecture.md) ##3 Front-to-Back Symmetry -- Zod schemas mirror the backend's DRF Serializers; a single, unified `apiClient.ts` utility class handles all network requests and maps `400` field errors inline.
- [architecture.md](../architecture.md) ##4 DRY -- centralized UI components live in `/components/ui/`.
- [engineering-standards.md](../engineering-standards.md) ##1, ##2 -- `npm run lint`; Vitest/React Testing Library coverage for business logic and forms.

## Terminal Commands

- Start frontend: `cd frontend && npm run dev`
