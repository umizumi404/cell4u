import { audioBufferToBase64PcmWav } from "@/lib/voice/wav";

type WisprTokenResponse = {
  configured: boolean;
  websocketUrl: string | null;
};

export async function transcribeWithWispr(audioBlob: Blob) {
  const tokenResponse = await fetch("/api/voice/wispr-token");
  const token = (await tokenResponse.json()) as WisprTokenResponse;

  if (!token.configured || !token.websocketUrl) {
    throw new Error("Wispr Flow is not configured.");
  }
  const websocketUrl = token.websocketUrl;

  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  const packet = audioBufferToBase64PcmWav(decoded);
  await audioContext.close();

  return new Promise<string>((resolve, reject) => {
    const websocket = new WebSocket(websocketUrl);
    let transcript = "";

    websocket.addEventListener("open", () => {
      websocket.send(
        JSON.stringify({
          type: "start",
          language: ["en"],
        }),
      );
      websocket.send(
        JSON.stringify({
          type: "append",
          position: 0,
          audio_packets: {
            packets: [packet],
            volumes: [1],
            packet_duration: decoded.duration,
            audio_encoding: "wav",
            byte_encoding: "base64",
          },
        }),
      );
      websocket.send(
        JSON.stringify({
          type: "commit",
          total_chunks: 1,
        }),
      );
    });

    websocket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string) as {
        text?: string;
        transcript?: string;
        final?: boolean;
        type?: string;
      };

      transcript = data.text ?? data.transcript ?? transcript;

      if (data.final || data.type === "final") {
        websocket.close();
        resolve(transcript);
      }
    });

    websocket.addEventListener("error", () => {
      reject(new Error("Wispr Flow websocket error."));
    });

    websocket.addEventListener("close", () => {
      if (transcript) {
        resolve(transcript);
      }
    });
  });
}
