/// WebRTC collaboration hook — connects two Locus peers via a shared room code.
///
/// Signaling: Tauri push_signal / poll_signals (SQLite relay, 1 s poll).
/// Transport: RTCDataChannel over ICE (STUN only, LAN-friendly, no TURN needed).
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const POLL_MS = 1000;

export type CollabState = "idle" | "connecting" | "connected" | "error";

interface CollabSignal {
  id: string;
  room_id: string;
  peer_id: string;
  kind: string;
  payload: string;
  created_at: number;
}

interface UseCollabOptions {
  onData?: (msg: string) => void;
}

export function useCollab({ onData }: UseCollabOptions = {}) {
  const [state, setState] = useState<CollabState>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const peerId = useRef(crypto.randomUUID());
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const sinceTs = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const cleanup = useCallback(() => {
    stopPoll();
    dc.current?.close();
    pc.current?.close();
    pc.current = null;
    dc.current = null;
    setState("idle");
    setRoomCode(null);
  }, []);

  const sendSignal = useCallback(async (kind: string, payload: object, room: string) => {
    await invoke("push_signal", {
      roomId: room,
      peerId: peerId.current,
      kind,
      payload: JSON.stringify(payload),
    });
  }, []);

  const startPoll = useCallback((room: string, conn: RTCPeerConnection) => {
    sinceTs.current = Math.floor(Date.now() / 1000) - 2;
    pollRef.current = setInterval(async () => {
      const signals = await invoke<CollabSignal[]>("poll_signals", {
        roomId: room,
        peerId: peerId.current,
        sinceTs: sinceTs.current,
      }).catch(() => []);

      for (const sig of signals) {
        sinceTs.current = Math.max(sinceTs.current, sig.created_at);
        const data = JSON.parse(sig.payload);
        if (sig.kind === "offer") {
          await conn.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await conn.createAnswer();
          await conn.setLocalDescription(answer);
          await sendSignal("answer", answer, room);
        } else if (sig.kind === "answer") {
          await conn.setRemoteDescription(new RTCSessionDescription(data));
        } else if (sig.kind === "candidate" && data.candidate) {
          await conn.addIceCandidate(new RTCIceCandidate(data));
        }
      }
    }, POLL_MS);
  }, [sendSignal]);

  const createRoom = useCallback(async () => {
    const room = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomCode(room);
    setState("connecting");

    const conn = new RTCPeerConnection(STUN);
    pc.current = conn;
    const channel = conn.createDataChannel("locus-collab");
    dc.current = channel;

    channel.onopen = () => setState("connected");
    channel.onclose = () => setState("idle");
    channel.onmessage = (e) => onData?.(e.data);

    conn.onicecandidate = (e) => {
      if (e.candidate) sendSignal("candidate", e.candidate.toJSON(), room);
    };

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    await sendSignal("offer", offer, room);
    startPoll(room, conn);
    return room;
  }, [onData, sendSignal, startPoll]);

  const joinRoom = useCallback(async (room: string) => {
    setRoomCode(room);
    setState("connecting");

    const conn = new RTCPeerConnection(STUN);
    pc.current = conn;

    conn.ondatachannel = (e) => {
      dc.current = e.channel;
      e.channel.onopen = () => setState("connected");
      e.channel.onclose = () => setState("idle");
      e.channel.onmessage = (ev) => onData?.(ev.data);
    };

    conn.onicecandidate = (e) => {
      if (e.candidate) sendSignal("candidate", e.candidate.toJSON(), room);
    };

    startPoll(room, conn);
  }, [onData, sendSignal, startPoll]);

  const send = useCallback((msg: string) => {
    if (dc.current?.readyState === "open") dc.current.send(msg);
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  return { state, roomCode, peerId: peerId.current, createRoom, joinRoom, send, cleanup };
}
