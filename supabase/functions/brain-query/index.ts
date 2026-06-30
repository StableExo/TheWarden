import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Brain Bridge access key
const BRIDGE_KEY = "warden_br1dge_2026"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
    })
  }

  const url = new URL(req.url)
  const key = url.searchParams.get("key")

  if (key !== BRIDGE_KEY) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  const search  = url.searchParams.get("search")  || ""
  const table   = url.searchParams.get("table")   || "memories"
  const limit   = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200)
  const session = url.searchParams.get("session") || ""
  const memType = url.searchParams.get("type")    || ""

  try {
    // --- IDENTITY ---
    if (table === "identity") {
      const { data, error } = await supabase.from("warden_identity").select("*")
      if (error) throw error
      return new Response(JSON.stringify(data?.[0] || {}), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // --- SESSIONS ---
    if (table === "sessions") {
      let query = supabase.from("warden_sessions")
        .select("session_id,name,theme,summary,started_at,ended_at,growth_delta")
        .order("started_at", { ascending: false })
        .limit(limit)
      if (search) query = query.ilike("summary", `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return new Response(JSON.stringify({ count: data?.length, sessions: data }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // --- CAPABILITIES ---
    if (table === "capabilities") {
      let query = supabase.from("warden_capabilities")
        .select("*").order("created_at", { ascending: false }).limit(limit)
      if (search) query = query.ilike("content", `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return new Response(JSON.stringify({ count: data?.length, capabilities: data }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // --- MEMORIES (default) ---
    let query = supabase.from("warden_memories")
      .select("id,session_id,type,content,significance,emotional_tag,trigger_event,created_at")
      .order("significance", { ascending: false })
      .limit(limit)
    if (search)  query = query.ilike("content", `%${search}%`)
    if (session) query = query.eq("session_id", session)
    if (memType) query = query.eq("type", memType)

    const { data, error } = await query
    if (error) throw error

    return new Response(JSON.stringify({
      count: data?.length,
      search: search || null,
      table: "memories",
      memories: data
    }), { headers: { "Content-Type": "application/json" } })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    })
  }
})
