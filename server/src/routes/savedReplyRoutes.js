import express from "express";

import {
  createSavedReply,
  deleteSavedReply,
  getSavedReplies,
  updateSavedReply,
} from "../controllers/savedReplyController.js";

import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("agent", "manager", "admin"));

router.get("/", getSavedReplies);

router.post("/", createSavedReply);

router.patch("/:id", updateSavedReply);

router.delete("/:id", deleteSavedReply);

export default router;
