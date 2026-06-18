"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Loader2, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { completeSurvey, createParticipant, logEvent, saveResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { surveyQuestions } from "@/lib/questions";
import type { Demographics, DeviceInfo, Variant } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "welcome" | "demographics" | "ad" | "question" | "thanks";

type SessionState = {
  participantId: string;
  assignedVariant: Variant;
  startedAt: number;
  completed: boolean;
};

const storageKey = "pws-sportmarketing-session-v1";
const answerStorageKey = "pws-sportmarketing-answers-v1";
const progressStorageKey = "pws-sportmarketing-progress-v1";
const totalSteps = 3 + surveyQuestions.length;
const educationOptions = ["vwo", "havo", "vmbo/tl", "anders / niet meer op school"];
const classOptionsByEducation: Record<string, string[]> = {
  "vmbo/tl": ["1", "2", "3", "4"],
  havo: ["1", "2", "3", "4", "5"],
  vwo: ["1", "2", "3", "4", "5", "6"],
};

const initialDemographics: Demographics = {
  age: "",
  gender: "",
  education_level: "",
  class_name: "",
  sports_interest: "5",
};

function getDeviceInfo(): DeviceInfo {
  const width = window.screen?.width ?? window.innerWidth;
  const height = window.screen?.height ?? window.innerHeight;
  const ua = navigator.userAgent;
  const device_type = /Mobi|Android|iPhone/i.test(ua)
    ? "mobile"
    : /iPad|Tablet/i.test(ua)
      ? "tablet"
      : "desktop";

  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  return {
    device_type,
    browser,
    screen_resolution: `${width}x${height}`,
  };
}

export function SurveyApp() {
  const [step, setStep] = useState<Step>("welcome");
  const [demographics, setDemographics] = useState<Demographics>(initialDemographics);
  const [educationOther, setEducationOther] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [changeCounts, setChangeCounts] = useState<Record<string, number>>({});
  const [questionEnteredAt, setQuestionEnteredAt] = useState(Date.now());
  const [adReadyAt, setAdReadyAt] = useState<number | null>(null);
  const [adSecondsLeft, setAdSecondsLeft] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestionIds, setPendingQuestionIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const pageEnteredAt = useRef(Date.now());
  const adShownAt = useRef<number | null>(null);

  const currentQuestion = surveyQuestions[questionIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? (currentQuestion.type === "scale" ? "5" : "")
    : "";
  const progress = useMemo(() => {
    if (step === "thanks") return 100;
    const base = step === "welcome" ? 0 : step === "demographics" ? 1 : step === "ad" ? 2 : 3 + questionIndex;
    return Math.min(100, Math.round((base / totalSteps) * 100));
  }, [questionIndex, step]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const storedAnswers = window.localStorage.getItem(answerStorageKey);
    const storedProgress = window.localStorage.getItem(progressStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionState;
      setSession(parsed);
      if (parsed.completed) {
        setStep("thanks");
      } else if (storedProgress) {
        const progressState = JSON.parse(storedProgress) as { step: Step; questionIndex: number };
        setQuestionIndex(Math.min(progressState.questionIndex, surveyQuestions.length - 1));
        setStep(progressState.step === "thanks" ? "question" : progressState.step);
      } else {
        setStep("ad");
      }
    }
    if (storedAnswers) setAnswers(JSON.parse(storedAnswers) as Record<string, string>);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(answerStorageKey, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    window.localStorage.setItem(progressStorageKey, JSON.stringify({ step, questionIndex }));
  }, [questionIndex, step]);

  useEffect(() => {
    if (!session?.participantId) return;
    const now = Date.now();
    pageEnteredAt.current = now;
    void logEvent(session.participantId, "page_entered", { step, question_id: currentQuestion?.id }).catch(
      () => undefined,
    );

    return () => {
      void logEvent(session.participantId, "page_left", {
        step,
        question_id: currentQuestion?.id,
        duration_ms: Date.now() - pageEnteredAt.current,
      }).catch(() => undefined);
    };
  }, [currentQuestion?.id, session?.participantId, step]);

  useEffect(() => {
    if (step !== "ad" || !session) return;
    const shownAt = Date.now();
    const readyAt = shownAt + 5000;
    adShownAt.current = shownAt;
    setAdReadyAt(readyAt);
    void logEvent(session.participantId, "advertisement_shown", {
      assigned_variant: session.assignedVariant,
    }).catch(() => undefined);

    const interval = window.setInterval(() => {
      setAdSecondsLeft(Math.max(0, Math.ceil((readyAt - Date.now()) / 1000)));
    }, 250);

    return () => window.clearInterval(interval);
  }, [session, step]);

  const beginSurvey = () => setStep("demographics");

  const isOtherEducation = demographics.education_level === "anders / niet meer op school";
  const canSubmitDemographics =
    demographics.age.trim().length > 0 &&
    demographics.gender.trim().length > 0 &&
    demographics.education_level.trim().length > 0 &&
    demographics.sports_interest.trim().length > 0 &&
    (isOtherEducation ? educationOther.trim().length > 0 : demographics.class_name.trim().length > 0);
  const availableClassOptions = classOptionsByEducation[demographics.education_level] ?? [];

  const submitDemographics = () => {
    if (!canSubmitDemographics) return;
    setError(null);
    startTransition(async () => {
      try {
        const participant = await createParticipant(
          isOtherEducation
            ? {
                ...demographics,
                education_level: `anders / niet meer op school: ${educationOther.trim()}`,
                class_name: "niet van toepassing",
              }
            : demographics,
          getDeviceInfo(),
        );
        const nextSession = {
          participantId: participant.id,
          assignedVariant: participant.assigned_variant,
          startedAt: Date.now(),
          completed: false,
        };
        setSession(nextSession);
        window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
        setStep("ad");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Opslaan is mislukt.");
      }
    });
  };

  const changeAnswer = (questionId: string, answer: string) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setChangeCounts((current) => ({ ...current, [questionId]: (current[questionId] ?? 0) + 1 }));
  };

  const continueFromAd = () => {
    if (!session || !adShownAt.current || Date.now() < (adReadyAt ?? 0)) return;
    void logEvent(session.participantId, "advertisement_view_time", {
      duration_ms: Date.now() - adShownAt.current,
      continued_at: new Date().toISOString(),
    }).catch(() => undefined);
    setQuestionEnteredAt(Date.now());
    setStep("question");
  };

  const saveAndContinue = () => {
    if (!session || !currentQuestion) return;
    if (pendingQuestionIds[currentQuestion.id]) return;
    const answer = currentAnswer.trim();
    if (!answer) return;
    const savedQuestion = currentQuestion;
    const savedQuestionIndex = questionIndex;
    const answeredAt = Date.now();
    const changeCount = Math.max(0, (changeCounts[savedQuestion.id] ?? 1) - 1);
    setError(null);

    setPendingQuestionIds((current) => ({ ...current, [savedQuestion.id]: true }));
    if (savedQuestionIndex < surveyQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      setQuestionEnteredAt(answeredAt);
    }

    startTransition(async () => {
      try {
        await saveResponse({
          participantId: session.participantId,
          questionId: savedQuestion.id,
          answer,
          timeToAnswerMs: answeredAt - questionEnteredAt,
          changeCount,
        });

        if (changeCount > 0) {
          void logEvent(session.participantId, "answer_changed", {
            question_id: savedQuestion.id,
            change_count: changeCount,
            final_answer_length: answer.length,
          }).catch(() => undefined);
        }

        if (savedQuestionIndex === surveyQuestions.length - 1) {
          const total = Date.now() - session.startedAt;
          await completeSurvey(session.participantId, total);
          const completedSession = { ...session, completed: true };
          setSession(completedSession);
          window.localStorage.setItem(storageKey, JSON.stringify(completedSession));
          setStep("thanks");
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Opslaan is mislukt.");
        if (savedQuestionIndex < surveyQuestions.length - 1) {
          setQuestionIndex(savedQuestionIndex);
          setQuestionEnteredAt(questionEnteredAt);
        }
      } finally {
        setPendingQuestionIds((current) => {
          const next = { ...current };
          delete next[savedQuestion.id];
          return next;
        });
      }
    });
  };

  const goBackQuestion = () => {
    if (questionIndex > 0) {
      setQuestionIndex((index) => index - 1);
      setQuestionEnteredAt(Date.now());
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary)/0.18),transparent_32rem)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
        <header className="sticky top-0 z-20 -mx-4 mb-4 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Progress value={progress} aria-label="Voortgang" />
        </header>

        <section className="flex flex-1 items-center justify-center py-4">
          <div className="w-full animate-fade-up">
            {step === "welcome" && (
              <Card>
                <CardHeader>
                  <CardTitle>PWS onderzoek</CardTitle>
                  <CardDescription>
                    Je krijgt straks kort materiaal te zien en beantwoordt daarna enkele vragen.
                    Je antwoorden worden anoniem verwerkt voor een profielwerkstuk.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg" onClick={beginSurvey}>
                    <Play className="h-5 w-5" />
                    Start onderzoek
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "demographics" && (
              <Card>
                <CardHeader>
                  <CardTitle>Voor we beginnen</CardTitle>
                  <CardDescription>Vul deze gegevens in zodat de antwoorden goed vergeleken kunnen worden.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Field label="Leeftijd">
                    <Input
                      inputMode="numeric"
                      min={10}
                      max={25}
                      type="number"
                      value={demographics.age}
                      onChange={(event) => setDemographics({ ...demographics, age: event.target.value })}
                    />
                  </Field>
                  <ChoiceField
                    label="Geslacht"
                    value={demographics.gender}
                    options={["Vrouw", "Man", "Anders / zeg ik liever niet"]}
                    onChange={(value) => setDemographics({ ...demographics, gender: value })}
                  />
                  <ChoiceField
                    label="Niveau"
                    value={demographics.education_level}
                    options={educationOptions}
                    onChange={(value) => {
                      if (value !== "anders / niet meer op school") setEducationOther("");
                      setDemographics({
                        ...demographics,
                        education_level: value,
                        class_name: classOptionsByEducation[value]?.includes(demographics.class_name)
                          ? demographics.class_name
                          : "",
                      });
                    }}
                  />
                  {isOtherEducation && (
                    <Field label="Wat doe je nu?">
                      <Input
                        placeholder="Bijv. mbo, werk, tussenjaar"
                        value={educationOther}
                        onChange={(event) => setEducationOther(event.target.value)}
                      />
                    </Field>
                  )}
                  {demographics.education_level && !isOtherEducation && (
                    <ChoiceField
                      label="Klas"
                      value={demographics.class_name}
                      options={availableClassOptions}
                      onChange={(value) => setDemographics({ ...demographics, class_name: value })}
                    />
                  )}
                  <SliderField
                    label="Hoe vaak kijk je gemiddeld sport in een normale week?"
                    value={demographics.sports_interest}
                    onChange={(value) => setDemographics({ ...demographics, sports_interest: value })}
                  />
                  <FormError message={error} />
                  <Button className="w-full" disabled={!canSubmitDemographics || isPending} onClick={submitDemographics}>
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    Verder
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "ad" && session && (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-normal">Bekijk deze advertentie</h1>
                  <p className="text-sm text-muted-foreground">
                    Kijk goed naar de poster alsof je hem online of op school tegenkomt. Daarna krijg je vragen over je
                    eerste indruk.
                  </p>
                </div>
                <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                  <Image
                    priority
                    src={session.assignedVariant === "A" ? "/ads/variant-a.png" : "/ads/variant-b.png"}
                    alt="Advertentie voor Voltix Energy"
                    width={680}
                    height={1014}
                    className="h-[min(72vh,760px)] w-full bg-black object-contain"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={Date.now() < (adReadyAt ?? Number.POSITIVE_INFINITY)}
                  size="lg"
                  onClick={continueFromAd}
                >
                  <ArrowRight className="h-5 w-5" />
                  {adSecondsLeft > 0 ? `Verder over ${adSecondsLeft}s` : "Verder"}
                </Button>
              </div>
            )}

            {step === "question" && currentQuestion && (
              <Card>
                <CardHeader>
                  <CardDescription>Vraag {questionIndex + 1} van {surveyQuestions.length}</CardDescription>
                  <CardTitle>{currentQuestion.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentQuestion.type === "scale" ? (
                    <ScaleAnswer
                      value={currentAnswer}
                      onChange={(value) => changeAnswer(currentQuestion.id, value)}
                    />
                  ) : (
                    <Textarea
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(event) => changeAnswer(currentQuestion.id, event.target.value)}
                    />
                  )}
                  <FormError message={error} />
                  <div className="grid grid-cols-[auto_1fr] gap-3">
                    <Button
                      aria-label="Vorige vraag"
                      disabled={questionIndex === 0 || isPending}
                      size="icon"
                      type="button"
                      variant="outline"
                      onClick={goBackQuestion}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      disabled={!currentAnswer.trim() || isPending}
                      type="button"
                      onClick={saveAndContinue}
                    >
                      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                      {questionIndex === surveyQuestions.length - 1 ? "Afronden" : "Volgende"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "thanks" && (
              <Card className="relative overflow-hidden">
                <Confetti />
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                  <CardTitle>Bedankt voor je deelname</CardTitle>
                  <CardDescription>Je antwoorden zijn opgeslagen. Je kunt dit scherm nu sluiten.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numeric = Number.parseInt(value || "5", 10);
  return (
    <Field label={label}>
      <div className="space-y-4 rounded-md border px-4 py-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-muted-foreground">Bijna nooit</span>
          <span className="rounded-md bg-primary px-4 py-2 text-2xl font-semibold text-primary-foreground">
            {numeric}
          </span>
          <span className="text-sm font-medium text-muted-foreground">Heel vaak</span>
        </div>
        <Slider min={0} max={10} step={1} value={[numeric]} onValueChange={([next]) => onChange(String(next))} />
        <div className="grid grid-cols-3 text-xs text-muted-foreground">
          <span>0</span>
          <span className="text-center">Soms</span>
          <span className="text-right">10</span>
        </div>
      </div>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChoiceField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <RadioGroup value={value} onValueChange={onChange}>
        {options.map((option) => (
          <Label
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors",
              value === option ? "border-primary bg-primary/10" : "hover:bg-muted",
            )}
            key={option}
          >
            <RadioGroupItem value={option} />
            {option}
          </Label>
        ))}
      </RadioGroup>
    </Field>
  );
}

function ScaleAnswer({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const numeric = Number.parseInt(value || "5", 10);
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <span className="text-sm text-muted-foreground">0</span>
        <span className="rounded-md bg-primary px-4 py-2 text-2xl font-semibold text-primary-foreground">
          {numeric}
        </span>
        <span className="text-sm text-muted-foreground">10</span>
      </div>
      <Slider
        min={0}
        max={10}
        step={1}
        value={[numeric]}
        onValueChange={([next]) => onChange(String(next))}
      />
    </div>
  );
}

function Confetti() {
  const pieces = [
    ["left-[8%]", "top-6", "bg-primary", "rotate-12"],
    ["left-[18%]", "top-12", "bg-secondary", "-rotate-12"],
    ["left-[32%]", "top-5", "bg-accent", "rotate-45"],
    ["left-[48%]", "top-14", "bg-primary", "-rotate-45"],
    ["left-[62%]", "top-7", "bg-secondary", "rotate-12"],
    ["left-[78%]", "top-16", "bg-accent", "-rotate-12"],
    ["left-[88%]", "top-8", "bg-primary", "rotate-45"],
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden">
      {pieces.map(([left, top, color, rotate], index) => (
        <span
          className={cn("absolute h-3 w-2 animate-confetti rounded-sm", left, top, color, rotate)}
          key={`${left}-${top}`}
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p>;
}
