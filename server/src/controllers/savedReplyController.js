import SavedReply from "../models/SavedReply.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const SUPPORT_ROLES = ["agent", "manager", "admin"];
const SAVED_REPLY_SCOPES = ["PERSONAL", "DEPARTMENT", "GLOBAL"];

const isSupportUser = (user) => SUPPORT_ROLES.includes(user?.role);

const buildSearchFilter = (search) => {
  if (!search?.trim()) return {};

  const expression = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return {
    $or: [
      { title: { $regex: expression, $options: "i" } },
      { content: { $regex: expression, $options: "i" } },
    ],
  };
};

const buildVisibleFilter = (user, search) => {
  const base = {
    active: true,
    ...buildSearchFilter(search),
  };

  const visibility = [{ scope: "GLOBAL" }];

  if (user.department) {
    visibility.push({
      scope: "DEPARTMENT",
      department: user.department,
    });
  }

  visibility.push({
    scope: "PERSONAL",
    createdBy: user._id,
  });

  return {
    ...base,
    $or: visibility,
  };
};

const canManageSavedReply = (user, reply) => {
  if (!isSupportUser(user)) return false;

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "agent") {
    return (
      reply.scope === "PERSONAL" &&
      String(reply.createdBy?._id || reply.createdBy || "") === String(user._id)
    );
  }

  if (user.role === "manager") {
    if (reply.scope === "DEPARTMENT") {
      return (
        Boolean(user.department) &&
        String(reply.department?._id || reply.department || "") ===
          String(user.department)
      );
    }

    if (reply.scope === "PERSONAL") {
      return (
        String(reply.createdBy?._id || reply.createdBy || "") ===
        String(user._id)
      );
    }
  }

  return false;
};

const normalizeReply = (reply) => {
  const value = reply.toObject ? reply.toObject() : reply;

  return {
    ...value,
    scope: value.scope || "GLOBAL",
    department: value.department || null,
    createdBy: value.createdBy || null,
  };
};

export const getSavedReplies = asyncHandler(async (req, res) => {
  if (!isSupportUser(req.user)) {
    throw new AppError(
      "Saved replies are available only to support users",
      403,
    );
  }

  const search = req.query.search || "";

  let filter;

  if (req.user.role === "admin") {
    filter = {
      ...buildSearchFilter(search),
    };

    if (req.query.active === "true") {
      filter.active = true;
    } else if (req.query.active === "false") {
      filter.active = false;
    }
  } else {
    filter = buildVisibleFilter(req.user, search);
  }

  const replies = await SavedReply.find(filter)
    .populate("department", "name")
    .populate("createdBy", "name role")
    .sort({ scope: 1, title: 1, createdAt: -1 });

  res.json({
    success: true,
    data: replies.map(normalizeReply),
  });
});

export const createSavedReply = asyncHandler(async (req, res) => {
  if (!isSupportUser(req.user)) {
    throw new AppError("Only support users can create saved replies", 403);
  }

  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();

  if (!title) {
    throw new AppError("Reply title is required", 400);
  }

  if (!content) {
    throw new AppError("Reply content is required", 400);
  }

  let scope;
  let department = null;

  switch (req.user.role) {
    case "agent":
      scope = "PERSONAL";
      break;

    case "manager":
      if (!req.user.department) {
        throw new AppError("Managers must have a department", 400);
      }
      scope = "DEPARTMENT";
      department = req.user.department;
      break;

    case "admin":
      scope = "GLOBAL";
      break;

    default:
      throw new AppError("Only support users can create saved replies", 403);
  }

  const reply = await SavedReply.create({
    title,
    content,
    active: req.body.active !== false,
    scope,
    department,
    createdBy: req.user._id,
  });

  const populated = await SavedReply.findById(reply._id)
    .populate("department", "name")
    .populate("createdBy", "name role");

  res.status(201).json({
    success: true,
    data: normalizeReply(populated),
  });
});

export const updateSavedReply = asyncHandler(async (req, res) => {
  if (!isSupportUser(req.user)) {
    throw new AppError("Only support users can update saved replies", 403);
  }

  const reply = await SavedReply.findById(req.params.id);

  if (!reply) {
    throw new AppError("Saved reply not found", 404);
  }

  if (!reply.scope) {
    reply.scope = "GLOBAL";
  }

  if (!canManageSavedReply(req.user, reply)) {
    throw new AppError(
      "You are not authorized to update this saved reply",
      403,
    );
  }

  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) throw new AppError("Reply title is required", 400);
    reply.title = title;
  }

  if (req.body.content !== undefined) {
    const content = String(req.body.content).trim();
    if (!content) throw new AppError("Reply content is required", 400);
    reply.content = content;
  }

  if (req.body.active !== undefined) {
    reply.active = Boolean(req.body.active);
  }

  if (req.user.role === "admin") {
    reply.scope = "GLOBAL";
    reply.department = null;
  } else if (req.user.role === "manager") {
    reply.scope = "DEPARTMENT";
    reply.department = req.user.department;
  } else if (req.user.role === "agent") {
    reply.scope = "PERSONAL";
    reply.department = null;
    reply.createdBy = req.user._id;
  }

  await reply.save();

  const populated = await SavedReply.findById(reply._id)
    .populate("department", "name")
    .populate("createdBy", "name role");

  res.json({
    success: true,
    data: normalizeReply(populated),
  });
});

export const deleteSavedReply = asyncHandler(async (req, res) => {
  if (!isSupportUser(req.user)) {
    throw new AppError("Only support users can delete saved replies", 403);
  }

  const reply = await SavedReply.findById(req.params.id);

  if (!reply) {
    throw new AppError("Saved reply not found", 404);
  }

  if (!reply.scope) {
    reply.scope = "GLOBAL";
  }

  if (!canManageSavedReply(req.user, reply)) {
    throw new AppError(
      "You are not authorized to delete this saved reply",
      403,
    );
  }

  await reply.deleteOne();

  res.json({
    success: true,
    data: null,
  });
});

export { SAVED_REPLY_SCOPES };
