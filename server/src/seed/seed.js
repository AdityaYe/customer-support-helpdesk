import dotenv from "dotenv";
import mongoose from "mongoose";

import Category from "../models/Category.js";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import RequestType from "../models/RequestType.js";
import SavedReply from "../models/SavedReply.js";
import Satisfaction from "../models/Satisfaction.js";
import Ticket from "../models/Ticket.js";
import TicketActivity from "../models/TicketActivity.js";
import User from "../models/User.js";

import { connectDB } from "../config/db.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";
import { syncTicketCounter } from "../utils/ticketNumber.js";

dotenv.config();

const departmentData = [
  ["Billing", "Payments, refunds, invoices, and subscription charges."],
  ["Technical Support", "Website, application, and bug support."],
  ["Account Support", "Login, account access, and profile support."],
  [
    "Order Support",
    "Orders, deliveries, cancellations, and related questions.",
  ],
  ["Security", "Suspicious activity and account safety issues."],
];

const categoryData = [
  [
    "Payments and refunds",
    "Get help with charges, refunds, and pending payments.",
    "Billing",
  ],
  [
    "Account access",
    "Recover access or update account information.",
    "Account Support",
  ],
  [
    "Technical issues",
    "Report website, application, and bug issues.",
    "Technical Support",
  ],
  [
    "Orders and delivery",
    "Fix order, delivery, and cancellation problems.",
    "Order Support",
  ],
  [
    "Account security",
    "Report suspicious or unrecognized account activity.",
    "Security",
  ],
];

const requestTypeData = [
  [
    "Payment failed",
    "A payment did not complete successfully.",
    "Payments and refunds",
    "Billing",
    "What to do when a payment fails",
    "Check that your card details are correct, your bank has approved the transaction, and your billing address matches your payment method.",
    [
      {
        name: "transactionId",
        label: "Transaction ID",
        type: "text",
        required: false,
      },
      {
        name: "amount",
        label: "Amount",
        type: "number",
        required: false,
      },
      {
        name: "paymentMethod",
        label: "Payment Method",
        type: "select",
        required: true,
        options: ["Card", "UPI", "Net Banking", "Wallet", "Other"],
      },
    ],
  ],
  [
    "Payment charged twice",
    "You see duplicate payment charges.",
    "Payments and refunds",
    "Billing",
    "Duplicate charge help",
    "Duplicate charges can sometimes be temporary authorizations. If both charges remain, support can investigate the transaction references.",
    [
      {
        name: "firstTransactionId",
        label: "First Transaction ID",
        type: "text",
        required: true,
      },
      {
        name: "secondTransactionId",
        label: "Second Transaction ID",
        type: "text",
        required: true,
      },
    ],
  ],
  [
    "Refund request",
    "Request a refund for an eligible charge.",
    "Payments and refunds",
    "Billing",
    "Refund request policy",
    "Refund eligibility depends on the product, order state, and timing.",
    [
      {
        name: "orderId",
        label: "Order ID",
        type: "text",
        required: true,
      },
      {
        name: "refundReason",
        label: "Refund Reason",
        type: "textarea",
        required: true,
      },
    ],
  ],
  [
    "Payment pending",
    "A payment is stuck in pending state.",
    "Payments and refunds",
    "Billing",
    "Pending payment guidance",
    "Pending payments usually resolve automatically once the payment provider confirms the transaction.",
    [
      {
        name: "transactionId",
        label: "Transaction ID",
        type: "text",
        required: true,
      },
    ],
  ],

  [
    "Cannot log in",
    "You cannot access your account.",
    "Account access",
    "Account Support",
    "Login troubleshooting",
    "Reset your password, confirm you are using the correct email, and clear browser cookies.",
    [],
  ],
  [
    "Account locked",
    "Your account is locked or restricted.",
    "Account access",
    "Account Support",
    "Locked account help",
    "Accounts may be locked after repeated failed login attempts or unusual activity.",
    [],
  ],
  [
    "Change account information",
    "Update account details you cannot edit yourself.",
    "Account access",
    "Account Support",
    "Changing account information",
    "Most profile information can be changed in account settings. Protected changes may require verification.",
    [
      {
        name: "changeRequested",
        label: "Information to Change",
        type: "textarea",
        required: true,
      },
    ],
  ],
  [
    "Website not working",
    "The website is unavailable or behaving incorrectly.",
    "Technical issues",
    "Technical Support",
    "Website issue checks",
    "Try refreshing, clearing cache, disabling browser extensions, or using another browser.",
    [
      {
        name: "url",
        label: "Affected URL",
        type: "text",
        required: true,
      },
      {
        name: "browser",
        label: "Browser",
        type: "text",
        required: false,
      },
    ],
  ],
  [
    "Application error",
    "You see an application error message.",
    "Technical issues",
    "Technical Support",
    "Application error help",
    "Copy the exact error message, note what you were doing before it appeared, and include device details.",
    [
      {
        name: "errorMessage",
        label: "Error Message",
        type: "textarea",
        required: true,
      },
      {
        name: "device",
        label: "Device",
        type: "text",
        required: false,
      },
    ],
  ],
  [
    "Bug report",
    "Report a reproducible product bug.",
    "Technical issues",
    "Technical Support",
    "How to report a bug",
    "A useful bug report includes steps to reproduce, expected result, actual result, and screenshots.",
    [
      {
        name: "stepsToReproduce",
        label: "Steps to Reproduce",
        type: "textarea",
        required: true,
      },
      {
        name: "expectedResult",
        label: "Expected Result",
        type: "textarea",
        required: true,
      },
    ],
  ],

  [
    "Order problem",
    "Something is wrong with an order.",
    "Orders and delivery",
    "Order Support",
    "Order problem support",
    "Check the order details and delivery status first.",
    [
      {
        name: "orderId",
        label: "Order ID",
        type: "text",
        required: true,
      },
    ],
  ],
  [
    "Delivery issue",
    "A delivery is late, missing, or incorrect.",
    "Orders and delivery",
    "Order Support",
    "Delivery issue help",
    "Delivery updates can lag behind the carrier. Share the order ID and tracking number.",
    [
      {
        name: "orderId",
        label: "Order ID",
        type: "text",
        required: true,
      },
      {
        name: "trackingNumber",
        label: "Tracking Number",
        type: "text",
        required: false,
      },
    ],
  ],
  [
    "Cancel order",
    "Cancel an order before fulfillment.",
    "Orders and delivery",
    "Order Support",
    "Canceling an order",
    "Orders can usually be canceled before fulfillment begins.",
    [
      {
        name: "orderId",
        label: "Order ID",
        type: "text",
        required: true,
      },
    ],
  ],

  [
    "Suspicious account activity",
    "You noticed suspicious activity on your account.",
    "Account security",
    "Security",
    "Suspicious activity steps",
    "Change your password immediately, sign out of other sessions, and contact support.",
    [
      {
        name: "activityDetails",
        label: "Activity Details",
        type: "textarea",
        required: true,
      },
    ],
  ],
  [
    "Unrecognized activity",
    "You see activity you do not recognize.",
    "Account security",
    "Security",
    "Unrecognized activity help",
    "Review recent sign-ins and account changes. The security team can investigate unfamiliar activity.",
    [
      {
        name: "activityDate",
        label: "Approximate Activity Date",
        type: "date",
        required: false,
      },
      {
        name: "activityDetails",
        label: "Activity Details",
        type: "textarea",
        required: true,
      },
    ],
  ],
];

const SLA_TARGETS = {
  LOW: {
    response: 24,
    resolution: 72,
  },
  MEDIUM: {
    response: 12,
    resolution: 48,
  },
  HIGH: {
    response: 4,
    resolution: 24,
  },
  URGENT: {
    response: 1,
    resolution: 8,
  },
};

const ticketSubjects = [
  "Payment failed during checkout",
  "Duplicate charge on my account",
  "Refund has not arrived",
  "Payment still showing as pending",
  "Unable to sign in",
  "Account locked after several attempts",
  "Need to update account information",
  "Website page is not loading",
  "Application shows an unexpected error",
  "Bug encountered while submitting a form",
  "Order information looks incorrect",
  "Package has not arrived",
  "I need to cancel my order",
  "Suspicious login detected",
  "Unrecognized activity on my account",
  "Payment failed again today",
  "Refund status needs an update",
  "Account access problem after password reset",
  "Checkout page is broken",
  "Order was delivered incorrectly",
  "Security alert on recent login",
  "Unable to update profile information",
  "Mobile application keeps crashing",
  "Tracking information has not changed",
  "Duplicate billing entry",
];

const ticketDescriptions = [
  "I was trying to complete the action normally and received an unexpected result. Please review the account and let me know what happened.",
  "This started today and has happened more than once. I have already retried the same action but the issue is still present.",
  "The issue is blocking me from completing an important task. Please check the relevant records and advise on the next step.",
  "I noticed this after making a recent change to my account. Please investigate the affected record and confirm whether anything needs to be corrected.",
  "Everything worked previously, but the same workflow is now failing. I can provide additional details if required.",
];

const customFieldFor = (requestTypeName, index) => {
  switch (requestTypeName) {
    case "Payment failed":
      return {
        transactionId: `TXN-${100000 + index}`,
        amount: 49 + index * 10,
        paymentMethod: ["Card", "UPI", "Net Banking", "Wallet"][index % 4],
      };

    case "Payment charged twice":
      return {
        firstTransactionId: `TXN-${200000 + index}`,
        secondTransactionId: `TXN-${210000 + index}`,
      };

    case "Refund request":
      return {
        orderId: `ORD-${300000 + index}`,
        refundReason: "The purchase did not meet expectations.",
      };

    case "Payment pending":
      return {
        transactionId: `TXN-${400000 + index}`,
      };

    case "Cannot log in":
    case "Account locked":
      return {};

        case "Change account information":
      return {
        changeRequested: "Update my phone number and profile information.",
      };

    case "Website not working":
      return {
        url: "https://example.com/checkout",
        browser: ["Chrome", "Firefox", "Edge", "Safari"][index % 4],
      };

    case "Application error":
      return {
        errorMessage: "Unexpected application error while submitting the form.",
        device: ["Windows laptop", "MacBook", "Android phone", "iPhone"][
          index % 4
        ],
      };

    case "Bug report":
      return {
        stepsToReproduce:
          "Open the form, enter the required details, and submit.",
        expectedResult: "The request should be submitted successfully.",
      };

    case "Order problem":
    case "Cancel order":
      return {
        orderId: `ORD-${500000 + index}`,
      };

    case "Delivery issue":
      return {
        orderId: `ORD-${600000 + index}`,
        trackingNumber: `TRK-${700000 + index}`,
      };

    case "Suspicious account activity":
      return {
        activityDetails: "I noticed a login from a device I do not recognize.",
      };

    case "Unrecognized activity":
      return {
        activityDate: new Date(Date.now() - 86400000 * 2),
        activityDetails:
          "An account activity entry appeared that I did not perform.",
      };

    default:
      return {};
  }
};

const seed = async () => {
  await connectDB();

  await Promise.all([
    Message.deleteMany({}),
    Notification.deleteMany({}),
    Satisfaction.deleteMany({}),
    TicketActivity.deleteMany({}),
    Ticket.deleteMany({}),
    Counter.deleteMany({}),
    RequestType.deleteMany({}),
    SavedReply.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
    Department.deleteMany({}),
  ]);

  const departments = {};

  for (const [name, description] of departmentData) {
    departments[name] = await Department.create({
      name,
      description,
    });
  }

  const categories = {};

  for (const [name, description, departmentName] of categoryData) {
    categories[name] = await Category.create({
      name,
      description,
      department: departments[departmentName]._id,
    });
  }

  const requestTypes = {};

  for (const [
    name,
    description,
    categoryName,
    departmentName,
    faqTitle,
    faqContent,
    formFields,
  ] of requestTypeData) {
    requestTypes[name] = await RequestType.create({
      name,
      description,
      category: categories[categoryName]._id,
      department: departments[departmentName]._id,
      faqTitle,
      faqContent,
      formFields,
    });
  }

  const customerUsers = Array.from({ length: 6 }, (_, index) => ({
    name: `Customer ${index + 1}`,
    email: `customer${index + 1}@example.com`,
    password: "password123",
    role: "customer",
  }));

  const agentUsers = [
    {
      name: "Billing Agent",
      email: "billing.agent@example.com",
      password: "password123",
      role: "agent",
      department: departments.Billing._id,
    },
    {
      name: "Billing Agent 2",
      email: "billing.agent2@example.com",
      password: "password123",
      role: "agent",
      department: departments.Billing._id,
    },

    {
      name: "Tech Agent",
      email: "tech.agent@example.com",
      password: "password123",
      role: "agent",
      department: departments["Technical Support"]._id,
    },
    {
      name: "Tech Agent 2",
      email: "tech.agent2@example.com",
      password: "password123",
      role: "agent",
      department: departments["Technical Support"]._id,
    },

    {
      name: "Account Agent",
      email: "account.agent@example.com",
      password: "password123",
      role: "agent",
      department: departments["Account Support"]._id,
    },
    {
      name: "Account Agent 2",
      email: "account.agent2@example.com",
      password: "password123",
      role: "agent",
      department: departments["Account Support"]._id,
    },

    {
      name: "Order Agent",
      email: "order.agent@example.com",
      password: "password123",
      role: "agent",
      department: departments["Order Support"]._id,
    },
    {
      name: "Order Agent 2",
      email: "order.agent2@example.com",
      password: "password123",
      role: "agent",
      department: departments["Order Support"]._id,
    },

    {
      name: "Security Agent",
      email: "security.agent@example.com",
      password: "password123",
      role: "agent",
      department: departments.Security._id,
    },
    {
      name: "Security Agent 2",
      email: "security.agent2@example.com",
      password: "password123",
      role: "agent",
      department: departments.Security._id,
    },
  ];

  const managerUsers = [
    {
      name: "Billing Manager",
      email: "manager@example.com",
      password: "password123",
      role: "manager",
      department: departments.Billing._id,
    },
    {
      name: "Technical Manager",
      email: "technical.manager@example.com",
      password: "password123",
      role: "manager",
      department: departments["Technical Support"]._id,
    },
    {
      name: "Account Manager",
      email: "account.manager@example.com",
      password: "password123",
      role: "manager",
      department: departments["Account Support"]._id,
    },
    {
      name: "Order Manager",
      email: "order.manager@example.com",
      password: "password123",
      role: "manager",
      department: departments["Order Support"]._id,
    },
    {
      name: "Security Manager",
      email: "security.manager@example.com",
      password: "password123",
      role: "manager",
      department: departments.Security._id,
    },
  ];

  const createdCustomers = await User.create(customerUsers);
  const createdAgents = await User.create(agentUsers);
  const createdManagers = await User.create(managerUsers);

  const [admin] = await User.create([
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    },
  ]);

  const customers = createdCustomers;
  const agentByDepartment = {};

  for (const departmentName of Object.keys(departments)) {
    agentByDepartment[departmentName] = createdAgents.filter(
      (agent) =>
        String(agent.department) === String(departments[departmentName]._id),
    );
  }

  await SavedReply.create([
    {
      title: "Request transaction ID",
      content:
        "Could you please share the transaction ID and payment method used? This will help us locate the payment attempt quickly.",
      createdBy: admin._id,
    },
    {
      title: "Refund processing time",
      content:
        "Your refund request has been received. Approved refunds usually take 5-7 business days to reflect, depending on the payment provider.",
      createdBy: admin._id,
    },
    {
      title: "Please clear browser cache",
      content:
        "Please clear your browser cache, sign in again, and retry the same action. If the issue continues, send us the exact error message and browser name.",
      createdBy: admin._id,
    },
    {
      title: "Issue resolved",
      content:
        "We have resolved this issue from our side. Please check again and reply here if anything still looks wrong.",
      createdBy: admin._id,
    },
    {
      title: "Request additional details",
      content:
        "Could you please provide the requested details so we can investigate this further?",
      createdBy: admin._id,
    },
  ]);

  await syncTicketCounter();

  const ticketPlan = [
    ["Payment failed", "OPEN", "MEDIUM", 0, null, 0.5],
    ["Payment charged twice", "ASSIGNED", "HIGH", 1, 0, 2],
    ["Refund request", "IN_PROGRESS", "MEDIUM", 2, 1, 3],
    ["Payment pending", "WAITING_FOR_CUSTOMER", "HIGH", 3, 0, 5],
    ["Payment failed", "RESOLVED", "URGENT", 4, 0, 2],
    ["Refund request", "CLOSED", "LOW", 5, 1, 8],
    ["Payment charged twice", "REOPENED", "HIGH", 0, 1, 1],
    ["Payment pending", "OPEN", "URGENT", 1, null, 0.8],
    ["Refund request", "IN_PROGRESS", "HIGH", 2, 0, 6],
    ["Payment failed", "RESOLVED", "MEDIUM", 3, 1, 7],

    ["Website not working", "OPEN", "HIGH", 4, null, 1],
    ["Application error", "ASSIGNED", "URGENT", 5, 0, 1],
    ["Bug report", "IN_PROGRESS", "MEDIUM", 0, 1, 4],
    ["Website not working", "WAITING_FOR_CUSTOMER", "LOW", 1, 0, 2],
    ["Application error", "RESOLVED", "HIGH", 2, 1, 4],
    ["Bug report", "CLOSED", "MEDIUM", 3, 0, 10],
    ["Website not working", "REOPENED", "HIGH", 4, 1, 1],
    ["Application error", "OPEN", "URGENT", 5, null, 0.7],
    ["Bug report", "IN_PROGRESS", "HIGH", 0, 0, 5],
    ["Website not working", "RESOLVED", "LOW", 1, 1, 12],

    ["Cannot log in", "OPEN", "MEDIUM", 2, null, 1],
    ["Account locked", "ASSIGNED", "HIGH", 3, 0, 3],
    ["Change account information", "IN_PROGRESS", "LOW", 4, 1, 6],
    ["Cannot log in", "WAITING_FOR_CUSTOMER", "MEDIUM", 5, 0, 3],
    ["Account locked", "RESOLVED", "URGENT", 0, 1, 2],
    ["Change account information", "CLOSED", "LOW", 1, 1, 15],
    ["Cannot log in", "REOPENED", "HIGH", 2, 0, 1],
    ["Account locked", "OPEN", "URGENT", 3, null, 0.6],
    ["Change account information", "IN_PROGRESS", "MEDIUM", 4, 1, 5],
    ["Cannot log in", "RESOLVED", "MEDIUM", 5, 0, 9],

    ["Order problem", "OPEN", "LOW", 0, null, 2],
    ["Delivery issue", "ASSIGNED", "HIGH", 1, 0, 3],
    ["Cancel order", "IN_PROGRESS", "URGENT", 2, 1, 1],
    ["Delivery issue", "WAITING_FOR_CUSTOMER", "MEDIUM", 3, 0, 4],
    ["Order problem", "RESOLVED", "HIGH", 4, 1, 3],
    ["Cancel order", "CLOSED", "LOW", 5, 0, 18],
    ["Delivery issue", "REOPENED", "HIGH", 0, 1, 1],
    ["Order problem", "OPEN", "URGENT", 1, null, 0.9],
    ["Delivery issue", "IN_PROGRESS", "MEDIUM", 2, 0, 6],
    ["Cancel order", "RESOLVED", "MEDIUM", 3, 1, 8],

    ["Suspicious account activity", "OPEN", "URGENT", 4, null, 0.5],
    ["Unrecognized activity", "ASSIGNED", "HIGH", 5, 0, 2],
    ["Suspicious account activity", "IN_PROGRESS", "HIGH", 0, 1, 3],
    ["Unrecognized activity", "WAITING_FOR_CUSTOMER", "MEDIUM", 1, 0, 4],
    ["Suspicious account activity", "RESOLVED", "URGENT", 2, 1, 2],
    ["Unrecognized activity", "CLOSED", "MEDIUM", 3, 0, 20],
    ["Suspicious account activity", "REOPENED", "HIGH", 4, 1, 1],
    ["Unrecognized activity", "OPEN", "URGENT", 5, null, 0.7],
    ["Suspicious account activity", "IN_PROGRESS", "MEDIUM", 0, 0, 5],
    ["Unrecognized activity", "RESOLVED", "LOW", 1, 1, 14],
  ];

  const createdTickets = [];

  for (let index = 0; index < ticketPlan.length; index += 1) {
    const [
      requestTypeName,
      status,
      priority,
      customerIndex,
      agentIndex,
      ageHours,
    ] = ticketPlan[index];

    const requestType = requestTypes[requestTypeName];
    const departmentName = Object.keys(departments).find(
      (name) =>
        String(departments[name]._id) === String(requestType.department),
    );

    const department = departments[departmentName];
    const customer = customers[customerIndex % customers.length];

    const departmentAgents = agentByDepartment[departmentName];
    const assignedTo =
      agentIndex === null
        ? null
        : departmentAgents[agentIndex % departmentAgents.length];

    const sla = SLA_TARGETS[priority];

    const createdAt = new Date(Date.now() - ageHours * 60 * 60 * 1000);

    const slaResponseDueAt = new Date(
      createdAt.getTime() + sla.response * 60 * 60 * 1000,
    );

    const slaResolutionDueAt = new Date(
      createdAt.getTime() + sla.resolution * 60 * 60 * 1000,
    );

    let firstResponseAt = null;
    let resolvedAt = null;

    if (
      [
        "ASSIGNED",
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
      ].includes(status)
    ) {
      firstResponseAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
    }

    if (["RESOLVED", "CLOSED"].includes(status)) {
      resolvedAt = new Date(
        createdAt.getTime() +
          Math.min(sla.resolution - 1, Math.max(1, ageHours * 0.75)) *
            60 *
            60 *
            1000,
      );
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await Ticket.create({
      ticketNumber,
      customer: customer._id,
      department: department._id,
      category: requestType.category,
      requestType: requestType._id,

      subject: ticketSubjects[index % ticketSubjects.length],

      description: ticketDescriptions[index % ticketDescriptions.length],

      customFields: customFieldFor(requestTypeName, index),

      priority,
      status,
      assignedTo: assignedTo?._id || null,

      tags: [
        departmentName.toLowerCase().replace(/\s+/g, "-"),
        priority.toLowerCase(),
        status.toLowerCase(),
      ],

      firstResponseAt,
      resolvedAt,

      slaResponseDueAt,
      slaResolutionDueAt,

      createdAt,
      updatedAt: new Date(
        createdAt.getTime() +
          Math.min(Math.max(ageHours * 0.25, 30 / 60), ageHours) *
            60 *
            60 *
            1000,
      ),
    });

    createdTickets.push({
      ticket,
      customer,
      assignedTo,
      department,
      status,
      priority,
      index,
    });
  }

  for (const item of createdTickets) {
    const {
      ticket,
      customer,
      assignedTo,
      department,
      status,
      priority,
      index,
    } = item;

    await Message.create({
      ticket: ticket._id,
      sender: customer._id,
      message: ticket.description,
      isInternal: false,
      createdAt: new Date(ticket.createdAt.getTime() + 2 * 60 * 1000),
    });

    await TicketActivity.create({
      ticket: ticket._id,
      actor: customer._id,
      type: "TICKET_CREATED",
      toValue: ticket.ticketNumber,
      customerVisible: true,
      createdAt: ticket.createdAt,
    });

    if (assignedTo) {
      await TicketActivity.create({
        ticket: ticket._id,
        actor: assignedTo._id,
        type: "ASSIGNED",
        toValue: assignedTo._id.toString(),
        metadata: {
          assignedTo: assignedTo.name,
        },
        customerVisible: true,
        createdAt: new Date(ticket.createdAt.getTime() + 10 * 60 * 1000),
      });

      await Notification.create({
        recipient: assignedTo._id,
        ticket: ticket._id,
        type: "TICKET_ASSIGNED",
        title: "Ticket assigned",
        message: `${ticket.ticketNumber} was assigned to you.`,
        read: index % 3 === 0,
        createdAt: new Date(ticket.createdAt.getTime() + 12 * 60 * 1000),
      });
    }

    if (priority !== "MEDIUM") {
      await TicketActivity.create({
        ticket: ticket._id,
        actor: admin._id,
        type: "PRIORITY_CHANGED",
        fromValue: "MEDIUM",
        toValue: priority,
        customerVisible: true,
        metadata: {
          seeded: true,
        },
        createdAt: new Date(ticket.createdAt.getTime() + 15 * 60 * 1000),
      });
    }

    if (status !== "OPEN") {
      await TicketActivity.create({
        ticket: ticket._id,
        actor: assignedTo?._id || admin._id,
        type:
          status === "RESOLVED"
            ? "RESOLVED"
            : status === "CLOSED"
              ? "CLOSED"
              : status === "REOPENED"
                ? "REOPENED"
                : "STATUS_CHANGED",
        fromValue: "OPEN",
        toValue: status,
        customerVisible: true,
        createdAt: new Date(ticket.createdAt.getTime() + 20 * 60 * 1000),
      });
    }

    if (
      [
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
      ].includes(status) &&
      assignedTo
    ) {
      await Message.create({
        ticket: ticket._id,
        sender: assignedTo._id,
        message:
          status === "WAITING_FOR_CUSTOMER"
            ? "We need a little more information from you before we can continue."
            : status === "RESOLVED" || status === "CLOSED"
              ? "We reviewed the issue and have completed the requested support action."
              : "We are reviewing the issue and working through the next steps.",
        isInternal: false,
        createdAt: new Date(ticket.createdAt.getTime() + 40 * 60 * 1000),
      });

      await TicketActivity.create({
        ticket: ticket._id,
        actor: assignedTo._id,
        type: "MESSAGE_ADDED",
        customerVisible: true,
        createdAt: new Date(ticket.createdAt.getTime() + 40 * 60 * 1000),
      });
    }

    if (["IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED"].includes(status)) {
      await Message.create({
        ticket: ticket._id,
        sender: assignedTo?._id || admin._id,
        message:
          "Internal note: reviewed the account history and support workflow for this ticket.",
        isInternal: true,
        createdAt: new Date(ticket.createdAt.getTime() + 55 * 60 * 1000),
      });

      await TicketActivity.create({
        ticket: ticket._id,
        actor: assignedTo?._id || admin._id,
        type: "INTERNAL_NOTE_ADDED",
        customerVisible: false,
        createdAt: new Date(ticket.createdAt.getTime() + 55 * 60 * 1000),
      });
    }

    if (status === "REOPENED") {
      await TicketActivity.create({
        ticket: ticket._id,
        actor: customer._id,
        type: "REOPENED",
        fromValue: "WAITING_FOR_CUSTOMER",
        toValue: "REOPENED",
        customerVisible: true,
        createdAt: new Date(ticket.createdAt.getTime() + 2 * 60 * 60 * 1000),
      });

      if (assignedTo) {
        await Notification.create({
          recipient: assignedTo._id,
          ticket: ticket._id,
          type: "TICKET_REOPENED",
          title: "Ticket reopened",
          message: `${ticket.ticketNumber} was reopened by the customer.`,
          read: false,
          createdAt: new Date(ticket.createdAt.getTime() + 2 * 60 * 60 * 1000),
        });
      }
    }

    if (status === "RESOLVED") {
      await Notification.create({
        recipient: customer._id,
        ticket: ticket._id,
        type: "TICKET_RESOLVED",
        title: "Ticket resolved",
        message: `${ticket.ticketNumber} has been resolved.`,
        read: index % 2 === 0,
        createdAt: ticket.resolvedAt || new Date(),
      });
    }

    if (status === "CLOSED") {
      await Notification.create({
        recipient: customer._id,
        ticket: ticket._id,
        type: "TICKET_CLOSED",
        title: "Ticket closed",
        message: `${ticket.ticketNumber} has been closed.`,
        read: index % 2 === 0,
        createdAt: ticket.resolvedAt || new Date(),
      });
    }

    if (["RESOLVED", "CLOSED"].includes(status)) {
      const ratings = [5, 4, 3, 5, 2, 4, 5, 3, 4, 1];

      await Satisfaction.create({
        ticket: ticket._id,
        customer: customer._id,
        rating: ratings[index % ratings.length],
        comment:
          index % 2 === 0
            ? "The issue was handled quickly and clearly."
            : "The support team resolved the issue.",
        createdAt: new Date(
          (ticket.resolvedAt || ticket.createdAt).getTime() + 60 * 60 * 1000,
        ),
      });
    }

    if (index % 2 === 0) {
      const manager = createdManagers.find(
        (candidate) => String(candidate.department) === String(department._id),
      );

      if (manager) {
        await Notification.create({
          recipient: manager._id,
          ticket: ticket._id,
          type: "TICKET_CREATED",
          title: "New ticket created",
          message: `${ticket.ticketNumber} was created in your department.`,
          read: index % 4 === 0,
          createdAt: ticket.createdAt,
        });
      }
    }
  }

  console.log(`Seed data inserted: ${createdTickets.length} tickets`);

  console.log("Customers: 6 | Agents: 10 | Managers: 5 | Admins: 1");

  console.log(
    "Tickets include all supported statuses and priorities with SLA/satisfaction/activity data.",
  );

  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error(error);

  await mongoose.connection.close();

  process.exit(1);
});
