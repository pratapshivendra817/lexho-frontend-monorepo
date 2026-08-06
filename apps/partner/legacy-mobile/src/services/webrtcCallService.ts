import InCallManager from "react-native-incall-manager";
import { PermissionsAndroid, Platform } from "react-native";
import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  type MediaStream,
} from "react-native-webrtc";
import { callSignaling } from "./callSignaling";
import type { CallSignal } from "../types/call";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

class WebRTCCallService {
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callId: string | null = null;
  private muted = false;
  private speaker = false;
  private pendingCandidates: Record<string, unknown>[] = [];

  async startOutgoing(callId: string, orderId: number) {
    await this.prepare(callId);
    const offer = await this.peer!.createOffer({ offerToReceiveAudio: true });
    await this.peer!.setLocalDescription(offer);
    callSignaling.send({ type: "OFFER", callId, orderId, sdp: offer.sdp ?? "" });
  }

  async acceptIncoming(callId: string, offerSdp: string) {
    await this.prepare(callId);
    await this.peer!.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offerSdp }));
    await this.flushCandidates();
    const answer = await this.peer!.createAnswer();
    await this.peer!.setLocalDescription(answer);
    callSignaling.send({ type: "ANSWER", callId, sdp: answer.sdp ?? "" });
  }

  async applySignal(signal: CallSignal) {
    if (signal.type === "ANSWER" && this.peer && signal.callId === this.callId) {
      await this.peer.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
      await this.flushCandidates();
    }
    if (signal.type === "ICE_CANDIDATE" && signal.callId === this.callId) {
      if (!this.peer?.remoteDescription) this.pendingCandidates.push(signal.candidate);
      else await this.peer.addIceCandidate(new RTCIceCandidate(signal.candidate as any));
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.localStream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
    InCallManager.setMicrophoneMute(muted);
  }

  setSpeaker(speaker: boolean) {
    this.speaker = speaker;
    InCallManager.setForceSpeakerphoneOn(speaker);
  }

  end() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peer?.close();
    this.peer = null;
    this.localStream = null;
    this.callId = null;
    this.pendingCandidates = [];
    this.muted = false;
    this.speaker = false;
    InCallManager.stop();
  }

  private async prepare(callId: string) {
    this.end();
    if (Platform.OS === "android") {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw new Error("Microphone permission is required for calls");
    }
    this.callId = callId;
    InCallManager.start({ media: "audio" });
    InCallManager.setKeepScreenOn(true);
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    this.localStream = stream;
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peer = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    (peer as any).addEventListener("icecandidate", (event: any) => {
      if (event.candidate && this.callId) {
        callSignaling.send({ type: "ICE_CANDIDATE", callId: this.callId, candidate: event.candidate.toJSON() });
      }
    });
  }

  private async flushCandidates() {
    if (!this.peer) return;
    for (const candidate of this.pendingCandidates) {
      await this.peer.addIceCandidate(new RTCIceCandidate(candidate as any));
    }
    this.pendingCandidates = [];
  }
}

export const webrtcCallService = new WebRTCCallService();
