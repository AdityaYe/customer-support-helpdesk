import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import Attachment from "../models/Attachment.js";
import Category from "../models/Category.js";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import RequestType from "../models/RequestType.js";
import Satisfaction from "../models/Satisfaction.js";
import SavedReply from "../models/SavedReply.js";
import Ticket from "../models/Ticket.js";
import TicketActivity from "../models/TicketActivity.js";
import User from "../models/User.js";
import redisConnection from "../config/redis.js";
import { notificationQueue } from "../queues/notificationQueue.js";
import { slaQueue } from "../queues/slaQueue.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "helpdesk-test-uploads");

let notificationWorker;
let slaWorker;
let billing;
let technical;
let billingCategory;
let techCategory;
let paymentFailed;
let techIssue;

const resetDb = async () => {
  await Promise.all([
    Attachment.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    Satisfaction.deleteMany({}),
    SavedReply.deleteMany({}),
    TicketActivity.deleteMany({}),
    Ticket.deleteMany({}),
    Counter.deleteMany({}),
    RequestType.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
    Department.deleteMany({}),
  ]);

  billing = await Department.create({
    name: "Billing",
    description: "Billing help",
  });
  technical = await Department.create({
    name: "Technical Support",
    description: "Technical help",
  });
  billingCategory = await Category.create({
    name: "Payments",
    description: "Payment help",
    department: billing._id,
  });
  techCategory = await Category.create({
    name: "Technical",
    description: "Technical help",
    department: technical._id,
  });
  paymentFailed = await RequestType.create({
    name: "Payment failed",
    description: "Payment did not work",
    category: billingCategory._id,
    department: billing._id,
    faqTitle: "Payment failed FAQ",
    faqContent: "Check your payment method.",
    formFields: [
      {
        name: "paymentMethod",
        label: "Payment Method",
        type: "text",
        required: true,
      },
    ],
  });
  techIssue = await RequestType.create({
    name: "Website not working",
    description: "Site issue",
    category: techCategory._id,
    department: technical._id,
    faqTitle: "Website issue FAQ",
    faqContent: "Clear cache.",
    formFields: [],
  });

  await User.create([
    {
      name: "Customer One",
      email: "customer1@example.com",
      password: "password123",
      role: "customer",
    },
    {
      name: "Customer Two",
      email: "customer2@example.com",
      password: "password123",
      role: "customer",
    },
    {
      name: "Billing Agent",
      email: "billing.agent@example.com",
      password: "password123",
      role: "agent",
      department: billing._id,
    },
    {
      name: "Billing Agent Two",
      email: "billing.agent2@example.com",
      password: "password123",
      role: "agent",
      department: billing._id,
    },
    {
      name: "Tech Agent",
      email: "tech.agent@example.com",
      password: "password123",
      role: "agent",
      department: technical._id,
    },
    {
      name: "Billing Manager",
      email: "manager@example.com",
      password: "password123",
      role: "manager",
      department: billing._id,
    },
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    },
  ]);
};

const login = async (email) => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password: "password123" })
    .expect(200);
  return agent;
};

const createTicket = async (agent = null, requestType = paymentFailed) => {
  const customer = agent || (await login("customer1@example.com"));
  const res = await customer
    .post("/api/tickets")
    .send({
      requestType: requestType._id,
      subject: "Test ticket",
      description: "Ticket description",
      customFields: { paymentMethod: "Card" },
    })
    .expect(201);
  return res.body.data;
};

const waitForNotifications = async (filter, expectedCount = 1) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const notifications = await Notification.find(filter);
    if (notifications.length >= expectedCount) return notifications;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return Notification.find(filter);
};

beforeAll(async () => {
  await mongoose.connect(
    process.env.MONGODB_TEST_URI ||
      'mongodb://127.0.0.1:27017/helpdesk_test'
  );
  notificationWorker = (await import("../workers/notificationWorker.js")).default;
  slaWorker = (await import("../workers/slaWorker.js")).default;
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await notificationWorker?.close();
  await slaWorker?.close();
  await notificationQueue.close();
  await slaQueue.close();
  await redisConnection.quit();
});

describe("auth", () => {
  it("registers customers and ignores privileged public role attempts", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "New User",
        email: "new@example.com",
        password: "password123",
        role: "admin",
      })
      .expect(201);

    expect(res.body.user.role).toBe("customer");
  });

  it("logs in and rejects invalid login/protected unauthenticated access", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "customer1@example.com", password: "password123" })
      .expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "customer1@example.com", password: "badpass" })
      .expect(401);
    await request(app).get("/api/auth/me").expect(401);
  });
});

describe("tickets", () => {

  it('prevents agents from taking or modifying another agent ticket', async () => {
  const customer = await login(
    'customer1@example.com'
  );

  const billingAgent = await login(
    'billing.agent@example.com'
  );

  const billingAgentTwo = await login(
    'billing.agent2@example.com'
  );

  const ticket = await createTicket(customer);

  await billingAgent
    .post(`/api/tickets/${ticket._id}/assign`)
    .send({})
    .expect(200);

  await billingAgentTwo
    .get(`/api/tickets/${ticket._id}`)
    .expect(200);

  await billingAgentTwo
    .post(`/api/tickets/${ticket._id}/assign`)
    .send({})
    .expect(403);

  await billingAgentTwo
    .post(`/api/tickets/${ticket._id}/messages`)
    .send({
      message: 'I should not be able to reply'
    })
    .expect(403);

  await billingAgentTwo
    .patch(`/api/tickets/${ticket._id}/priority`)
    .send({ priority: 'URGENT' })
    .expect(403);

  await billingAgentTwo
    .patch(`/api/tickets/${ticket._id}/status`)
    .send({ status: 'IN_PROGRESS' })
    .expect(403);

  await billingAgent
    .patch(`/api/tickets/${ticket._id}/priority`)
    .send({ priority: 'HIGH' })
    .expect(200);
});

  it("creates routed tickets with unique atomic ticket numbers and SLA deadlines", async () => {
    const customer = await login("customer1@example.com");

    const responses = await Promise.all(
      Array.from({ length: 3 }).map(() => createTicket(customer)),
    );

    const numbers = responses.map((ticket) => ticket.ticketNumber);

    expect(new Set(numbers).size).toBe(3);
    expect(responses[0].department.name).toBe("Billing");
    expect(responses[0].category.name).toBe("Payments");
    expect(responses[0].slaResponseDueAt).toBeTruthy();
    expect(responses[0].slaResolutionDueAt).toBeTruthy();
  });

  it("enforces ticket visibility and strict agent work permissions", async () => {
    const customer = await login("customer1@example.com");
    const otherCustomer = await login("customer2@example.com");
    const billingAgent = await login("billing.agent@example.com");
    const techAgent = await login("tech.agent@example.com");

    const ticket = await createTicket(customer);

    await customer.get(`/api/tickets/${ticket._id}`).expect(200);

    await otherCustomer.get(`/api/tickets/${ticket._id}`).expect(403);

    await techAgent.get(`/api/tickets/${ticket._id}`).expect(403);

    await billingAgent.get(`/api/tickets/${ticket._id}`).expect(200);

    await billingAgent
      .post(`/api/tickets/${ticket._id}/messages`)
      .send({
        message: "Internal note before assignment",
        isInternal: true,
      })
      .expect(403);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/priority`)
      .send({ priority: "HIGH" })
      .expect(403);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "CLOSED" })
      .expect(403);

    const customerMessage = await customer
      .post(`/api/tickets/${ticket._id}/messages`)
      .send({
        message: "Customer note",
        isInternal: true,
      })
      .expect(201);

    expect(customerMessage.body.data.isInternal).toBe(false);

    const assigned = await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    expect(assigned.body.data.assignedTo._id).toBe(
      (
        await User.findOne({
          email: "billing.agent@example.com",
        })
      )._id.toString(),
    );

    expect(assigned.body.data.status).toBe("ASSIGNED");

    const internal = await billingAgent
      .post(`/api/tickets/${ticket._id}/messages`)
      .send({
        message: "Internal note after assignment",
        isInternal: true,
      })
      .expect(201);

    expect(internal.body.data.isInternal).toBe(true);
  });

  it("enforces assignment, priority, and status workflow", async () => {
    const customer = await login("customer1@example.com");
    const billingAgent = await login("billing.agent@example.com");

    const ticket = await createTicket(customer);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "CLOSED" })
      .expect(403);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/priority`)
      .send({ priority: "HIGH" })
      .expect(403);

    const assigned = await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    expect(assigned.body.data.status).toBe("ASSIGNED");

    expect(assigned.body.data.assignedTo).toBeTruthy();

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "CLOSED" })
      .expect(400);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/priority`)
      .send({ priority: "HIGH" })
      .expect(200);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "IN_PROGRESS" })
      .expect(200);

    const resolved = await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "RESOLVED" })
      .expect(200);

    expect(resolved.body.data.resolvedAt).toBeTruthy();
  });

  it("prevents agents from taking or modifying another agent ticket", async () => {
    const customer = await login("customer1@example.com");
    const billingAgent = await login("billing.agent@example.com");
    const billingAgentTwo = await login("billing.agent2@example.com");
    const ticket = await createTicket(customer);

    await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    await billingAgentTwo.get(`/api/tickets/${ticket._id}`).expect(200);

    await billingAgentTwo
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(403);

    await billingAgentTwo
      .post(`/api/tickets/${ticket._id}/messages`)
      .send({
        message: "I should not be able to reply",
      })
      .expect(403);

    await billingAgentTwo
      .patch(`/api/tickets/${ticket._id}/priority`)
      .send({ priority: "URGENT" })
      .expect(403);

    await billingAgentTwo
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "IN_PROGRESS" })
      .expect(403);

    await billingAgent
      .patch(`/api/tickets/${ticket._id}/priority`)
      .send({ priority: "HIGH" })
      .expect(200);
  });

  it("prevents repeated self-assignment from creating duplicate activity or notifications", async () => {
    const customer = await login("customer1@example.com");
    const billingAgent = await login("billing.agent@example.com");

    const ticket = await createTicket(customer);

    await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    const activitiesAfterFirst = await TicketActivity.find({
      ticket: ticket._id,
      type: {
        $in: ["ASSIGNED", "REASSIGNED"],
      },
    });

    const notificationsAfterFirst = await waitForNotifications({
      ticket: ticket._id,
      recipient: (
        await User.findOne({
          email: "billing.agent@example.com",
        })
      )._id,
      type: "TICKET_ASSIGNED",
    });

    expect(activitiesAfterFirst).toHaveLength(1);

    expect(notificationsAfterFirst).toHaveLength(1);

    await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    const activitiesAfterSecond = await TicketActivity.find({
      ticket: ticket._id,
      type: {
        $in: ["ASSIGNED", "REASSIGNED"],
      },
    });

    const notificationsAfterSecond = await waitForNotifications({
      ticket: ticket._id,
      recipient: (
        await User.findOne({
          email: "billing.agent@example.com",
        })
      )._id,
      type: "TICKET_ASSIGNED",
    });

    expect(activitiesAfterSecond).toHaveLength(1);

    expect(notificationsAfterSecond).toHaveLength(1);
  });
});

describe("notifications, attachments, satisfaction, admin, and knowledge base", () => {
  it("creates notifications and lets users read only their own", async () => {
    const customer = await login("customer1@example.com");
    const billingAgent = await login("billing.agent@example.com");
    const ticket = await createTicket(customer);
    await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);

    await waitForNotifications({
      ticket: ticket._id,
      type: "TICKET_ASSIGNED",
    });

    const notifications = await billingAgent
      .get("/api/notifications")
      .expect(200);
    expect(notifications.body.data.unreadCount).toBeGreaterThan(0);
    const notificationId = notifications.body.data.notifications[0]._id;
    await billingAgent
      .patch(`/api/notifications/${notificationId}/read`)
      .expect(200);
    await customer
      .patch(`/api/notifications/${notificationId}/read`)
      .expect(404);
  });

  it("protects attachments by ticket authorization", async () => {
    const customer = await login("customer1@example.com");
    const otherCustomer = await login("customer2@example.com");
    const ticket = await createTicket(customer);
    const fixture = path.resolve("src/tests/fixtures/support-note.txt");

    const upload = await customer
      .post(`/api/tickets/${ticket._id}/attachments`)
      .attach("attachments", fixture)
      .expect(201);
    const attachmentId = upload.body.data[0]._id;
    await customer
      .get(`/api/tickets/${ticket._id}/attachments/${attachmentId}`)
      .expect(200);
    await otherCustomer
      .get(`/api/tickets/${ticket._id}/attachments/${attachmentId}`)
      .expect(403);

    const storedPath = upload.body.data[0].path;
    if (storedPath && fs.existsSync(storedPath)) fs.unlinkSync(storedPath);
  });

  it("returns a clean error when an attachment file is missing", async () => {
    const customer = await login("customer1@example.com");
    const ticket = await createTicket(customer);
    const fixture = path.resolve("src/tests/fixtures/support-note.txt");

    const upload = await customer
      .post(`/api/tickets/${ticket._id}/attachments`)
      .attach("attachments", fixture)
      .expect(201);
    const attachment = upload.body.data[0];
    if (attachment.path && fs.existsSync(attachment.path))
      fs.unlinkSync(attachment.path);

    const res = await customer
      .get(`/api/tickets/${ticket._id}/attachments/${attachment._id}`)
      .expect(404);
    expect(res.body.message).toBe("Attachment file is missing");
  });

  it("allows eligible satisfaction once and blocks unauthorized feedback", async () => {
    const customer = await login("customer1@example.com");
    const otherCustomer = await login("customer2@example.com");
    const billingAgent = await login("billing.agent@example.com");
    const ticket = await createTicket(customer);

    await billingAgent
      .post(`/api/tickets/${ticket._id}/assign`)
      .send({})
      .expect(200);
    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "IN_PROGRESS" })
      .expect(200);
    await billingAgent
      .patch(`/api/tickets/${ticket._id}/status`)
      .send({ status: "RESOLVED" })
      .expect(200);

    await otherCustomer
      .post(`/api/tickets/${ticket._id}/satisfaction`)
      .send({ rating: 5 })
      .expect(403);
    await customer
      .post(`/api/tickets/${ticket._id}/satisfaction`)
      .send({ rating: 4, comment: "Good help" })
      .expect(201);
    await customer
      .post(`/api/tickets/${ticket._id}/satisfaction`)
      .send({ rating: 5 })
      .expect(409);
  });

  it("protects admin APIs and hides inactive request types publicly", async () => {
    const customer = await login("customer1@example.com");
    const manager = await login("manager@example.com");
    const admin = await login("admin@example.com");

    await customer.get("/api/admin/summary").expect(403);
    await manager.get("/api/admin/summary").expect(403);
    await admin.get("/api/admin/summary").expect(200);

    await admin
      .patch(`/api/admin/request-types/${techIssue._id}`)
      .send({ active: false })
      .expect(200);
    const publicResults = await customer
      .get("/api/request-types?search=Website")
      .expect(200);
    expect(publicResults.body.data).toHaveLength(0);
  });

  it("hides inactive saved replies from support users even when requested", async () => {
    const billingAgent = await login("billing.agent@example.com");
    const admin = await login("admin@example.com");

    const visible = await SavedReply.create({
      title: "Visible reply",
      content: "Use this reply",
    });
    const inactive = await SavedReply.create({
      title: "Inactive reply",
      content: "Do not show",
      active: false,
    });

    const supportReplies = await billingAgent
      .get("/api/saved-replies?active=false")
      .expect(200);
    expect(supportReplies.body.data.map((reply) => reply._id)).toContain(
      visible._id.toString(),
    );
    expect(supportReplies.body.data.map((reply) => reply._id)).not.toContain(
      inactive._id.toString(),
    );

    const adminReplies = await admin
      .get("/api/saved-replies?active=false")
      .expect(200);
    expect(adminReplies.body.data.map((reply) => reply._id)).toContain(
      inactive._id.toString(),
    );
  });
});
