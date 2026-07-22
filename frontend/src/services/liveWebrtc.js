// liveWebrtc.js — [현 차수] 라이브 미디어 평면(WHIP 송출 / WHEP 재생).
//   표준 WebRTC-over-HTTP(IETF WHIP/WHEP). SRS·MediaMTX·Cloudflare Stream 등이 네이티브 지원하며
//   SDK 없이 RTCPeerConnection + fetch(SDP) 만으로 동작한다.
//   ★미디어서버 미설정 시(백엔드 configured=false) 이 모듈은 호출되지 않고 프론트는 로컬 프리뷰로 degrade.
//
//   publishWhip(stream, url, ice)  호스트/게스트 카메라 송출   → { pc, resource, stop() }
//   playWhep(url, ice)             시청자 재생                → { pc, stream, resource, stop() }

/** ICE 수집 완료 대기(non-trickle WHIP/WHEP — 단일 SDP 교환). 최대 timeoutMs 후 현재 SDP로 진행. */
function waitIceGathering(pc, timeoutMs = 2500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(finish, timeoutMs); // TURN 부재/방화벽 환경에서도 교착 방지
  });
}

/** WHIP/WHEP 응답 Location(리소스 URL) 절대경로화 — 종료 시 DELETE 대상. */
function resolveResource(location, requestUrl) {
  if (!location) return null;
  try { return new URL(location, requestUrl).href; } catch { return location; }
}

async function negotiate(pc, url, { offerToReceive } = {}) {
  if (offerToReceive) {
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
  }
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitIceGathering(pc);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: pc.localDescription.sdp,
  });
  if (!res.ok) {
    let detail = ''; try { detail = await res.text(); } catch { /* 응답 본문 파싱 실패 무시 */ }
    throw new Error(`WHIP/WHEP ${res.status} ${res.statusText}${detail ? ' — ' + detail.slice(0, 200) : ''}`);
  }
  const answer = await res.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  return resolveResource(res.headers.get('Location'), url);
}

/** 송출(Publish) — getUserMedia 스트림을 미디어서버로 WHIP 전송. */
export async function publishWhip(mediaStream, whipUrl, iceServers = []) {
  const pc = new RTCPeerConnection({ iceServers });
  try {
    mediaStream.getTracks().forEach((tr) => pc.addTrack(tr, mediaStream));
    const resource = await negotiate(pc, whipUrl, { offerToReceive: false });
    return { pc, resource, stop: () => teardown(pc, resource) };
  } catch (e) { try { pc.close(); } catch { /* 실패 무시(best-effort) */ } throw e; }
}

/** 재생(Play) — 미디어서버에서 WHEP 수신, 원격 MediaStream 반환(video.srcObject 연결용). */
export async function playWhep(whepUrl, iceServers = []) {
  const pc = new RTCPeerConnection({ iceServers });
  const remote = new MediaStream();
  pc.ontrack = (e) => {
    const tracks = (e.streams && e.streams[0]) ? e.streams[0].getTracks() : [e.track];
    tracks.forEach((tr) => { if (tr && !remote.getTracks().includes(tr)) remote.addTrack(tr); });
  };
  try {
    const resource = await negotiate(pc, whepUrl, { offerToReceive: true });
    return { pc, stream: remote, resource, stop: () => teardown(pc, resource) };
  } catch (e) { try { pc.close(); } catch { /* 실패 무시(best-effort) */ } throw e; }
}

/** 세션 종료 — 미디어서버 리소스 DELETE(best-effort) + PeerConnection 닫기. */
export function teardown(pc, resource) {
  if (resource) { try { fetch(resource, { method: 'DELETE' }).catch(() => {}); } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ } }
  try { pc && pc.close(); } catch { /* 실패 무시(best-effort) */ }
}
