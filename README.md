# Finances API

This repository contains a simple financial management backend built with Node.js, Express and PostgreSQL. It provides RESTful endpoints for managing users, taxes, bank accounts, categories, currencies, distributions, priorities, recipes, resumes and expenses.

## 🚀 Features

- Express.js server using ES modules
- PostgreSQL database with Docker Compose setup
- Environment variable configuration via `.env`
- API routes organized under `backend/routes`
- Swagger specification available at `swagger.json`

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for local development)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- (Optional) [GitHub CLI](https://cli.github.com/) for repo creation

## 📁 Project Structure

```
finances/
├── backend/            # application code
│   ├── routes/         # all route handlers
│   ├── Dockerfile      # container image definition for backend
│   └── server.js       # entry point
├── postgres-init/      # initialization SQL files for PostgreSQL
├── docker-compose.yml  # orchestration of Postgres, pgAdmin and backend
├── swagger.json        # API definition for documentation
├── package.json        # npm configuration
└── .env                # environment variables (not committed)
```

## ⚡ Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/<yourusername>/finances.git
   cd finances
   ```

2. **Copy `.env` template or create your own**

   ```bash
   cp .env.example .env
   # then edit to set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, etc.
   ```

3. **Launch services with Docker Compose**

   ```bash
   docker compose up -d
   ```

   - PostgreSQL will be available on `localhost:5435`
   - pgAdmin web UI on `http://localhost:5050` (use credentials from `.env`)
   - Backend server on `http://localhost:3000`

4. **Run backend locally (alternative)**

   If you prefer to run without containers:

   ```bash
   npm install
   npm run dev
   ```

   Make sure your `.env` points to a running Postgres instance.

## 📦 API Documentation

The API is described by the `swagger.json` file. You can import it into tools like [Swagger UI](https://swagger.io/tools/swagger-ui/) or [Postman](https://www.postman.com/) to explore endpoints and request/response schemas.

## ✅ Common Commands

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start backend server locally                       |
| `docker compose up`   | Spin up PostgreSQL, pgAdmin and backend containers |
| `docker compose down` | Stop and remove containers                         |

## 🧩 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/foo`)
3. Commit your changes (`git commit -am 'Add foo'`)
4. Push to the branch (`git push origin feature/foo`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

Feel free to customize this README with additional instructions or links as your project evolves.
