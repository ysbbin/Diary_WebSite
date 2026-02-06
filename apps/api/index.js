const authRoutes = require("./src/auth/auth.routes");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const { prisma } = require("./src/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
app.use("/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/db-check", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "error", message: err.message });
  }
});

// ⚠️ 개발용(DEV) 테스트 라우트: 나중에 지울 것
app.get("/dev/create-test-user", async (req, res) => {
  try {
    const email = `test_${Date.now()}@example.com`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "dummy_hash",
        name: "Test User",
      },
    });

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/dev/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, email: true, name: true, createdAt: true },
    });

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
