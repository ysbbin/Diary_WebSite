const { prisma } = require("../db");

// 로그인한 유저의 personal calendar id를 찾는 helper
async function getMyPersonalCalendarId(userId) {
  const cal = await prisma.calendar.findFirst({
    where: {
      type: "personal",
      ownerId: userId,
    },
    select: { id: true },
  });

  return cal?.id || null;
}

async function createEvent(req, res) {
  try {
    const userId = req.user.id;
    const { title, startAt, endAt, memo } = req.body;

    if (!title || !startAt || !endAt) {
      return res.status(400).json({
        ok: false,
        message: "title, startAt, endAt are required",
      });
    }

    const calendarId = await getMyPersonalCalendarId(userId);
    if (!calendarId) {
      return res.status(404).json({ ok: false, message: "personal calendar not found" });
    }

    const event = await prisma.event.create({
      data: {
        calendarId,
        title,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        memo: memo || null,
        createdBy: userId,
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        memo: true,
        calendarId: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, event });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

async function listMyEvents(req, res) {
  try {
    const userId = req.user.id;

    const calendarId = await getMyPersonalCalendarId(userId);
    if (!calendarId) {
      return res.status(404).json({ ok: false, message: "personal calendar not found" });
    }

    const { from, to } = req.query;

    // 기간 필터는 선택(없으면 전체)
    const where = { calendarId };
    if (from || to) {
      where.startAt = {};
      if (from) where.startAt.gte = new Date(from);
      if (to) where.startAt.lte = new Date(to);
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        memo: true,
        calendarId: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return res.json({ ok: true, events });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

async function updateEvent(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const { title, startAt, endAt, memo } = req.body;

    // 1) 이벤트 존재 + 소유자 확인
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ ok: false, message: "event not found" });
    }

    if (event.createdBy !== userId) {
      return res.status(403).json({ ok: false, message: "no permission" });
    }

    // 2) 업데이트
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: title ?? event.title,
        startAt: startAt ? new Date(startAt) : event.startAt,
        endAt: endAt ? new Date(endAt) : event.endAt,
        memo: memo ?? event.memo,
      },
    });

    return res.json({ ok: true, event: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

async function deleteEvent(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ ok: false, message: "event not found" });
    }

    if (event.createdBy !== userId) {
      return res.status(403).json({ ok: false, message: "no permission" });
    }

    await prisma.event.delete({ where: { id: eventId } });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}


module.exports = {
  createEvent,
  listMyEvents,
  updateEvent,
  deleteEvent,
};
