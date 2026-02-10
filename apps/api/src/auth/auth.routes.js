const express = require("express");
const { signup, login, me } = require("./auth.controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout); // ✅ 추가
router.get("/me", requireAuth, me);

module.exports = router;