const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../db");

/**
 * 회원가입
 * POST /auth/signup
 */
async function signup(req, res) {
  try {
    const { email, password, name } = req.body;

    // 1) 유효성 체크
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "email and password are required",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        ok: false,
        message: "invalid payload",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "password must be at least 6 characters",
      });
    }

    // 2) 이메일 중복 체크
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "email already in use",
      });
    }

    // 3) 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 4) 유저 생성
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name: name || null,

            // ✅ 회원가입 시 개인 캘린더 자동 생성
            calendarsOwned: {
            create: {
                type: "personal",
                name: "My Calendar",
                members: {
                create: {
                    role: "owner",
                    user: {
                    // 방금 생성되는 유저를 연결
                    connect: { email },
                    },
                },
                },
            },
            },
        },
        select: { id: true, email: true, name: true, createdAt: true },
    });

    return res.status(201).json({
      ok: true,
      user,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message,
    });
  }
}

/**
 * 로그인
 * POST /auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1) 유효성 체크
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "email and password are required",
      });
    }

    // 2) 유저 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "invalid credentials",
      });
    }

    // 3) 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        ok: false,
        message: "invalid credentials",
      });
    }

    // 4) JWT 발급
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ✅ HttpOnly 쿠키로 토큰 저장
    res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        // 로컬 개발에서는 secure: false
        secure: false,
        // 7일 유지
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
        ok: true,
        user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err.message,
    });
  }
}

async function me(req, res) {
  try {
    // requireAuth 미들웨어에서 req.user를 넣어줌
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}


/**
 * 로그아웃
 * POST /auth/logout
 * - access_token 쿠키 삭제
 */
async function logout(req, res) {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // 로컬 개발
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

module.exports = { signup, login, me, logout };