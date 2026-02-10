const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  createEvent,
  listMyEvents,
  updateEvent,
  deleteEvent,
} = require("./events.controller");

const router = express.Router();

router.post("/", requireAuth, createEvent);
router.get("/", requireAuth, listMyEvents);
router.patch("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);


module.exports = router;
