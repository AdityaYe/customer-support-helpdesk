# MERN Helpdesk Support Portal

A full-stack customer support/helpdesk application built with React, Vite, Node.js, Express, MongoDB, Redis, BullMQ, Socket.IO, and Mongoose. The app supports a guided Help Center flow, structured ticket creation, department routing, customer conversations, realtime notifications, SLA monitoring, and role-based ticket management for support teams.

## Architecture

```text
client/                 React + Vite frontend
  src/components        Shared UI states
  src/context           Auth context
  src/layouts           App shell
  src/pages             Help Center, auth, ticket pages
  src/router            Protected route wrapper
  src/services          Axios API client
  src/utils             Formatting helpers

server/                 Express API
  src/config            Environment, MongoDB, and Redis configuration
  src/controllers       Request handlers
  src/middleware        Auth, validation, errors
  src/models            Mongoose models
  src/queues            BullMQ queue definitions
  src/routes            REST routes
  src/services          Ticket workflow, access, and activity helpers
  src/seed              Development seed data
  src/utils             Shared helpers
  src/workers           Notification and SLA workers
```

## Setup

Create environment files from the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Install dependencies:

```bash
cd server
npm install

cd ../client
npm install
```

Start MongoDB and Redis locally, then seed the database:

```bash
cd server
npm run seed
```

Run the apps in separate terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Default URLs:

- Client: `http://localhost:5173`
- API health check: `http://localhost:5000/api/health`

## Environment Variables

`server/.env`

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/helpdesk
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

`client/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Seeded Test Users

All development users use password `password123`.

| Role | Email |
| --- | --- |
| Customer | `customer@example.com` |
| Billing Agent | `billing.agent@example.com` |
| Technical Agent | `tech.agent@example.com` |
| Billing Manager | `manager@example.com` |
| Admin | `admin@example.com` |

## API Overview

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Help Center:

- `GET /api/departments`
- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/request-types`
- `GET /api/request-types/:id`

Tickets:

- `POST /api/tickets`
- `GET /api/tickets/my`
- `GET /api/tickets/:id`
- `GET /api/tickets/:id/activity`
- `POST /api/tickets/:id/messages`
- `PATCH /api/tickets/:id/status`
- `PATCH /api/tickets/:id/priority`
- `PATCH /api/tickets/:id/tags`
- `POST /api/tickets/:id/assign`

Agent:

- `GET /api/agent/tickets?search=&status=&priority=&assignedTo=&page=&limit=`
- `GET /api/agent/agents`

Manager:

- `GET /api/manager/dashboard`

Saved Replies:

- `GET /api/saved-replies`
- `POST /api/saved-replies`
- `PATCH /api/saved-replies/:id`
- `DELETE /api/saved-replies/:id`

Admin:

- `GET /api/admin/summary`
- `GET /api/admin/:resource`
- `POST /api/admin/:resource`
- `PATCH /api/admin/:resource/:id`
- `DELETE /api/admin/:resource/:id`

Supported admin resources are `departments`, `categories`, `request-types`, and `users`.

## Current Feature Scope

Implemented:

- Modular Express API with centralized error handling
- MongoDB/Mongoose models for users, departments, categories, request types, tickets, messages, and ticket activity
- JWT authentication using HTTP-only cookies
- Role authorization middleware
- Seed script for initial departments, categories, request types, FAQ content, and test users
- Data-driven ticket routing through `RequestType.department`
- Human-readable ticket numbers starting at `TK-10001`
- Help Center home, category page, FAQ page, generated contact form
- Login/register pages
- Customer ticket dashboard and ticket details with replies
- Agent queue page with search, filters, pagination, and clickable ticket rows
- Role-specific ticket details page with public replies, internal notes, status controls, priority controls, assignment, internal tags, and activity history
- Saved reply insertion for support users
- Manager dashboard with department metrics, team workload, and scoped queue
- Admin dashboard for users, departments, categories, request types, knowledge base content, and saved replies
- Knowledge base publishing/unpublishing through request type `active` state
- In-app notifications with unread/read state and a notification bell
- Local development file uploads with protected attachment downloads
- Customer satisfaction feedback for resolved/closed tickets
- Lightweight manager/admin analytics
- Priority-based SLA deadlines and displayed SLA state
- BullMQ notification queue backed by Redis
- BullMQ delayed SLA breach checks backed by Redis
- Socket.IO authentication and real-time notification/ticket refresh hooks
- Focused backend API test suite

## Frontend Routes

- `/` public Help Center
- `/categories/:id` public category request list
- `/requests/:id` public FAQ article
- `/contact-support/:id` customer support form
- `/dashboard` role-aware dashboard redirect
- `/customer` customer ticket dashboard
- `/tickets/:id` shared authenticated ticket detail page
- `/saved-replies` support saved replies workspace
- `/agent` agent ticket queue
- `/manager` manager department dashboard
- `/admin` admin management console

## Ticket Lifecycle

Ticket statuses:

- `OPEN`
- `ASSIGNED`
- `IN_PROGRESS`
- `WAITING_FOR_CUSTOMER`
- `RESOLVED`
- `CLOSED`
- `REOPENED`

Allowed status transitions are enforced by the backend:

```text
OPEN -> ASSIGNED
ASSIGNED -> IN_PROGRESS
IN_PROGRESS -> WAITING_FOR_CUSTOMER or RESOLVED
WAITING_FOR_CUSTOMER -> REOPENED or RESOLVED
REOPENED -> IN_PROGRESS
RESOLVED -> CLOSED or REOPENED
```

Invalid transitions return HTTP `400` with a clear message, for example: `Ticket cannot move from OPEN directly to CLOSED.`

Priorities:

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

## Roles and Permissions

Customer:

- Can view only their own tickets
- Can see public messages only
- Can add public replies
- Cannot add internal notes, assign tickets, change status, change priority, or edit tags
- Replying to a `WAITING_FOR_CUSTOMER` ticket reopens it as `REOPENED`
- Cannot reply to `CLOSED` tickets

Agent:

- Can view and manage tickets in their own department
- Can assign tickets to themselves only
- Can add public replies and internal notes
- Can change status according to the lifecycle
- Can change priority and internal tags

Manager:

- Can view and manage tickets in their own department
- Can assign/reassign tickets to agents in the same department
- Can reply, add internal notes, change status, change priority, and edit tags
- Can view department analytics and SLA metrics

Admin:

- Can view and manage all tickets
- Can assign tickets to any valid agent
- Can manage users, departments, categories, request types, knowledge base publication state, and saved replies
- Can view global analytics and satisfaction averages

## Assignment and Activity

Assignment rules are enforced server-side:

- Agents self-assign only
- Managers assign within their department
- Admins assign to any user with the `agent` role
- Assigning an `OPEN` ticket moves it to `ASSIGNED`
- Assigning an active ticket does not overwrite `IN_PROGRESS`

Important ticket events are recorded in `TicketActivity`, including creation, assignment, reassignment, status changes, priority changes, messages, internal notes, tag changes, resolution, closing, and reopening. Customers only receive customer-safe activity records.

## Manager Dashboard

Managers are scoped to their assigned department. The dashboard shows total, open, assigned, in-progress, waiting, resolved, unassigned, and high/urgent tickets. It also shows agent workload for the manager's department and a searchable, filterable department queue.

## Admin and Knowledge Base

Admins can manage:

- Users, including support roles and department assignment
- Departments with safe deletion checks
- Categories tied to valid departments
- Request types with FAQ title/content and dynamic form fields
- Knowledge base publication using the existing request type `active` field
- Saved replies for support users

Public Help Center APIs return only active departments, categories, and request types, so unpublished knowledge base content disappears from customer-facing pages.

## Saved Replies

Saved replies are global support templates. Seeded examples include requesting a transaction ID, refund timing, browser cache troubleshooting, and resolution language. Support users can insert active saved replies into the ticket composer; only admins can create, edit, or delete saved replies.

## Notifications, Attachments, SLA, and Satisfaction

Notifications are queued through BullMQ, stored in MongoDB by the notification worker, and delivered through REST plus Socket.IO when connected. Users can list their own notifications, mark one read, or mark all read.

Attachments are stored on disk under `UPLOAD_DIR` for local development. Metadata is stored in MongoDB. Downloads are protected by ticket-level authorization. Production deployments should use persistent object storage instead of ephemeral local disk.

SLA targets are centralized by priority:

- `LOW`: first response 24h, resolution 72h
- `MEDIUM`: first response 12h, resolution 48h
- `HIGH`: first response 4h, resolution 24h
- `URGENT`: first response 1h, resolution 8h

SLA state is calculated on read as `ON_TRACK`, `AT_RISK`, `BREACHED`, or `COMPLETED`. Ticket creation schedules delayed BullMQ checks for first response and resolution deadlines. The SLA worker re-checks MongoDB before notifying assignees and department managers, so resolved and already-responded tickets are ignored.

Customers can submit one satisfaction rating from 1-5 after their ticket is resolved or closed.

## Security

- JWT auth uses HTTP-only cookies
- CORS is restricted to `CLIENT_URL`
- Helmet sets standard secure headers
- Auth routes are rate limited
- JSON request bodies are size limited
- Password hashes are never selected for normal responses
- Public registration always creates `customer` accounts
- Admin user changes validate role/department combinations
- Ticket, attachment, notification, and internal-note access is enforced server-side

## Testing

Run backend tests:

```bash
cd server
npm test
```

The focused suite covers auth, ticket routing, ticket permissions, internal notes, status workflow, assignment, notifications, attachments, satisfaction, admin authorization, and inactive knowledge base visibility.

## Production Notes

- Set a strong `JWT_SECRET`
- Set `CLIENT_URL` to the deployed frontend origin
- Configure Redis with `REDIS_HOST` and `REDIS_PORT`
- Use HTTPS so production cookies are sent securely
- Replace local uploads with persistent object storage for real deployment
- Review client dependency advisories before production release; current fixes require breaking Vite/React Router upgrades

Remaining limitations:

- No email notifications
- No object-storage integration for uploaded files
- Admin UI is functional but intentionally simple
