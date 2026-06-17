import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/app/admin/actions";
import { createServiceClient } from "@/lib/supabase";

type ExportParticipant = {
  id: string;
  created_at: string;
  age: number | null;
  gender: string | null;
  education_level: string | null;
  class_name: string | null;
  sports_interest: string | null;
  assigned_variant: string;
  device_type: string | null;
  browser: string | null;
  screen_resolution: string | null;
  completed: boolean;
  total_session_duration_ms: number | null;
};

type ExportResponse = {
  participant_id: string;
  question_id: string;
  answer: string;
};

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const [{ data, error }, { data: responseData, error: responseError }] = await Promise.all([
    supabase
      .from("participants")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("responses").select("participant_id, question_id, answer"),
  ]);

  if (error || responseError) {
    return NextResponse.json({ error: error?.message ?? responseError?.message }, { status: 500 });
  }

  const questionIds = [
    "ad_attractiveness",
    "ad_trust",
    "ad_professionalism",
    "purchase_likelihood",
    "trial_likelihood",
    "brand_recall",
    "study_goal_guess",
  ];

  const headers = [
    "participant_id",
    "created_at",
    "age",
    "gender",
    "education_level",
    "class_name",
    "sports_interest",
    "assigned_variant",
    "device_type",
    "browser",
    "screen_resolution",
    "completed",
    "total_session_duration_ms",
    ...questionIds,
  ];

  const participants = (data ?? []) as ExportParticipant[];
  const responses = (responseData ?? []) as ExportResponse[];
  const responsesByParticipant = new Map<string, Map<string, string>>();
  for (const response of responses) {
    const participantResponses = responsesByParticipant.get(response.participant_id) ?? new Map<string, string>();
    participantResponses.set(response.question_id, response.answer);
    responsesByParticipant.set(response.participant_id, participantResponses);
  }

  const rows = participants.map((participant) => {
    const participantResponses = responsesByParticipant.get(participant.id) ?? new Map<string, string>();
    return [
      participant.id,
      participant.created_at,
      participant.age,
      participant.gender,
      participant.education_level,
      participant.class_name,
      participant.sports_interest,
      participant.assigned_variant,
      participant.device_type,
      participant.browser,
      participant.screen_resolution,
      participant.completed,
      participant.total_session_duration_ms,
      ...questionIds.map((id) => participantResponses.get(id) ?? ""),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pws-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
