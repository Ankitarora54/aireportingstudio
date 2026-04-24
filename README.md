# AI Reporting Studio

Local development uses:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:5000`

## Environment config

Backend env values live in `backend/.env` and can be copied from the root `.env.example`.

- `OPENAI_API_KEY`: OpenAI API key for commentary generation
- `OPENAI_MODEL`: OpenAI model name
- `OPENAI_TEMPERATURE`: commentary generation temperature
- `OPENAI_MAX_TOKENS`: max completion tokens for commentary generation
- `OPENAI_TIMEOUT_MS`: request timeout for commentary generation
- `OPENAI_MAX_RETRIES`: retry count for commentary generation
- `PORT`: backend server port
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend URLs allowed to call the backend
- `LANGSMITH_TRACING`: enable or disable LangSmith tracing
- `LANGSMITH_API_KEY`: LangSmith API key
- `LANGSMITH_PROJECT`: LangSmith project name for traces
- `LANGSMITH_TAGS`: comma-separated tags to attach to traces
- `LANGCHAIN_CALLBACKS_BACKGROUND`: set `false` for serverless if you need tracing flushed before exit

Frontend env values live in `frontend/.env` and can be copied from `frontend/.env.example`.

- `VITE_API_BASE_URL`: API base URL used by the browser
- `VITE_DEV_API_PROXY_TARGET`: backend URL used by the local Vite dev proxy

Example deployment setup:

- Vercel frontend: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`
- Render backend: `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`

## Run locally

One command from the project root:

```powershell
npm install
npm run dev
```

Or open two terminals.

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

If you want AI-generated commentary, copy `.env.example` to `backend/.env` and set `OPENAI_API_KEY`. For local frontend config, copy `frontend/.env.example` to `frontend/.env`. Without an API key, the backend will still run and return a fallback commentary.
