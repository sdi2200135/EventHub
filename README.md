# EventHub — Event Management & Online Reservations Platform

A full-stack web application for managing events and handling online ticket reservations, built with **Django REST Framework** and **React**.

> 📄 **For full details, see [`report.pdf`](./report.pdf).** This README is a short overview.

## About

Final project for the course **"Τεχνολογίες Εφαρμογών Διαδικτύου"**. EventHub lets registered users create and manage events and book tickets for other users' events, while guests can browse and search. It follows a classic **web browser / web server** architecture: a React SPA in the browser, with all business logic and data exposed via a REST API.

## Team

| Name | Student ID |
|---|---|
| Παπαθανασίου Ελένη | 1115202200135 |
| Τσάκωνας Βασίλης | 1115202200245 |

**Group:** Users 5 · **eclass:** Τεχνολογίες Εφαρμογών Διαδικτύου

## Roles

| Role | Source | Description |
|---|---|---|
| **Guest** | Not logged in | Browse & search only |
| **User** | `is_staff = false` | Organizer **and** Attendee |
| **Admin** | `is_staff = true` | User actions + management |

## Tech Stack

- **Backend:** Django, Django REST Framework, PostgreSQL (Neon), SimpleJWT, django-filter
- **Frontend:** React 18, React Router v6, Axios, Vite, custom CSS, Material UI Icons
- **Security:** TLS 1.3 on both channels, self-signed certificates via OpenSSL

## Key Features

- **JWT authentication** with `sessionStorage` + Axios auto-refresh interceptor
- **Event wizard** (Details → Ticket Types → Photos) with live capacity validation
- **Race-safe bookings** via `select_for_update()` inside transactions
- **Soft-delete messaging** (Inbox/Sent, unread badges, per-user deletion)
- **Biased Matrix Factorization** recommender implemented from scratch
- **XML/JSON export** for admins, validated against a DTD
- **End-to-end TLS** with hardened cookies and restricted CORS/CSRF origins

## Project Structure

| Path | Description |
|---|---|
| `backend/` | Django app (models, serializers, views, services) |
| `frontend/` | React SPA (context, components, pages, services) |
| `scripts/` | `install_requirements.sh`, `make_certs.sh` |
| `report.pdf` | Full technical report |

## Quick Start

**Prerequisites:** Python 3.10+ with `venv`, Node.js 24+.

```bash 
# 1. Install dependencies & generate TLS certs
sh ./scripts/install_requirements.sh

# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Run backend (terminal 1)
cd backend && source venv/bin/activate
python manage.py runserver_plus --cert-file ../scripts/cert.pem --key-file ../scripts/key.pem --threaded

# 4. Run frontend (terminal 2)
cd frontend && npm run dev
```

Open **https://localhost:5173** and accept the certificate warning at **both** `https://localhost:5173` and `https://localhost:8000/api`. See `instructions.txt` for demo credentials.

## Documentation

- **Architecture, roles, DB schema, API endpoints, recommender, security** → [`report.pdf`](./report.pdf)
- **Setup details & demo accounts** → `instructions.txt`
