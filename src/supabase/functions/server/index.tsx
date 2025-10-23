import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-85bbbe36/health", (c) => {
  return c.json({ status: "ok" });
});

// Submit a report
app.post("/make-server-85bbbe36/report", async (c) => {
  try {
    const body = await c.req.json();
    const { reporterEmail, reportedUser, reason, details } = body;

    if (!reporterEmail || !reportedUser || !reason) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const report = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reporterEmail,
      reportedUser,
      reason,
      details: details || "",
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    // Get existing reports
    const existingReports = (await kv.get("reports")) || [];
    
    // Add new report
    await kv.set("reports", [...existingReports, report]);

    console.log(`Report submitted: ${report.id} by ${reporterEmail} against ${reportedUser}`);

    return c.json({ success: true, reportId: report.id });
  } catch (error) {
    console.error("Error submitting report:", error);
    return c.json({ error: "Failed to submit report", details: String(error) }, 500);
  }
});

// Get all reports (admin only)
app.get("/make-server-85bbbe36/admin/reports", async (c) => {
  try {
    const reports = (await kv.get("reports")) || [];
    return c.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return c.json({ error: "Failed to fetch reports", details: String(error) }, 500);
  }
});

// Get blocked users (admin only)
app.get("/make-server-85bbbe36/admin/blocked-users", async (c) => {
  try {
    const blockedUsers = (await kv.get("blocked_users")) || [];
    return c.json(blockedUsers);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return c.json({ error: "Failed to fetch blocked users", details: String(error) }, 500);
  }
});

// Block a user (admin only)
app.post("/make-server-85bbbe36/admin/block-user", async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, reason } = body;

    if (!email || !name || !reason) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const blockedUser = {
      email,
      name,
      reason,
      blockedAt: new Date().toISOString(),
    };

    // Get existing blocked users
    const existingBlocked = (await kv.get("blocked_users")) || [];
    
    // Check if already blocked
    const alreadyBlocked = existingBlocked.some((u: any) => u.email === email);
    if (alreadyBlocked) {
      return c.json({ error: "User already blocked" }, 400);
    }

    // Add to blocked list
    await kv.set("blocked_users", [...existingBlocked, blockedUser]);

    console.log(`User blocked: ${email} for ${reason}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    return c.json({ error: "Failed to block user", details: String(error) }, 500);
  }
});

// Unblock a user (admin only)
app.post("/make-server-85bbbe36/admin/unblock-user", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "Missing email" }, 400);
    }

    // Get existing blocked users
    const existingBlocked = (await kv.get("blocked_users")) || [];
    
    // Remove from blocked list
    const updatedBlocked = existingBlocked.filter((u: any) => u.email !== email);
    await kv.set("blocked_users", updatedBlocked);

    console.log(`User unblocked: ${email}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return c.json({ error: "Failed to unblock user", details: String(error) }, 500);
  }
});

// Update report status (admin only)
app.post("/make-server-85bbbe36/admin/update-report", async (c) => {
  try {
    const body = await c.req.json();
    const { reportId, status } = body;

    if (!reportId || !status) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get existing reports
    const existingReports = (await kv.get("reports")) || [];
    
    // Update report status
    const updatedReports = existingReports.map((r: any) =>
      r.id === reportId ? { ...r, status } : r
    );
    
    await kv.set("reports", updatedReports);

    console.log(`Report ${reportId} status updated to ${status}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating report:", error);
    return c.json({ error: "Failed to update report", details: String(error) }, 500);
  }
});

// Check if user is blocked
app.post("/make-server-85bbbe36/check-blocked", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "Missing email" }, 400);
    }

    const blockedUsers = (await kv.get("blocked_users")) || [];
    const isBlocked = blockedUsers.some((u: any) => u.email === email);

    return c.json({ isBlocked });
  } catch (error) {
    console.error("Error checking blocked status:", error);
    return c.json({ error: "Failed to check blocked status", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Store session connection info
app.post("/make-server-85bbbe36/webrtc/join-session", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, userId, userName } = body;

    if (!sessionId || !userId || !userName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const sessionKey = `webrtc_session_${sessionId}`;
    const sessionData = (await kv.get(sessionKey)) || { participants: [] };

    // Add user to session
    const participantExists = sessionData.participants.some((p: any) => p.userId === userId);
    if (!participantExists) {
      sessionData.participants.push({ userId, userName, joinedAt: new Date().toISOString() });
      await kv.set(sessionKey, sessionData);
    }

    console.log(`User ${userId} joined WebRTC session ${sessionId}`);

    // Return other participants
    const otherParticipants = sessionData.participants.filter((p: any) => p.userId !== userId);

    return c.json({ success: true, participants: otherParticipants });
  } catch (error) {
    console.error("Error joining WebRTC session:", error);
    return c.json({ error: "Failed to join session", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Send offer
app.post("/make-server-85bbbe36/webrtc/offer", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, fromUserId, toUserId, offer } = body;

    if (!sessionId || !fromUserId || !toUserId || !offer) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const offerKey = `webrtc_offer_${sessionId}_${fromUserId}_${toUserId}`;
    await kv.set(offerKey, { offer, timestamp: new Date().toISOString() });

    console.log(`Stored offer from ${fromUserId} to ${toUserId} in session ${sessionId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error storing offer:", error);
    return c.json({ error: "Failed to store offer", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Get offer
app.get("/make-server-85bbbe36/webrtc/offer/:sessionId/:fromUserId/:toUserId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const fromUserId = c.req.param("fromUserId");
    const toUserId = c.req.param("toUserId");

    const offerKey = `webrtc_offer_${sessionId}_${fromUserId}_${toUserId}`;
    const offerData = await kv.get(offerKey);

    if (offerData) {
      // Delete after reading
      await kv.del(offerKey);
      return c.json({ offer: offerData.offer });
    }

    return c.json({ offer: null });
  } catch (error) {
    console.error("Error getting offer:", error);
    return c.json({ error: "Failed to get offer", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Send answer
app.post("/make-server-85bbbe36/webrtc/answer", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, fromUserId, toUserId, answer } = body;

    if (!sessionId || !fromUserId || !toUserId || !answer) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const answerKey = `webrtc_answer_${sessionId}_${fromUserId}_${toUserId}`;
    await kv.set(answerKey, { answer, timestamp: new Date().toISOString() });

    console.log(`Stored answer from ${fromUserId} to ${toUserId} in session ${sessionId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error storing answer:", error);
    return c.json({ error: "Failed to store answer", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Get answer
app.get("/make-server-85bbbe36/webrtc/answer/:sessionId/:fromUserId/:toUserId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const fromUserId = c.req.param("fromUserId");
    const toUserId = c.req.param("toUserId");

    const answerKey = `webrtc_answer_${sessionId}_${fromUserId}_${toUserId}`;
    const answerData = await kv.get(answerKey);

    if (answerData) {
      // Delete after reading
      await kv.del(answerKey);
      return c.json({ answer: answerData.answer });
    }

    return c.json({ answer: null });
  } catch (error) {
    console.error("Error getting answer:", error);
    return c.json({ error: "Failed to get answer", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Send ICE candidate
app.post("/make-server-85bbbe36/webrtc/ice-candidate", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, fromUserId, toUserId, candidate } = body;

    if (!sessionId || !fromUserId || !toUserId || !candidate) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const candidateKey = `webrtc_ice_${sessionId}_${fromUserId}_${toUserId}`;
    const existingCandidates = (await kv.get(candidateKey)) || { candidates: [] };
    existingCandidates.candidates.push({ candidate, timestamp: new Date().toISOString() });
    await kv.set(candidateKey, existingCandidates);

    console.log(`Stored ICE candidate from ${fromUserId} to ${toUserId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error storing ICE candidate:", error);
    return c.json({ error: "Failed to store ICE candidate", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Get ICE candidates
app.get("/make-server-85bbbe36/webrtc/ice-candidates/:sessionId/:fromUserId/:toUserId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const fromUserId = c.req.param("fromUserId");
    const toUserId = c.req.param("toUserId");

    const candidateKey = `webrtc_ice_${sessionId}_${fromUserId}_${toUserId}`;
    const candidateData = await kv.get(candidateKey);

    if (candidateData) {
      // Delete after reading
      await kv.del(candidateKey);
      return c.json({ candidates: candidateData.candidates.map((c: any) => c.candidate) });
    }

    return c.json({ candidates: [] });
  } catch (error) {
    console.error("Error getting ICE candidates:", error);
    return c.json({ error: "Failed to get ICE candidates", details: String(error) }, 500);
  }
});

// WebRTC Signaling: Leave session
app.post("/make-server-85bbbe36/webrtc/leave-session", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const sessionKey = `webrtc_session_${sessionId}`;
    const sessionData = (await kv.get(sessionKey)) || { participants: [] };

    // Remove user from session
    sessionData.participants = sessionData.participants.filter((p: any) => p.userId !== userId);
    
    if (sessionData.participants.length > 0) {
      await kv.set(sessionKey, sessionData);
    } else {
      // Delete session if empty
      await kv.del(sessionKey);
    }

    console.log(`User ${userId} left WebRTC session ${sessionId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error leaving WebRTC session:", error);
    return c.json({ error: "Failed to leave session", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);