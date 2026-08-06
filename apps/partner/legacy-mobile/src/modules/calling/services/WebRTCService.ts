import Config from "react-native-config";
import InCallManager from "react-native-incall-manager";
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, type MediaStream } from "react-native-webrtc";
import { socketCallService } from "./SocketCallService";
import type { WebRTCEvent } from "../types";

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(Config.TURN_URL && Config.TURN_USERNAME && Config.TURN_PASSWORD
    ? [{ urls: Config.TURN_URL, username: Config.TURN_USERNAME, credential: Config.TURN_PASSWORD }]
    : []),
];

class WebRTCService {
  private peer: RTCPeerConnection | null = null;
  private stream: MediaStream | null = null;
  private callId: string | null = null;
  private pendingCandidates: Record<string, unknown>[] = [];
  private listener?: (event: WebRTCEvent) => void;
  private restartAttempts = 0;

  setEventListener(listener?: (event: WebRTCEvent) => void) { this.listener = listener; }

  async createOffer(callId: string) {
    await this.prepare(callId);
    const offer = await this.peer!.createOffer({ offerToReceiveAudio: true });
    await this.peer!.setLocalDescription(offer);
    socketCallService.emit("call:offer", { callId, sdp: offer.sdp ?? "" });
  }

  async acceptOffer(callId: string, sdp: string) {
    await this.prepare(callId);
    await this.peer!.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
    await this.flushCandidates();
    const answer = await this.peer!.createAnswer();
    await this.peer!.setLocalDescription(answer);
    socketCallService.emit("call:answer", { callId, sdp: answer.sdp ?? "" });
  }

  async applyAnswer(callId: string, sdp: string) {
    if (!this.peer || callId !== this.callId) return;
    await this.peer.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
    await this.flushCandidates();
  }

  async addIceCandidate(callId: string, candidate: Record<string, unknown>) {
    if (callId !== this.callId) return;
    if (!this.peer?.remoteDescription) this.pendingCandidates.push(candidate);
    else await this.peer.addIceCandidate(new RTCIceCandidate(candidate as any));
  }

  setMuted(muted: boolean) {
    this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
    InCallManager.setMicrophoneMute(muted);
  }
  setSpeakerEnabled(enabled: boolean) { InCallManager.setForceSpeakerphoneOn(enabled); }

  close() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.peer?.close();
    this.peer = null; this.stream = null; this.callId = null; this.pendingCandidates = []; this.restartAttempts = 0;
    InCallManager.stop();
  }

  private async prepare(callId: string) {
    this.close();
    this.callId = callId;
    InCallManager.start({ media: "audio" });
    InCallManager.setKeepScreenOn(true);
    this.stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    const peer = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
    this.peer = peer;
    this.stream.getTracks().forEach(track => peer.addTrack(track, this.stream!));
    (peer as any).addEventListener("icecandidate", (event: any) => {
      if (event.candidate && this.callId) socketCallService.emit("call:ice-candidate", { callId: this.callId, candidate: event.candidate.toJSON() });
    });
    (peer as any).addEventListener("connectionstatechange", () => this.handleConnectionState());
    (peer as any).addEventListener("iceconnectionstatechange", () => this.handleIceState());
  }

  private handleConnectionState() {
    const state = this.peer?.connectionState;
    if (state === "connected") { this.restartAttempts = 0; this.listener?.({ type: "connected" }); }
    if (state === "disconnected") this.listener?.({ type: "reconnecting" });
    if (state === "failed") void this.restartIce();
  }

  private handleIceState() {
    if (this.peer?.iceConnectionState === "failed") void this.restartIce();
    if (this.peer?.iceConnectionState === "disconnected") this.listener?.({ type: "reconnecting" });
  }

  private async restartIce() {
    if (!this.peer || !this.callId || this.restartAttempts >= 2) {
      this.listener?.({ type: "failed", error: new Error("Unable to restore the audio connection") });
      return;
    }
    this.restartAttempts += 1;
    this.listener?.({ type: "reconnecting" });
    this.peer.restartIce();
    const offer = await this.peer.createOffer({ iceRestart: true });
    await this.peer.setLocalDescription(offer);
    socketCallService.emit("call:offer", { callId: this.callId, sdp: offer.sdp ?? "" });
  }

  private async flushCandidates() {
    if (!this.peer) return;
    for (const candidate of this.pendingCandidates) await this.peer.addIceCandidate(new RTCIceCandidate(candidate as any));
    this.pendingCandidates = [];
  }
}

export const webRTCService = new WebRTCService();
