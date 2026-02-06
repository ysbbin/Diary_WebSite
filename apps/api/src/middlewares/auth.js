const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    // 1) Authorization 헤더 우선 (Bearer 토큰)
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    // 2) 헤더가 없으면 쿠키에서 읽기
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({ ok: false, message: "missing token" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "invalid token" });
  }
}

module.exports = { requireAuth };
