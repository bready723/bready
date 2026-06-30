# bready

빵 추천/기록 개인 앱 (React + Vite PWA). 랭킹 엔진 + 번역기 + 지도.

## Stack
- React 18, Vite 6, JavaScript
- Test: Vitest (`npm test`, `npm run test:watch`)
- Package manager: npm
- 로컬 전용 데이터(localStorage), 다음 단계 = Supabase + Vercel 배포

## Structure
- `src/screens/` — 화면 컴포넌트 (Rankings, MapView, Translator, BakeryDetail, LogVisit, WantToTry)
- `src/lib/` — 로직 (ranking, breads, geo, maps, translate, storage, phrasebook)
- `src/lib/*.test.js` — 테스트

## AI-dev workflow rules (trial)
- **Never implement from a vague request.** If a task lacks clear acceptance criteria, ask 5W1H
  clarifying questions before writing any code. Use the `/intake` command to turn a one-line ask
  into a build-ready spec first.
- **Spec-driven (OpenSpec):** for non-trivial changes, create an OpenSpec change proposal under
  `openspec/changes/` (propose → review → apply → archive). `openspec/specs/` is current truth.
- **After implementing, always write/maintain tests so coverage stays above the threshold.**
  Commits that drop coverage below the threshold are blocked by the pre-commit gate. Trust the gate.

## Safety
- Never commit secrets — `.env*` is gitignored (Supabase keys go there).
