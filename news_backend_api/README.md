# news_backend_api

Express backend API for News Hub.

## Run (dev)

```bash
npm install
npm run dev
```

The server listens on `PORT` (default `3001`).

Frontend dev server proxies `/api` to `http://localhost:3001` (see `news_frontend_app/vite.config.js`).

## Environment variables

- `PORT` (default `3001`)
- `CORS_ORIGIN` (default `*`; you can set to `http://localhost:3000`)
- `NEWS_DB_PATH` (optional; file path to SQLite database)
- `NEWS_PROVIDER` (`mock` | `newsapi`, default `mock`)
- `NEWSAPI_KEY` (required if `NEWS_PROVIDER=newsapi`)
- `NEWS_FETCH_TIMEOUT_MS` (default `12000`)

## API (summary)

- `GET /api/news?category=&q=&page=&pageSize=&country=`
- `GET /api/news/:id`
- `GET /api/favorites`
- `POST /api/favorites` body: `{ article }`
- `DELETE /api/favorites/:id`
- `GET /api/settings`
- `PUT /api/settings` body: `{ country?, defaultCategory? }`
