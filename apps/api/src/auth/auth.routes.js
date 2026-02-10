const express = require("express");
const { signup, login, me, logout } = require("./auth.controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);

router.post("/logout", logout); 

module.exports = router;