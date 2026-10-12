import { supabase } from "../supabase-client.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveMatchResult(result, sessionId) {
  if (!UUID_PATTERN.test(sessionId || "")) return { status: "LOCAL_ONLY", message: "โหมดทดสอบ: แสดงผลในเครื่อง" };
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return { status: "LOCAL_ONLY", message: "ไม่ได้เข้าสู่ระบบ: แสดงผลในเครื่อง" };

    const { data: session, error: sessionError } = await supabase
      .from("ai_world_sessions")
      .select("id, owner_id, status, board_state")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || session.owner_id !== authData.user.id) {
      return { status: "LOCAL_ONLY", message: "ผลการแข่งขันแสดงเฉพาะในเครื่อง" };
    }
    if (session.board_state?.match_result?.matchId === result.matchId) {
      return { status: "SAVED", message: "บันทึกผลแล้ว" };
    }

    const safeResult = {
      matchId: result.matchId,
      winnerId: result.winnerId,
      outcome: result.outcome,
      endReason: result.endReason,
      totalRounds: result.totalRounds,
      playerScore: result.playerScore,
      botScore: result.botScore,
      districtOwnership: result.districtOwnership,
      influenceSummary: result.influenceSummary,
      scenarioHistory: result.scenarioHistory,
      learningSummary: result.learningSummary,
      completedAt: result.completedAt,
    };
    const { data: saved, error: saveError } = await supabase
      .from("ai_world_sessions")
      .update({
        status: result.endReason === "SURRENDER" ? "abandoned" : "completed",
        phase: "end",
        current_turn: Math.max(1, result.totalRounds * 2),
        max_turns: 10,
        completed_at: result.completedAt,
        winner_id: result.winnerId === "player" ? authData.user.id : null,
        board_state: { ...(session.board_state || {}), match_result: safeResult },
      })
      .eq("id", sessionId)
      .eq("owner_id", authData.user.id)
      .select("id")
      .maybeSingle();
    if (saveError) throw saveError;
    return saved
      ? { status: "SAVED", message: "บันทึกผลการแข่งขันแล้ว" }
      : { status: "LOCAL_ONLY", message: "ผลการแข่งขันแสดงเฉพาะในเครื่อง" };
  } catch (error) {
    console.warn("Unable to save match result", error);
    return { status: "LOCAL_ONLY", message: "เชื่อมต่อฐานข้อมูลไม่ได้ แต่ผลในเครื่องยังใช้งานได้" };
  }
}
