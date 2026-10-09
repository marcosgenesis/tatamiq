# Student Home consumes authenticated portal projections

## Context

The native **Student App** Home screen was initially populated with placeholder values. The backend already exposes authenticated student projections for identity and academy data (`/student/me`), graduation, attendances, monthly fees and daily fees. The next class now has its own focused projection at `/student/next-class`.

The Home screen needs real data without importing web UI or duplicating backend rules. It also needs to remain responsive when one of the secondary projections is loading or unavailable.

## Decision

- The first native Home integration will consume the existing authenticated `/student/*` endpoints through a dedicated `useStudentHome` data hook.
- The Home UI will be split into native components for the header, next class, graduation summary, attendance/fee summary and recent activity.
- `/student/me` remains the source for the **Academia**, **Aluno** and **Turmas**. The central card reads the next **Aula** from `/student/next-class`, which reuses the backend's agenda projection and returns `nextClass: null` when there is no upcoming class.
- Graduation, attendance and fee cards will render only values derived from their respective backend responses; placeholder values such as a fixed attendance count, fee status, belt degree and instructor name will be removed.
- Recent activity is a client-side presentation projection composed from the latest valid **Presença**, paid **Mensalidade** and **Promoção de Graduação** responses. It is not a new domain entity.
- TanStack Query will provide request lifecycle, caching and invalidation for the native app. A future backend home read model may consolidate these requests after measuring the need; that is not required for the first integration.

## Consequences

- The native app gets real authenticated content immediately, reusing the existing contracts and API authorization boundary.
- The Home makes several parallel requests on first load, but they are cached and independently reusable by later screens.
- A future `/student/home` endpoint can replace the hook's query composition without changing the visual components or domain vocabulary.
- The native app must show explicit loading and error states instead of silently falling back to fabricated data.
