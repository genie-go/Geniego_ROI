#!/usr/bin/env node
/**
 * GenieROI WMS — 온프렘 CCTV 브리지 에이전트
 * ============================================================================
 * 현장(창고) PC에서 실행되는 경량 에이전트. 같은 LAN 안에서 DVR/NVR/IP카메라를
 * RTSP로 물어 ffmpeg로 HLS로 변환하고, 아웃바운드 HTTPS로 GenieROI 클라우드에
 * 세그먼트를 업로드한다. 포트포워딩·방화벽 인바운드 개방이 전혀 필요 없다.
 *
 * 이 방식이 P2P/ActiveX/독자VMS 장비까지 브라우저 재생을 가능케 하는 이유:
 *   인터넷 쪽으로는 벤더 독자 프로토콜만 열려 있어도, 장비 대부분은 LAN 내부로는
 *   표준 RTSP를 노출한다. 에이전트가 LAN에서 그 RTSP를 직접 물으면 된다.
 *
 * 의존성: Node.js 18+ 와 ffmpeg 뿐. npm 패키지 불필요(전부 Node 내장 모듈).
 *
 * 실행:
 *   1) 콘솔(WMS→CCTV→브리지)에서 브리지를 만들고 페어코드(API키)를 발급받는다.
 *   2) 이 폴더에서:  PAIR_CODE=XXXX CLOUD=https://www.genieroi.com node bridge.js
 *      (최초 1회 페어링 후 bridge-config.json 에 토큰 저장 → 이후 인자 없이 node bridge.js)
 *   3) 콘솔에서 카메라를 "브리지 경유"로 등록하고 "실시간 보기" → 자동 재생.
 *
 * ONVIF 자동발견(선택): LAN에 WS-Discovery 프로브를 쏘아 장비 모델/서비스주소를
 *   찾아 클라우드로 보고한다(콘솔에서 클릭 등록 편의). 자격증명은 콘솔에서 입력.
 * ============================================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const dgram = require('dgram');
const { spawn } = require('child_process');
const { URL } = require('url');

const VERSION = '1.0.0';
const CONFIG_PATH = path.join(__dirname, 'bridge-config.json');
const WORK_ROOT = path.join(os.tmpdir(), 'genie-cctv-bridge');

const CLOUD = (process.env.CLOUD || process.env.GENIE_CLOUD || '').replace(/\/+$/, '');
const PAIR_CODE = process.env.PAIR_CODE || process.argv[2] || '';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// 실제 사용하는 클라우드 주소 — 최초 CLOUD 환경변수, 이후 bridge-config.json 의 cloud 로 갱신.
let cloudBase = CLOUD;

/* ───────────────────────── 유틸: HTTP 요청 ───────────────────────── */

function request(method, urlStr, { headers = {}, body = null, query = null } = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
        const lib = u.protocol === 'https:' ? https : http;
        const req = lib.request(u, { method, headers, timeout: 30000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function apiJson(method, pathname, token, obj) {
    const r = await request(method, cloudBase + pathname, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: obj ? JSON.stringify(obj) : null,
    });
    let parsed = null;
    try { parsed = JSON.parse(r.body.toString('utf8')); } catch { /* non-json */ }
    return { status: r.status, json: parsed, raw: r.body };
}

/* ───────────────────────── 설정 로드/저장/페어링 ───────────────────────── */

function loadConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return null; }
}
function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

async function pair() {
    if (!cloudBase) throw new Error('CLOUD 환경변수가 필요합니다. 예: CLOUD=https://www.genieroi.com');
    if (!PAIR_CODE) throw new Error('최초 실행은 페어코드가 필요합니다. 예: PAIR_CODE=ABCD1234 node bridge.js');
    log('페어링 시도…');
    const r = await apiJson('POST', '/api/wms/cctv/bridge/pair', null, { pair_code: PAIR_CODE, version: VERSION });
    if (r.status !== 200 || !r.json?.ok) throw new Error('페어링 실패: ' + (r.json?.error || r.status));
    const cfg = { cloud: cloudBase, token: r.json.token, bridgeId: r.json.bridge_id, name: r.json.name };
    saveConfig(cfg);
    log(`페어링 완료 — 브리지 "${cfg.name}" (#${cfg.bridgeId}). 토큰을 ${CONFIG_PATH} 에 저장했습니다.`);
    return cfg;
}

/* ───────────────────────── ffmpeg 스트림 관리 ───────────────────────── */

const streams = new Map(); // camId -> { proc, dir, uploaded:Set, uploading:bool, url }

function camDir(camId) { return path.join(WORK_ROOT, 'cam' + camId); }

function startStream(cam, token) {
    const dir = camDir(cam.id);
    fs.mkdirSync(dir, { recursive: true });
    const src = cam.rtsp_url || cam.direct_url;
    if (!src) { log(`[cam ${cam.id}] RTSP/URL 없음 — 건너뜀`); return; }

    const args = [
        '-nostdin', '-loglevel', 'error',
        '-rtsp_transport', 'tcp', '-rw_timeout', '5000000',
        '-i', src,
        '-an', '-c:v', 'copy',
        '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
        '-hls_flags', 'delete_segments+omit_endlist+independent_segments',
        '-hls_segment_filename', path.join(dir, 'seg%d.ts'),
        path.join(dir, 'index.m3u8'),
    ];
    log(`[cam ${cam.id}] "${cam.name}" 송출 시작 (${cam.protocol})`);
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errbuf = '';
    proc.stderr.on('data', (d) => { errbuf = (errbuf + d.toString()).slice(-500); });
    proc.on('exit', (code) => {
        const s = streams.get(cam.id);
        log(`[cam ${cam.id}] ffmpeg 종료(code=${code})` + (errbuf ? ' · ' + errbuf.trim().split('\n').pop() : ''));
        if (s && s.proc === proc) streams.delete(cam.id);
    });
    streams.set(cam.id, { proc, dir, uploaded: new Set(), uploading: false, url: src });
}

function stopStream(camId) {
    const s = streams.get(camId);
    if (!s) return;
    log(`[cam ${camId}] 송출 중지`);
    try { s.proc.kill('SIGTERM'); } catch { /* noop */ }
    streams.delete(camId);
    try { fs.rmSync(s.dir, { recursive: true, force: true }); } catch { /* noop */ }
}

/** 세그먼트 먼저, 그다음 재생목록을 업로드(재생목록이 미업로드 세그먼트를 참조하지 않도록). */
async function uploadStream(cam, token) {
    const s = streams.get(cam.id);
    if (!s || s.uploading) return;
    const m3u8Path = path.join(s.dir, 'index.m3u8');
    if (!fs.existsSync(m3u8Path)) return; // 아직 첫 세그먼트 전
    s.uploading = true;
    try {
        const m3u8 = fs.readFileSync(m3u8Path, 'utf8');
        const segs = (m3u8.match(/seg\d+\.ts/g) || []);
        for (const seg of segs) {
            if (s.uploaded.has(seg)) continue;
            const p = path.join(s.dir, seg);
            if (!fs.existsSync(p)) continue;
            const r = await request('POST', cloudBase + cam.ingest_path, {
                headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer ' + token },
                query: { file: seg },
                body: fs.readFileSync(p),
            });
            if (r.status === 200) s.uploaded.add(seg);
            else if (r.status === 403 || r.status === 401) { log(`[cam ${cam.id}] ingest 거부(${r.status})`); break; }
        }
        // 오래된 업로드 기록 정리(list_size 초과분)
        if (s.uploaded.size > 24) { const keep = new Set(segs); s.uploaded = new Set([...s.uploaded].filter((x) => keep.has(x))); }
        await request('POST', cloudBase + cam.ingest_path, {
            headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer ' + token },
            query: { file: 'index.m3u8' },
            body: Buffer.from(m3u8, 'utf8'),
        });
    } catch (e) {
        log(`[cam ${cam.id}] 업로드 오류: ${e.message}`);
    } finally {
        s.uploading = false;
    }
}

/* ───────────────────────── 메인 폴 루프 ───────────────────────── */

async function pollOnce(cfg) {
    const r = await apiJson('GET', '/api/wms/cctv/bridge/poll', cfg.token);
    if (r.status === 401) throw new Error('토큰이 무효화되었습니다. 콘솔에서 페어코드를 재발급해 다시 페어링하세요.');
    if (r.status !== 200 || !r.json?.ok) { log('poll 실패: ' + (r.json?.error || r.status)); return; }
    const cams = r.json.cameras || [];
    const wantedIds = new Set(cams.filter((c) => c.wanted).map((c) => c.id));

    // 요청된 카메라는 켜고, 요청 해제된 카메라는 끈다(on-demand → CPU 절약).
    for (const cam of cams) {
        if (cam.wanted) {
            if (!streams.has(cam.id)) startStream(cam, cfg.token);
            await uploadStream(cam, cfg.token);
        }
    }
    for (const camId of [...streams.keys()]) {
        if (!wantedIds.has(camId)) stopStream(camId);
    }
}

async function heartbeat(cfg, discovered) {
    try {
        await apiJson('POST', '/api/wms/cctv/bridge/heartbeat', cfg.token, {
            version: VERSION,
            ...(discovered ? { discovered } : {}),
        });
    } catch (e) { log('heartbeat 오류: ' + e.message); }
}

/* ───────────────────────── ONVIF WS-Discovery (best-effort) ───────────────────────── */

function onvifDiscover(timeoutMs = 3000) {
    return new Promise((resolve) => {
        const found = new Map(); // xaddr -> {address, model, xaddr}
        let sock;
        try { sock = dgram.createSocket({ type: 'udp4', reuseAddr: true }); } catch { return resolve([]); }
        const msgId = 'urn:uuid:' + crypto_uuid();
        const probe = Buffer.from(
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">` +
            `<e:Header><w:MessageID>${msgId}</w:MessageID>` +
            `<w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>` +
            `<w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>` +
            `<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>`,
            'utf8'
        );
        sock.on('message', (msg) => {
            const s = msg.toString('utf8');
            const xaddr = (s.match(/<[^>]*XAddrs>([^<]+)</i) || [])[1];
            const scopes = (s.match(/<[^>]*Scopes>([^<]+)</i) || [])[1] || '';
            if (xaddr) {
                const first = xaddr.trim().split(/\s+/)[0];
                let addr = ''; try { addr = new URL(first).host; } catch { /* noop */ }
                const model = decodeURIComponent((scopes.match(/onvif:\/\/www\.onvif\.org\/(?:name|hardware)\/([^\s]+)/i) || [])[1] || '');
                found.set(first, { address: addr, model: model.replace(/_/g, ' '), xaddr: first });
            }
        });
        sock.on('error', () => { try { sock.close(); } catch {} resolve([]); });
        sock.bind(() => {
            try { sock.setBroadcast(true); sock.setMulticastTTL(2); } catch { /* noop */ }
            sock.send(probe, 3702, '239.255.255.250');
        });
        setTimeout(() => { try { sock.close(); } catch {} resolve([...found.values()]); }, timeoutMs);
    });
}

function crypto_uuid() {
    // Node 내장 crypto.randomUUID (Node 14.17+)
    try { return require('crypto').randomUUID(); } catch { return 'x' + Date.now(); }
}

/* ───────────────────────── 부트 ───────────────────────── */

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`[${ts}] ${msg}`);
}

async function main() {
    fs.mkdirSync(WORK_ROOT, { recursive: true });
    log(`GenieROI CCTV 브리지 v${VERSION}`);

    let cfg = loadConfig();
    if (cfg && cfg.token) {
        // 저장된 설정: cloud 우선순위 = CLOUD 환경변수(재지정) > config.cloud
        cloudBase = CLOUD || cfg.cloud || cloudBase;
        cfg.cloud = cloudBase;
    } else {
        cfg = await pair(); // pair() 는 cloudBase 를 사용
    }
    if (!cloudBase) throw new Error('cloud 주소를 알 수 없습니다. CLOUD 환경변수를 지정하세요.');

    // ffmpeg 확인
    try {
        await new Promise((resolve, reject) => {
            const p = spawn(FFMPEG, ['-version']);
            p.on('error', reject); p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('exit ' + c))));
        });
    } catch {
        log('⚠ ffmpeg 를 찾을 수 없습니다. ffmpeg 설치 후 재실행하세요 (https://ffmpeg.org).');
    }

    // 폴 루프 + 주기적 ONVIF 발견/하트비트
    let discTick = 0;
    const interval = (cfg.pollInterval || 5) * 1000;
    log(`폴링 시작 (${interval / 1000}s 간격). Ctrl+C 로 종료.`);
    const tick = async () => {
        try { await pollOnce(cfg); } catch (e) {
            log('오류: ' + e.message);
            if (/무효화/.test(e.message)) process.exit(1);
        }
        // 6폴(≈30s)마다 하트비트, 12폴(≈60s)마다 ONVIF 재발견
        if (discTick % 12 === 0) {
            const dev = await onvifDiscover().catch(() => []);
            if (dev.length) log(`ONVIF 발견 ${dev.length}대: ` + dev.map((d) => `${d.address}${d.model ? '(' + d.model + ')' : ''}`).join(', '));
            await heartbeat(cfg, dev);
        } else if (discTick % 6 === 0) {
            await heartbeat(cfg);
        }
        discTick++;
    };
    await tick();
    setInterval(tick, interval);
}

process.on('SIGINT', () => { log('종료 중…'); for (const id of [...streams.keys()]) stopStream(id); process.exit(0); });

main().catch((e) => { log('치명적 오류: ' + e.message); process.exit(1); });
