"use server";

import { createServiceClient } from "@/lib/supabase";
import type { Demographics, DeviceInfo, Variant } from "@/lib/types";

function assignVariant(): Variant {
  return Math.random() < 0.5 ? "A" : "B";
}

export async function createParticipant(demographics: Demographics, device: DeviceInfo) {
  const supabase = createServiceClient();
  const variant = assignVariant();

  const { data, error } = await supabase
    .from("participants")
    .insert({
      age: Number.parseInt(demographics.age, 10),
      gender: demographics.gender,
      education_level: demographics.education_level,
      class_name: demographics.class_name.trim(),
      sports_interest: demographics.sports_interest,
      assigned_variant: variant,
      device_type: device.device_type,
      browser: device.browser,
      screen_resolution: device.screen_resolution,
      completed: false,
    })
    .select("id, assigned_variant, completed")
    .single();

  if (error) {
    throw new Error(`Participant kon niet worden opgeslagen: ${error.message}`);
  }

  await logEvent(data.id, "survey_started", { participant_id: data.id, variant, device });
  return data;
}

export async function saveResponse(input: {
  participantId: string;
  questionId: string;
  answer: string;
  timeToAnswerMs: number;
  changeCount: number;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("responses").upsert(
    {
      participant_id: input.participantId,
      question_id: input.questionId,
      answer: input.answer,
      time_to_answer_ms: input.timeToAnswerMs,
      change_count: input.changeCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,question_id" },
  );

  if (error) {
    throw new Error(`Antwoord kon niet worden opgeslagen: ${error.message}`);
  }

  void logEvent(input.participantId, "question_answered", {
    participant_id: input.participantId,
    question_id: input.questionId,
    time_to_answer_ms: input.timeToAnswerMs,
    change_count: input.changeCount,
  }).catch(() => undefined);
}

export async function logEvent(
  participantId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("events").insert({
    participant_id: participantId,
    event_type: eventType,
    metadata: { participant_id: participantId, ...metadata },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function completeSurvey(participantId: string, totalSessionDurationMs: number) {
  const supabase = createServiceClient();
  const { data: participant, error: readError } = await supabase
    .from("participants")
    .select("completed")
    .eq("id", participantId)
    .single();

  if (readError) {
    throw new Error(`Deelnemer kon niet worden opgehaald: ${readError.message}`);
  }

  if (participant.completed) {
    return { alreadyCompleted: true };
  }

  const { data: updated, error } = await supabase
    .from("participants")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      total_session_duration_ms: totalSessionDurationMs,
    })
    .eq("id", participantId)
    .eq("completed", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Enquete kon niet worden afgerond: ${error.message}`);
  }

  if (!updated) {
    return { alreadyCompleted: true };
  }

  await logEvent(participantId, "survey_completed", {
    participant_id: participantId,
    total_session_duration_ms: totalSessionDurationMs,
  });
  return { alreadyCompleted: false };
}
