# MetroFlow Premium (Next.js + Express + PostgreSQL)

A mobile-first transit app with a Next.js frontend and a scalable Node.js Express backend backed by PostgreSQL connection pooling.

## Stack
- Next.js (App Router)
- React
- Tailwind CSS
- Node.js + Express API
- PostgreSQL (`pg` with pooled connections)

## Pages
- `/` Home
- `/route` Route Planner
- `/route/result` Route Result
- `/live` Live Train Board
- `/map` Interactive Metro Map
- `/stations` Station List
- `/stations/[id]` Station Detail
- `/fare` Fare Calculator
- `/alerts` Service Alerts
- `/user` User Profile Creation (capsule-based multi-select UI)

## User Profile API
- `POST /api/users/profile` (multipart form data)
- `GET /api/users/profile/:email`
- `GET /api/health`

Profile fields:
- email, name, gender, age
- commute start/end station with timing
- hobbies, interests, topics to discuss (multi-select)
- job (optional), school/college (optional), profile picture (optional)

## Run locally

1) Install dependencies:
```bash
npm install
```

2) Start PostgreSQL with schema bootstrap:
```bash
docker compose up -d
```

3) Create backend env file:
```bash
cp backend/.env.example backend/.env
```

4) Run backend API:
```bash
npm run backend:dev
```

5) In a separate terminal run frontend:
```bash
npm run dev
```

Open frontend at `http://localhost:3000`.
API runs at `http://localhost:4000`.

## Deploy to Vercel
See:
- `docs/VERCEL_DEPLOYMENT.md`
