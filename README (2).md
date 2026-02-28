# Adaptive Learning Tutor

**AI-Powered Personalized Education — From Diagnosis to Mastery**

A web application that acts as a complete personal tutor: it ingests your learning materials, maps the conceptual landscape, diagnoses your knowledge gaps, and guides you through adaptive practice sessions — all powered by MiniMax models.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd adaptive-tutor

# 2. Install dependencies
npm install

# 3. Set your MiniMax API key
#    Create .env.local with: MINIMAX_API_KEY=your_key_here

# 4. Seed the database
npm run seed

# 5. Start the dev server
npm run dev

# 6. Open http://localhost:3000
```
testing testing

## Architecture

Three tabs: **Chat** (AI tutor), **Learn** (adaptive practice cards), **Graph** (concept DAG visualization).

Core loop: `Chat → Study Plan → Concept Graph → Diagnosis → Practice → Graph Update → Review`
fuck
### Tech Stack

- **Frontend**: TypeScript / React / Next.js 16 (App Router)
- **Graph Viz**: React Flow (@xyflow/react)
- **LLM**: MiniMax API (via Vercel AI SDK, OpenAI-compatible)
- **Persistence**: JSON file store (hackathon) / PostgreSQL (production)
- **State**: Zustand · **Styling**: Tailwind CSS · **Validation**: Zod

## Key Algorithms

- **DAG Validation**: Kahn's algorithm for cycle detection + auto-breaking
- **Adaptive Selection**: Priority scoring (uncertainty × importance × readiness)
- **Difficulty Adaptation**: Elo-like updates targeting ~70% success rate
- **Spaced Repetition**: Modified SM-2 at the concept level

## Connecting MiniMax

Set `MINIMAX_API_KEY` in `.env.local` and uncomment the MiniMax call blocks in API routes (marked with comments). Without the key, the app uses demo fallbacks.

## License

MIT
