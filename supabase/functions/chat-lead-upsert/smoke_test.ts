import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const PROJECT_REF = "hyskofjwotohgdtocsie";
const BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;
const SECRET = Deno.env.get("CHAT_INGEST_SECRET");
const SESSION = `smoke-${Date.now()}`;

Deno.test("1. chat-lead-upsert creates lead", async () => {
  const r = await fetch(`${BASE}/chat-lead-upsert`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_session_id: SESSION,
      first_name: "Test", last_name: "User",
      email: `smoke-${Date.now()}@example.com`,
      loan_purpose: "FHA purchase",
    }),
  });
  const j = await r.json();
  console.log("TEST 1 status", r.status, "body", j);
  assertEquals(r.status, 200);
  assertEquals(j.created_or_updated, "created");
});

Deno.test("2. chat-lead-upsert updates same session", async () => {
  const r = await fetch(`${BASE}/chat-lead-upsert`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_session_id: SESSION,
      first_name: "Test", last_name: "User",
      phone: "305-555-0101",
    }),
  });
  const j = await r.json();
  console.log("TEST 2 status", r.status, "body", j);
  assertEquals(r.status, 200);
  assertEquals(j.created_or_updated, "updated");
});

Deno.test("3. chat-event-log logs event", async () => {
  const r = await fetch(`${BASE}/chat-event-log`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_session_id: SESSION,
      event_type: "contact_info_captured",
      metadata: { field: "email" },
    }),
  });
  const j = await r.json();
  console.log("TEST 3 status", r.status, "body", j);
  assertEquals(r.status, 200);
  assertEquals(j.points_added, 25);
});

Deno.test("4. chat-event-log rejects bad auth (401)", async () => {
  const r = await fetch(`${BASE}/chat-event-log`, {
    method: "POST",
    headers: { "Authorization": "Bearer wrong", "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await r.text();
  console.log("TEST 4 status", r.status, "body", body);
  assertEquals(r.status, 401);
});