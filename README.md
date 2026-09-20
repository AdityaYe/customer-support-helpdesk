# MERN Helpdesk Support Portal

A full-stack customer support and helpdesk platform built with React, Node.js, Express, MongoDB, Redis, BullMQ, and Socket.IO.

The application provides a customer-facing Help Center, structured ticket creation, department-based routing, support workflows, real-time notifications, SLA monitoring, attachments, saved replies, analytics, and role-based access control.

## Features

### Customer Support

- Public Help Center with categories, FAQs, search, and dynamic request forms
- Guided ticket creation with department and request-type routing
- Customer ticket dashboard and ticket conversations
- Public replies and satisfaction ratings
- Protected ticket attachments

### Support Operations

- Agent ticket queue with search, filters, pagination, and assignment
- Department-scoped access for agents and managers
- Ticket status and priority workflows
- Internal notes, tags, and activity history
- Saved replies for common support responses

### Management

- Manager dashboard with department metrics and team workload
- Admin dashboard for users, departments, categories, request types, and knowledge base content
- Role-based access control for customer, agent, manager, and admin workflows

### Real-Time & Background Processing

- Socket.IO for real-time ticket and notification updates
- Redis + BullMQ for asynchronous notification processing
- BullMQ delayed jobs for SLA breach checks
- Priority-based SLA targets and monitoring

## Tech Stack

### Frontend

- React 18
- React Router
- Vite
- Tailwind CSS
- Axios
- Socket.IO Client
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Socket.IO
- BullMQ
- Redis / ioredis
- Multer

### Testing

- Vitest
- Supertest
- MongoDB test database

## Architecture

```text
client/
└── React + Vite frontend
    ├── components/
    ├── context/
    ├── layouts/
    ├── pages/
    ├── router/
    ├── services/
    └── utils/

server/
└── Express API
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── queues/
    ├── routes/
    ├── services/
    ├── workers/
    ├── tests/
    └── utils/
```

## Roles

| Role     | Main Responsibilities                                                                         |
| -------- | --------------------------------------------------------------------------------------------- |
| Customer | Create and track tickets, reply to support, submit satisfaction feedback                      |
| Agent    | Manage tickets within their department, reply, add internal notes, update status and priority |
| Manager  | Manage department tickets, assign agents, monitor workload and SLA performance                |
| Admin    | Manage users, departments, categories, request types, knowledge base, and saved replies       |

## Ticket Workflow

Supported statuses:

```text
OPEN
ASSIGNED
IN_PROGRESS
WAITING_FOR_CUSTOMER
RESOLVED
CLOSED
REOPENED
```

Supported priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

Ticket transitions and permissions are enforced server-side.

## SLA Monitoring

SLA targets are based on ticket priority:

| Priority | First Response | Resolution |
| -------- | -------------- | ---------- |
| LOW      | 24h            | 72h        |
| MEDIUM   | 12h            | 48h        |
| HIGH     | 4h             | 24h        |
| URGENT   | 1h             | 8h         |

Ticket creation schedules delayed SLA checks through BullMQ and Redis. Workers re-check the latest ticket state before generating breach notifications.

Changing ticket priority also recalculates the SLA deadlines and schedules the corresponding checks.

## Notifications

Notifications are:

- Queued through BullMQ
- Persisted in MongoDB
- Delivered in real time through Socket.IO
- Sent by email through Resend
- Available through the notification REST API
- Tracked with read/unread state

This keeps notification processing separate from the main request cycle.

## Attachments

- Multi-file ticket attachments
- File type and size validation
- Cloudinary object storage
- Ticket-level authorization
- Internal attachment visibility controls
- Protected attachment access

## Setup

### Prerequisites

Make sure the following are installed and running locally:

- Node.js
- MongoDB
- Redis

### 1. Clone the Repository

```bash
git clone https://github.com/AdityaYe/customer-support-helpdesk.git
cd customer-support-helpdesk
```

### 2. Configure Environment Variables

Create the environment files from the provided examples.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

#### Server

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/helpdesk
JWT_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:5173
REDIS_URL=
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### Client

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd ../client
npm install
```

### 4. Seed Development Data

Start MongoDB and Redis first, then run:

```bash
cd ../server
npm run seed
```

### 5. Start the Application

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd client
npm run dev
```

The application will be available at:

```text
Frontend: http://localhost:5173
API:      http://localhost:5000
Health:   http://localhost:5000/api/health
```

## Demo Accounts

The seed script creates users for each application role.

> These credentials are for local development and demonstration only.

| Role            | Email                       |
| --------------- | --------------------------- |
| Customer        | `customer@example.com`      |
| Billing Agent   | `billing.agent@example.com` |
| Technical Agent | `tech.agent@example.com`    |
| Manager         | `manager@example.com`       |
| Admin           | `admin@example.com`         |

Default seeded password:

```text
password123
```

## Frontend Routes

| Route                  | Purpose                       |
| ---------------------- | ----------------------------- |
| `/`                    | Public Help Center            |
| `/categories/:id`      | Category request list         |
| `/requests/:id`        | FAQ article                   |
| `/contact-support/:id` | Customer support form         |
| `/dashboard`           | Role-aware dashboard redirect |
| `/customer`            | Customer ticket dashboard     |
| `/tickets/:id`         | Ticket details                |
| `/saved-replies`       | Saved replies workspace       |
| `/agent`               | Agent ticket queue            |
| `/manager`             | Manager dashboard             |
| `/admin`               | Admin management console      |

## Testing

Run the backend test suite:

```bash
cd server
npm test
```

The test suite covers:

- Authentication
- Ticket creation and routing
- Role-based permissions
- Assignment and workflow rules
- Notifications
- Attachments
- Satisfaction feedback
- Admin authorization
- Knowledge base visibility
- SLA deadline generation

## Security

The application includes:

- JWT authentication with HTTP-only cookies
- Role-based authorization
- Department-level ticket access control
- Helmet security headers
- CORS restrictions
- Authentication rate limiting
- Request body size limits
- Protected attachment downloads
- Server-side validation of ticket operations
- Password hashing with bcrypt

## Project Structure

```text
customer-support-helpdesk/
├── client/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── workers/
│   │   └── tests/
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Production Considerations

Before deploying to production:

- Use a strong `JWT_SECRET`
- Configure production MongoDB and Redis instances
- Set `CLIENT_URL` to the deployed frontend origin
- Run the application over HTTPS
- Replace local file uploads with persistent object storage
- Review dependency security advisories
- Replace seeded demo credentials with real accounts

## Current Limitations

- Admin interface is intentionally lightweight
- No production deployment configuration is included
- Email and Cloudinary integrations require their respective provider accounts and credentials

## Project Status

The project currently includes:

- MERN architecture
- Redis + BullMQ background processing
- Real-time Socket.IO updates
- SLA monitoring
- Role-based support workflows
- Customer Help Center
- Agent, manager, and admin workspaces
- Knowledge base management
- Saved replies
- Ticket activity and internal notes
- Resend email notifications
- Cloudinary attachment storage
- Backend integration tests

## License

This project is intended as a portfolio and demonstration project.
