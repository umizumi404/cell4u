"use client";

import { useMemo, useState } from "react";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { transcribeWithWispr } from "@/lib/voice/wispr-client";

export function VoiceSetup() {
  const [transcript, setTranscript] = useState("");
  const [state, setState] = useState<
    "idle" | "recording" | "transcribing" | "submitting" | "ready" | "error"
  >("idle");

  const wordCount = useMemo(
    () => transcript.trim().split(/\s+/).filter(Boolean).length,
    [transcript],
  );

  async function submitCampaign() {
    setState("submitting");

    try {
      const response = await fetch("/api/campaign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error("Campaign request failed.");
      }

      setState("ready");
    } catch {
      setState("error");
    }
  }

  async function recordWithWispr() {
    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.addEventListener("dataavailable", (event) => {
      chunks.push(event.data);
    });

    recorder.addEventListener("stop", async () => {
      setState("transcribing");
      stream.getTracks().forEach((track) => track.stop());

      try {
        const audio = new Blob(chunks, { type: recorder.mimeType });
        const text = await transcribeWithWispr(audio);
        setTranscript(text);
      } finally {
        setState("idle");
      }
    });

    setState("recording");
    recorder.start();
    window.setTimeout(() => recorder.stop(), 7000);
  }

  return (
    <Card className="relative overflow-hidden border-white/10 bg-white/[0.035]">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <CardHeader className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          <Mic className="size-3.5" />
          Voice-first setup
        </div>
        <CardTitle className="text-2xl">Start with the pitch.</CardTitle>
        <CardDescription>
          Record with Wispr Flow when configured, or paste a transcript while
          testing locally. Keep it simple: what you sell, who to call, where to
          search, and what counts as success.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <Textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          className="min-h-36 resize-none border-white/10 bg-black/30 text-base leading-7"
          placeholder="Example: I sell website redesigns to landscaping companies in Ottawa. A good outcome is a booked discovery meeting with the owner."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {wordCount} words captured
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={recordWithWispr}
              disabled={state === "recording" || state === "transcribing"}
              className="border-white/10 bg-white/[0.03]"
            >
              {state === "recording" || state === "transcribing" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mic />
              )}
              {state === "recording" ? "Listening" : "Record"}
            </Button>
            <Button
              onClick={submitCampaign}
              disabled={state === "submitting" || wordCount < 8}
            >
              {state === "submitting" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Generate campaign
            </Button>
          </div>
        </div>
        {state === "ready" ? (
          <Alert className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
            <Sparkles className="size-4" />
            <AlertTitle>Campaign request accepted</AlertTitle>
            <AlertDescription>
              The next step is lead discovery. Once Supabase credentials are
              present, the campaign is stored server-side.
            </AlertDescription>
          </Alert>
        ) : null}
        {state === "error" ? (
          <Alert className="border-red-400/20 bg-red-400/10 text-red-100">
            <Sparkles className="size-4" />
            <AlertTitle>Could not create campaign</AlertTitle>
            <AlertDescription>
              Check your transcript length and environment configuration, then
              try again.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
