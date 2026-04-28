import React, { useState, useCallback, useRef } from "react";
import { useT } from '../i18n/index.js';

const AD_PLATFORMS = [
  {id:'popup',icon:'\ud83d\udcf0',color:'#f97316',w:800,h:600},
  {id:'instagram',icon:'\ud83d\udcf7',color:'#e1306c',w:1080,h:1080},
  {id:'tiktok',icon:'\ud83c\udfb5',color:'#ff0050',w:1080,h:1920},
  {id:'kakao',icon:'\ud83d\udce8',color:'#fee500',w:800,h:400},
  {id:'custom',icon:'\ud83c\udfa8',color:'#a855f7',w:1200,h:628},
];

/* ─── Premium Design Theme Engine ─── */
const THEMES = {
  sale:      { gradients:['#ff6b35','#f72585','#b5179e'], emoji:'\ud83d\udd25', badge:'SALE', pattern:'circles' },
  newProduct:{ gradients:['#4361ee','#3a0ca3','#7209b7'], emoji:'\u2728', badge:'NEW', pattern:'diamonds' },
  seasonal:  { gradients:['#06d6a0','#118ab2','#073b4c'], emoji:'\ud83c\udf3f', badge:'SEASON', pattern:'waves' },
  holiday:   { gradients:['#e63946','#457b9d','#1d3557'], emoji:'\ud83c\udf89', badge:'HOLIDAY', pattern:'stars' },
  flash:     { gradients:['#ff006e','#fb5607','#ffbe0b'], emoji:'\u26a1', badge:'FLASH', pattern:'lightning' },
  brand:     { gradients:['#2d00f7','#6a00f4','#8900f2'], emoji:'\ud83d\udc8e', badge:'BRAND', pattern:'grid' },
};

const SEASON_OVERLAY = {
  spring: { emoji:'\ud83c\udf38', colors:['#fce4ec','#f8bbd0','#f48fb1'], accent:'#e91e63' },
  summer: { emoji:'\u2600\ufe0f', colors:['#fff3e0','#ffe0b2','#ffcc80'], accent:'#ff9800' },
  autumn: { emoji:'\ud83c\udf42', colors:['#fff8e1','#ffecb3','#ffe082'], accent:'#ff6f00' },
  winter: { emoji:'\u2744\ufe0f', colors:['#e3f2fd','#bbdefb','#90caf9'], accent:'#1565c0' },
};

const CATEGORY_SCHEMES = {
  food:     { bg:'linear-gradient(135deg,#ff9a3c,#ff6f00)', icon:'\ud83c\udf54', label:'Food & Beverage' },
  fashion:  { bg:'linear-gradient(135deg,#ec407a,#ab47bc)', icon:'\ud83d\udc57', label:'Fashion' },
  beauty:   { bg:'linear-gradient(135deg,#f48fb1,#ce93d8)', icon:'\ud83d\udc84', label:'Beauty' },
  tech:     { bg:'linear-gradient(135deg,#42a5f5,#1565c0)', icon:'\ud83d\udcf1', label:'Tech & Electronics' },
  home:     { bg:'linear-gradient(135deg,#66bb6a,#2e7d32)', icon:'\ud83c\udfe0', label:'Home & Living' },
  travel:   { bg:'linear-gradient(135deg,#26c6da,#00838f)', icon:'\u2708\ufe0f', label:'Travel' },
  fitness:  { bg:'linear-gradient(135deg,#ef5350,#c62828)', icon:'\ud83c\udfcb\ufe0f', label:'Fitness & Health' },
  general:  { bg:'linear-gradient(135deg,#7e57c2,#4527a0)', icon:'\ud83d\udccc', label:'General' },
};

function drawPattern(ctx, type, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  if (type === 'circles') {
    for (let i = 0; i < 25; i++) { ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, Math.random()*60+15, 0, Math.PI*2); ctx.stroke(); }
  } else if (type === 'diamonds') {
    for (let i = 0; i < 18; i++) { const x=Math.random()*w,y=Math.random()*h,s=Math.random()*40+20; ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-s/2,-s/2,s,s);ctx.restore(); }
  } else if (type === 'waves') {
    for (let y = 0; y < h; y += 60) { ctx.beginPath(); for (let x = 0; x <= w; x += 5) { ctx.lineTo(x, y + Math.sin(x*0.02+y)*20); } ctx.stroke(); }
  } else if (type === 'stars') {
    for (let i = 0; i < 30; i++) { const x=Math.random()*w,y=Math.random()*h,r=Math.random()*8+3; ctx.beginPath(); for(let j=0;j<5;j++){ctx.lineTo(x+r*Math.cos(j*Math.PI*2/5-Math.PI/2),y+r*Math.sin(j*Math.PI*2/5-Math.PI/2));ctx.lineTo(x+r*0.4*Math.cos(j*Math.PI*2/5+Math.PI/5-Math.PI/2),y+r*0.4*Math.sin(j*Math.PI*2/5+Math.PI/5-Math.PI/2));}ctx.closePath();ctx.fill(); }
  } else if (type === 'lightning') {
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { let x=Math.random()*w,y=0; ctx.beginPath();ctx.moveTo(x,y); for(let j=0;j<6;j++){x+=Math.random()*60-30;y+=Math.random()*h/6;ctx.lineTo(x,y);}ctx.stroke(); }
  } else {
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  }
  ctx.restore();
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ─── Prompt-Intelligent Scene Detection Engine ─── */
const SCENE_LIBRARY = [
  { keywords:['해변','바다','beach','ocean','sea','서핑','surf','wave','파도'], scene:'beach', gradients:['#00b4d8','#0077b6','#023e8a'], emojis:['🏖️','🌊','☀️','🐚','🌴','🏄'], pattern:'waves', atmosphere:'warm' },
  { keywords:['산','mountain','숲','forest','자연','nature','하이킹','hiking','캠핑','camping'], scene:'nature', gradients:['#2d6a4f','#40916c','#52b788'], emojis:['🏔️','🌲','🦋','🍃','⛺','🌿'], pattern:'waves', atmosphere:'fresh' },
  { keywords:['도시','city','urban','빌딩','building','야경','night','네온','neon','거리','street'], scene:'city', gradients:['#14213d','#1b263b','#415a77'], emojis:['🏙️','🌃','✨','🚗','💡','🌆'], pattern:'grid', atmosphere:'cool' },
  { keywords:['음식','food','맛있','delicious','요리','cook','레스토랑','restaurant','카페','cafe','coffee','커피'], scene:'food', gradients:['#ff6b35','#ff9f1c','#e8ac65'], emojis:['🍕','🍰','☕','🥂','🍷','🍳'], pattern:'circles', atmosphere:'warm' },
  { keywords:['패션','fashion','옷','cloth','스타일','style','모델','model','뷰티','beauty','화장','makeup'], scene:'fashion', gradients:['#9d4edd','#c77dff','#e0aaff'], emojis:['👗','💄','👠','💍','🌹','✨'], pattern:'diamonds', atmosphere:'luxe' },
  { keywords:['스포츠','sports','운동','exercise','피트니스','fitness','러닝','running','헬스','gym'], scene:'sports', gradients:['#ef233c','#d90429','#2b2d42'], emojis:['🏃','💪','🏋️','⚡','🔥','🎯'], pattern:'lightning', atmosphere:'energetic' },
  { keywords:['우주','space','별','star','은하','galaxy','달','moon','행성','planet'], scene:'space', gradients:['#0d0221','#240046','#3c096c'], emojis:['🌌','🚀','⭐','🌙','🪐','✨'], pattern:'stars', atmosphere:'cosmic' },
  { keywords:['꽃','flower','정원','garden','봄','spring','벚꽃','cherry','로맨틱','romantic','사랑','love'], scene:'floral', gradients:['#ff6b6b','#ee5a9f','#ff85a2'], emojis:['🌸','🌺','🌷','💐','🦋','💕'], pattern:'circles', atmosphere:'romantic' },
  { keywords:['파티','party','축하','celebrate','생일','birthday','축제','festival','환호','cheer','즐겁','happy','joy','fun'], scene:'party', gradients:['#f72585','#b5179e','#7209b7'], emojis:['🎉','🥳','🎊','🎈','🍾','💃'], pattern:'stars', atmosphere:'festive' },
  { keywords:['테크','tech','기술','technology','AI','디지털','digital','코딩','coding','로봇','robot'], scene:'tech', gradients:['#00f5d4','#00bbf9','#9b5de5'], emojis:['🤖','💻','📱','🔮','⚙️','🧬'], pattern:'grid', atmosphere:'futuristic' },
  { keywords:['겨울','winter','눈','snow','크리스마스','christmas','따뜻','warm','코코아','cocoa'], scene:'winter', gradients:['#a2d2ff','#bde0fe','#cdb4db'], emojis:['❄️','⛄','🎄','🧣','🎅','🕯️'], pattern:'stars', atmosphere:'cozy' },
  { keywords:['여름','summer','수영','swim','아이스','ice','시원','cool','열대','tropical'], scene:'summer', gradients:['#f77f00','#fcbf49','#eae2b7'], emojis:['🌴','🍹','🕶️','🌺','🏊','🍉'], pattern:'waves', atmosphere:'tropical' },
  { keywords:['여자','woman','girl','소녀','lady','아름다','beautiful','pretty','gorgeous','사람','person','남자','man','boy'], scene:'portrait', gradients:['#ff758f','#ff7eb3','#ff9a8b'], emojis:['💃','✨','🌟','💫','👑','🌈'], pattern:'circles', atmosphere:'glamour' },
  { keywords:['럭셔리','luxury','프리미엄','premium','골드','gold','VIP','특별','special','고급','exclusive'], scene:'luxury', gradients:['#b8860b','#daa520','#ffd700'], emojis:['💎','👑','🥂','🌟','✨','🏆'], pattern:'diamonds', atmosphere:'luxe' },
];

const ATMOSPHERE_FX = {
  warm:     { particleColor:'rgba(255,200,100,0.3)', glowColor:'rgba(255,165,0,0.15)', lightAngle:0.3 },
  fresh:    { particleColor:'rgba(100,255,150,0.2)', glowColor:'rgba(0,200,100,0.1)', lightAngle:0.5 },
  cool:     { particleColor:'rgba(100,150,255,0.2)', glowColor:'rgba(50,100,200,0.12)', lightAngle:0.7 },
  luxe:     { particleColor:'rgba(255,215,0,0.25)', glowColor:'rgba(200,150,50,0.15)', lightAngle:0.4 },
  energetic:{ particleColor:'rgba(255,50,50,0.2)', glowColor:'rgba(255,100,0,0.15)', lightAngle:0.6 },
  cosmic:   { particleColor:'rgba(200,150,255,0.3)', glowColor:'rgba(100,0,200,0.2)', lightAngle:0.8 },
  romantic: { particleColor:'rgba(255,150,200,0.25)', glowColor:'rgba(255,100,150,0.15)', lightAngle:0.3 },
  festive:  { particleColor:'rgba(255,200,0,0.3)', glowColor:'rgba(255,50,150,0.15)', lightAngle:0.5 },
  futuristic:{ particleColor:'rgba(0,255,200,0.2)', glowColor:'rgba(0,150,255,0.15)', lightAngle:0.6 },
  tropical: { particleColor:'rgba(255,180,50,0.25)', glowColor:'rgba(255,150,0,0.12)', lightAngle:0.3 },
  cozy:     { particleColor:'rgba(200,180,255,0.2)', glowColor:'rgba(150,100,200,0.1)', lightAngle:0.4 },
  glamour:  { particleColor:'rgba(255,180,220,0.25)', glowColor:'rgba(255,100,200,0.15)', lightAngle:0.35 },
};

function detectScene(prompt) {
  if (!prompt || !prompt.trim()) return null;
  const lower = prompt.toLowerCase();
  let bestMatch = null, bestScore = 0;
  for (const scene of SCENE_LIBRARY) {
    let score = 0;
    for (const kw of scene.keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length;  // longer keyword = higher relevance
    }
    if (score > bestScore) { bestScore = score; bestMatch = scene; }
  }
  // Match multiple scenes for richer visuals
  const secondaryEmojis = [];
  for (const scene of SCENE_LIBRARY) {
    if (scene === bestMatch) continue;
    for (const kw of scene.keywords) {
      if (lower.includes(kw.toLowerCase())) { secondaryEmojis.push(...scene.emojis.slice(0,2)); break; }
    }
  }
  return bestMatch ? { ...bestMatch, secondaryEmojis } : null;
}

function drawAtmosphere(ctx, W, H, atmosphere, emojis) {
  const fx = ATMOSPHERE_FX[atmosphere] || ATMOSPHERE_FX.warm;
  // Atmospheric light beam
  ctx.save();
  ctx.globalAlpha = 0.08;
  const beamGrad = ctx.createRadialGradient(W*fx.lightAngle, 0, 0, W*0.5, H*0.5, W);
  beamGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
  beamGrad.addColorStop(0.5, fx.glowColor);
  beamGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  
  // Floating particles
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 4 + 1;
    ctx.globalAlpha = Math.random() * 0.4 + 0.1;
    ctx.fillStyle = fx.particleColor;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  
  // Floating emojis scattered across the canvas
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * W * 0.9 + W * 0.05;
    const y = Math.random() * H * 0.9 + H * 0.05;
    const size = Math.round(W * 0.04 + Math.random() * W * 0.03);
    ctx.globalAlpha = Math.random() * 0.25 + 0.08;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    ctx.fillText(emoji, x, y);
  }
  ctx.restore();
}

function generatePremiumImage(form, t) {
  const plat = AD_PLATFORMS.find(p=>p.id===form.platform) || AD_PLATFORMS[0];
  const theme = THEMES[form.eventType] || THEMES.sale;
  const season = SEASON_OVERLAY[form.season] || SEASON_OVERLAY.spring;
  const cat = CATEGORY_SCHEMES[form.category] || CATEGORY_SCHEMES.general;
  const W = plat.w, H = plat.h;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Prompt-aware scene detection ──
  const promptText = form.customPrompt || '';
  const sceneMatch = detectScene(promptText);
  const usePromptScene = sceneMatch && promptText.trim().length > 2;
  const activeGradients = usePromptScene ? sceneMatch.gradients : theme.gradients;
  const activePattern = usePromptScene ? sceneMatch.pattern : theme.pattern;
  const activeEmojis = usePromptScene ? [...sceneMatch.emojis, ...sceneMatch.secondaryEmojis] : [cat.icon, season.emoji, theme.emoji];
  const activeAtmosphere = usePromptScene ? sceneMatch.atmosphere : 'warm';

  // 1) Multi-stop gradient background
  const grad = ctx.createLinearGradient(0,0,W,H);
  activeGradients.forEach((c,i)=>grad.addColorStop(i/(activeGradients.length-1),c));
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // 2) Secondary gradient sweep
  ctx.save();
  ctx.globalAlpha = 0.2;
  const sweep = ctx.createLinearGradient(W,0,0,H);
  const secColors = usePromptScene ? sceneMatch.gradients.slice().reverse() : season.colors;
  secColors.forEach((c,i)=>sweep.addColorStop(i/(secColors.length-1),c));
  ctx.fillStyle = sweep;
  ctx.fillRect(0,0,W,H);
  ctx.restore();

  // 3) Atmospheric effects (scene-aware)
  drawAtmosphere(ctx, W, H, activeAtmosphere, activeEmojis);

  // 4) Pattern overlay
  drawPattern(ctx, activePattern, W, H);

  // 5) Decorative floating elements
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    const x = Math.random()*W, y = Math.random()*H, r = Math.random()*80+30;
    const cGrad = ctx.createRadialGradient(x,y,0,x,y,r);
    cGrad.addColorStop(0,'rgba(255,255,255,0.4)');
    cGrad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = cGrad; ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.globalAlpha = 1;

  // 6) Glass card center panel  
  const cardW = W*0.82, cardH = H*0.55;
  const cardX = (W-cardW)/2, cardY = (H-cardH)/2 - H*0.02;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#fff';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();
  ctx.restore();

  // 7) Scene emojis row at top of card
  if (usePromptScene) {
    ctx.save();
    const topEmojis = sceneMatch.emojis.slice(0, 4);
    const emojiSize = Math.round(W * 0.045);
    ctx.font = `${emojiSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    const spacing = cardW / (topEmojis.length + 1);
    topEmojis.forEach((e, i) => ctx.fillText(e, cardX + spacing * (i + 1), cardY + emojiSize + 12));
    ctx.restore();
  } else {
    // Category icon + Season emoji top-left badge
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.font = `bold ${Math.round(W*0.035)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`${cat.icon} ${season.emoji}`, cardX+24, cardY+Math.round(cardH*0.12));
    ctx.restore();
  }

  // 8) Event badge top-right
  const badgeLabel = usePromptScene ? sceneMatch.scene.toUpperCase() : theme.badge;
  const badgeEmoji = usePromptScene ? sceneMatch.emojis[0] : theme.emoji;
  const badgeText = `${badgeEmoji} ${badgeLabel}`;
  ctx.save();
  ctx.font = `bold ${Math.round(W*0.022)}px sans-serif`;
  const badgeW = ctx.measureText(badgeText).width + 28;
  const bx = cardX+cardW-badgeW-16, by = cardY+16;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  drawRoundRect(ctx, bx, by, badgeW, 32, 16);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, bx+badgeW/2, by+22);
  ctx.restore();

  // 9) Title text with shadow
  ctx.save();
  const titleSize = Math.round(W*0.055);
  ctx.font = `900 ${titleSize}px "Segoe UI","Noto Sans KR",sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
  // Use prompt as title if no explicit title
  const displayTitle = form.title || (usePromptScene ? promptText.slice(0, 30) : 'PROMOTION');
  const words = displayTitle.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > cardW * 0.85) { lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  const lineH = titleSize * 1.2;
  const startY = cardY + cardH * 0.35 - (lines.length - 1) * lineH / 2;
  lines.forEach((line, i) => ctx.fillText(line, W/2, startY + i * lineH));
  ctx.restore();

  // 10) Event type subtitle or prompt scene label
  const eventLabel = {sale:t('operations.ai_sale'),newProduct:t('operations.ai_newProduct'),seasonal:t('operations.ai_seasonal'),holiday:t('operations.ai_holiday'),flash:t('operations.ai_flash'),brand:t('operations.ai_brand')};
  const seasonLabel = {spring:t('operations.ai_spring'),summer:t('operations.ai_summer'),autumn:t('operations.ai_autumn'),winter:t('operations.ai_winter')};
  ctx.save();
  ctx.font = `bold ${Math.round(W*0.028)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  if (usePromptScene && promptText.length > 30) {
    ctx.fillText(promptText.slice(30, 70), W/2, startY + lines.length * lineH + 10);
  } else {
    ctx.fillText(`${eventLabel[form.eventType]||form.eventType}  |  ${seasonLabel[form.season]||form.season}`, W/2, startY + lines.length * lineH + 10);
  }
  ctx.restore();

  // 11) Description / custom prompt display
  const displayDesc = form.description || (usePromptScene && promptText.length > 70 ? promptText.slice(70) : '');
  if (displayDesc) {
    ctx.save();
    ctx.font = `${Math.round(W*0.02)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    const desc = displayDesc.length > 60 ? displayDesc.slice(0,60)+'...' : displayDesc;
    ctx.fillText(desc, W/2, startY + lines.length * lineH + 50);
    ctx.restore();
  }

  // 12) CTA button if link URL
  if (form.useLinkUrl && form.linkUrl) {
    const btnW = Math.round(W*0.28), btnH = Math.round(H*0.06);
    const btnX = (W-btnW)/2, btnY = cardY + cardH - btnH - 24;
    ctx.save();
    const btnGrad = ctx.createLinearGradient(btnX,btnY,btnX+btnW,btnY+btnH);
    btnGrad.addColorStop(0,'#fff');btnGrad.addColorStop(1,'#f0f0f0');
    ctx.fillStyle = btnGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';ctx.shadowBlur = 12;ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, btnX, btnY, btnW, btnH, btnH/2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = activeGradients[0];
    ctx.font = `bold ${Math.round(btnH*0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`\ud83d\udd17 ${t('operations.ai_goNow')}`, W/2, btnY + btnH*0.65);
    ctx.restore();
  }

  // 13) Platform watermark bottom
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.font = `bold ${Math.round(W*0.016)}px sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${plat.icon} ${plat.id.toUpperCase()} | Geniego-ROI`, W/2, H - 20);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function Modal({title,onClose,children}) {
  return (<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:300}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(820px,95vw)",maxHeight:"90vh",overflowY:"auto",background:"linear-gradient(180deg,var(--surface),#090f1e)",border:"1px solid rgba(99,140,255,0.2)",borderRadius:20,padding:28,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,alignItems:"center"}}>
        <div style={{fontWeight:800,fontSize:16,color:"var(--text-1)"}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-3)",fontSize:18}}>{"\u2715"}</button>
      {children}
  </>
        </div>
    </div>
);
}

export default function CreativeStudioTab({ onUseCampaign, sourcePage = 'auto-marketing' }) {
  const t = useT();
  const [creatives,setCreatives] = useState([]);
  const [modal,setModal] = useState(null);
  const [generating,setGenerating] = useState(false);
  const [saving,setSaving] = useState(false);
  const [dupWarning,setDupWarning] = useState(null);
  const [form,setForm] = useState({});
  const [editId,setEditId] = useState(null);
  const [changePrompt,setChangePrompt] = useState('');
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));

  /* ── 서버에서 크리에이티브 로드 ── */
  const loadCreatives = async (platform) => {
    try {
      const token = localStorage.getItem('token') || '';
      const qs = platform ? `?platform=${platform}` : '';
      const r = await fetch(`/api/creatives${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setCreatives((data.creatives || []).map(c => ({
          ...c,
          image: c.image_data || null,
          eventType: c.event_type,
          linkUrl: c.link_url,
          createdAt: (c.created_at || '').slice(0, 10),
        })));
      }
    } catch (e) { console.warn('[CreativeStore] load failed', e); }
  };

  React.useEffect(() => { loadCreatives(); }, []);

  const openNew=()=>{
    setForm({title:'',eventType:'sale',description:'',season:'spring',platform:'popup',category:'general',customPrompt:'',linkUrl:'',useLinkUrl:false,uploadedImage:null,generatedImage:null});
    setEditId(null);setChangePrompt('');setDupWarning(null);
    setModal('new');
  };

  const handleGenerate=async()=>{
    setGenerating(true);
    await new Promise(r=>setTimeout(r,1500));
    const imageUrl = generatePremiumImage(form, t);
    setForm(f=>({...f,generatedImage:imageUrl,uploadedImage:null}));
    setGenerating(false);
  };

  /* ─── Image Change / Regenerate with prompt ─── */
  const handleRegenerate=async()=>{
    if(!changePrompt.trim()) return;
    setGenerating(true);
    await new Promise(r=>setTimeout(r,1500));
    // Apply the change prompt by merging it into customPrompt and regenerating
    const updatedForm = {...form, customPrompt: changePrompt};
    // Parse intent from the change prompt for smarter regen
    const lower = changePrompt.toLowerCase();
    if(lower.includes('christmas')||lower.includes('holiday')||lower.includes('\ud06c\ub9ac\uc2a4\ub9c8\uc2a4')) updatedForm.eventType='holiday';
    if(lower.includes('flash')||lower.includes('\ud50c\ub798\uc2dc')) updatedForm.eventType='flash';
    if(lower.includes('new')||lower.includes('\uc2e0\uc0c1')) updatedForm.eventType='newProduct';
    if(lower.includes('summer')||lower.includes('\uc5ec\ub984')) updatedForm.season='summer';
    if(lower.includes('winter')||lower.includes('\uaca8\uc6b8')) updatedForm.season='winter';
    if(lower.includes('autumn')||lower.includes('\uac00\uc744')) updatedForm.season='autumn';
    if(lower.includes('spring')||lower.includes('\ubd04')) updatedForm.season='spring';
    if(lower.includes('food')||lower.includes('\uc74c\uc2dd')) updatedForm.category='food';
    if(lower.includes('fashion')||lower.includes('\ud328\uc158')) updatedForm.category='fashion';
    if(lower.includes('beauty')||lower.includes('\ubdf0\ud2f0')) updatedForm.category='beauty';
    if(lower.includes('tech')||lower.includes('\ud14c\ud06c')) updatedForm.category='tech';
    if(lower.includes('instagram')||lower.includes('\uc778\uc2a4\ud0c0')) updatedForm.platform='instagram';
    if(lower.includes('tiktok')||lower.includes('\ud2f1\ud1a1')) updatedForm.platform='tiktok';
    if(lower.includes('kakao')||lower.includes('\uce74\uce74\uc624')) updatedForm.platform='kakao';
    
    setForm(updatedForm);
    const imageUrl = generatePremiumImage(updatedForm, t);
    setForm(f=>({...f,...updatedForm,generatedImage:imageUrl,uploadedImage:null}));
    setChangePrompt('');
    setGenerating(false);
  };

  const handleUpload=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{setForm(f=>({...f,uploadedImage:ev.target.result,generatedImage:null}));};
    reader.readAsDataURL(file);
  };

  const saveCreative = async () => {
    const img = form.generatedImage || form.uploadedImage;
    if (!img && !form.title) return;
    setSaving(true); setDupWarning(null);
    const token = localStorage.getItem('token') || '';
    const payload = {
      title: form.title || '',
      platform: form.platform || 'popup',
      category: form.category || 'general',
      event_type: form.eventType || 'sale',
      season: form.season || 'spring',
      image_data: img || '',
      link_url: form.useLinkUrl ? (form.linkUrl || '') : '',
      source_page: sourcePage,
    };
    try {
      if (editId && typeof editId === 'number') {
        // 서버 업데이트
        await fetch(`/api/creatives/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        // 신규 저장 (중복 방지)
        const r = await fetch('/api/creatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (r.status === 409) {
          const dup = await r.json();
          setDupWarning(dup);
          setSaving(false);
          return; // 중복 감지 → 모달 유지, 경고 표시
        }
      }
      await loadCreatives();
      setModal(null); setEditId(null);
    } catch (e) {
      console.error('[CreativeStore] save failed', e);
      // 로컬 폴백: 서버 실패 시에도 로컬에 추가
      const entry = {
        id: editId || `CR-${String(creatives.length + 1).padStart(3, '0')}`,
        title: form.title, eventType: form.eventType, platform: form.platform,
        season: form.season, category: form.category || 'general', image: img,
        linkUrl: form.useLinkUrl ? form.linkUrl : '',
        createdAt: new Date().toISOString().slice(0, 10), status: 'ready',
      };
      if (editId) setCreatives(cs => cs.map(c => c.id === editId ? entry : c));
      else setCreatives(cs => [...cs, entry]);
      setModal(null); setEditId(null);
    }
    setSaving(false);
  };

  const deleteCreative = async (cr) => {
    if (!confirm(t('operations.ai_confirmDelete') || `"${cr.title}" 삭제?`)) return;
    if (typeof cr.id === 'number') {
      try {
        const token = localStorage.getItem('token') || '';
        await fetch(`/api/creatives/${cr.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        await loadCreatives();
      } catch (e) { console.warn('delete failed', e); }
    } else {
      setCreatives(cs => cs.filter(c => c.id !== cr.id));
    }
  };

  const openEdit=(cr)=>{
    setForm({...cr,useLinkUrl:!!cr.linkUrl,customPrompt:'',generatedImage:cr.image,uploadedImage:null});
    setEditId(cr.id);setChangePrompt('');setDupWarning(null);
    setModal('new');
  };

  const platformFilter = form._filter;
  const filtered = platformFilter ? creatives.filter(c=>c.platform===platformFilter) : creatives;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:'var(--text-3)'}}>{creatives.length} {t('operations.ai_creatives')}</div>
        <button className="btn-primary" onClick={openNew} style={{background:"linear-gradient(135deg,#a855f7,#ec4899)"}}>
          {"\ud83c\udfa8"} {t('operations.ai_createDesign')}
        </button>

      {/* Platform filter chips */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {AD_PLATFORMS.map(p=>(
          <span key={p.id} onClick={()=>setForm(f=>({...f,_filter:f._filter===p.id?null:p.id}))} style={{padding:'4px 12px',borderRadius:20,fontSize:10,fontWeight:700,background:platformFilter===p.id?p.color+'30':p.color+'15',color:p.color,border:`1px solid ${platformFilter===p.id?p.color:p.color+'33'}`,cursor:'pointer',transition:'all 200ms'}}>
            {p.icon} {t(`operations.ai_plat_${p.id}`)}
          </span>
        ))}

      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-3)'}}>
          <div style={{fontSize:48,marginBottom:12}}>{"\ud83c\udfa8"}</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{t('operations.ai_emptyTitle')}</div>
          <div style={{fontSize:11}}>{t('operations.ai_emptyDesc')}</div>
      )}

      {/* Creative grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {filtered.map(cr=>{
          const plat=AD_PLATFORMS.find(p=>p.id===cr.platform);
          return (
            <div key={cr.id} className="card card-glass" style={{padding:0,overflow:'hidden',borderTop:`3px solid ${plat?.color||'#4f8ef7'}`,cursor:'pointer',transition:'transform 200ms,box-shadow 200ms'}} 
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
              {cr.image&&(
                <div style={{width:'100%',height:220,backgroundImage:`url(${cr.image})`,backgroundSize:'cover',backgroundPosition:'center',position:'relative'}}>
                  <span style={{position:'absolute',top:8,right:8,padding:'2px 8px',borderRadius:12,fontSize:9,fontWeight:700,background:'rgba(0,0,0,0.6)',color: 'var(--text-1)'}}>{plat?.icon} {t(`operations.ai_plat_${cr.platform}`)}</span>
                  <span style={{position:'absolute',top:8,left:8,padding:'2px 8px',borderRadius:12,fontSize:9,fontWeight:700,background:plat?.color+'cc',color: 'var(--text-1)'}}>{THEMES[cr.eventType]?.emoji} {THEMES[cr.eventType]?.badge}</span>
              )}
              <div style={{padding:14}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:4}}>{cr.title}</div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:9,color:'var(--text-3)'}}>{cr.createdAt}</span>
                  <span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:'rgba(168,85,247,0.1)',color:'#a855f7',fontWeight:700}}>{CATEGORY_SCHEMES[cr.category]?.icon} {cr.category}</span>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {cr.linkUrl&&(
                    <a href={cr.linkUrl} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:700,background:'rgba(79,142,247,0.1)',color:'#4f8ef7',border:'1px solid rgba(79,142,247,0.2)',textDecoration:'none'}}>
                      {"\ud83d\udd17"} {t('operations.ai_goNow')}
                    </a>
                  )}
                  <button onClick={()=>openEdit(cr)} style={{padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:700,background:'rgba(168,85,247,0.1)',color:'#a855f7',border:'1px solid rgba(168,85,247,0.2)',cursor:'pointer'}}>
                    {"\u270f\ufe0f"} {t('operations.ai_editDesign')}
                  </button>
                  <button onClick={()=>deleteCreative(cr)} style={{padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:700,background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer'}}>
                    {"\ud83d\uddd1\ufe0f"} {t('operations.ai_deleteCreative') || '삭제'}
                  </button>
                  {onUseCampaign&&(
                    <button onClick={()=>onUseCampaign(cr.category,[cr.platform])} style={{padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:700,background:'rgba(34,197,94,0.1)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)',cursor:'pointer'}}>
                      {"\ud83d\ude80"} {t('operations.ai_applyCampaign')}
                    </button>
                  )}
              </div>
          
                  </div>
                </div>
              </div>
            </div>
      </div>
);
        })}

      {/* Create/Edit Modal */}
      {modal==='new'&&(
        <Modal title={`\ud83c\udfa8 ${editId ? t('operations.ai_editDesign') : t('operations.ai_createDesign')}`} onClose={()=>{setModal(null);setEditId(null);}}>
          <div style={{display:'grid',gap:14}}>
            {/* Platform selection */}
            <div>
              <label className="input-label">{t('operations.ai_selectPlatform')}</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                {AD_PLATFORMS.map(p=>(
                  <button key={p.id} onClick={()=>upd('platform',p.id)} style={{flex:1,padding:'10px 4px',borderRadius:10,border:form.platform===p.id?`2px solid ${p.color}`:'2px solid rgba(255,255,255,0.05)',background:form.platform===p.id?p.color+'15':'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'center',transition:'all 200ms'}}>
                    <div style={{fontSize:20}}>{p.icon}</div>
                    <div style={{fontSize:9,fontWeight:700,color:form.platform===p.id?p.color:'var(--text-3)',marginTop:4}}>{t(`operations.ai_plat_${p.id}`)}</div>
                    <div style={{fontSize:7,color:'var(--text-3)',marginTop:2}}>{p.w}x{p.h}</div>
                  </button>
                ))}
            </div>

            {/* Category */}
            <div>
              <label className="input-label">{t('operations.ai_category')}</label>
              <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                {Object.entries(CATEGORY_SCHEMES).map(([k,v])=>(
                  <button key={k} onClick={()=>upd('category',k)} style={{padding:'6px 12px',borderRadius:8,fontSize:10,fontWeight:700,border:form.category===k?'2px solid #a855f7':'2px solid rgba(255,255,255,0.05)',background:form.category===k?'rgba(168,85,247,0.12)':'rgba(255,255,255,0.03)',color:form.category===k?'#a855f7':'var(--text-3)',cursor:'pointer',transition:'all 200ms'}}>
                    {v.icon} {t(`operations.ai_cat_${k}`)}
                  </button>
                ))}
            </div>

            {/* Title & Event */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label className="input-label">{t('operations.ai_adTitle')}</label><input className="input" value={form.title||''} onChange={e=>upd('title',e.target.value)} placeholder={t('operations.ai_adTitlePh')}/></div>
              <div><label className="input-label">{t('operations.ai_eventType')}</label>
                <select className="input" value={form.eventType} onChange={e=>upd('eventType',e.target.value)}>
                  {['sale','newProduct','seasonal','holiday','flash','brand'].map(ev=>(
                    <option key={ev} value={ev}>{t(`operations.ai_${ev}`)}</option>
                  ))}
                </select>
            </div>

            {/* Description & Season */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}>
              <div><label className="input-label">{t('operations.ai_description')}</label><input className="input" value={form.description||''} onChange={e=>upd('description',e.target.value)} placeholder={t('operations.ai_descPh')}/></div>
              <div><label className="input-label">{t('operations.ai_season')}</label>
                <select className="input" value={form.season} onChange={e=>upd('season',e.target.value)}>
                  {['spring','summer','autumn','winter'].map(s=>(
                    <option key={s} value={s}>{t(`operations.ai_${s}`)}</option>
                  ))}
                </select>
            </div>

            {/* Custom AI Prompt */}
            <div>
              <label className="input-label">{"\ud83e\udd16"} {t('operations.ai_customPrompt')}</label>
              <textarea className="input" rows={2} value={form.customPrompt||''} onChange={e=>upd('customPrompt',e.target.value)} placeholder={t('operations.ai_customPromptPh')} style={{resize:'vertical',minHeight:50}}/>
              <div style={{fontSize:9,color:'var(--text-3)',marginTop:4}}>{t('operations.ai_customPromptHelp')}</div>

            {/* Link URL */}
            <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.1)'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,fontWeight:700,color:'#4f8ef7'}}>
                <input type="checkbox" checked={form.useLinkUrl||false} onChange={e=>upd('useLinkUrl',e.target.checked)}/>
                {"\ud83d\udd17"} {t('operations.ai_addLinkUrl')}
              </label>
              {form.useLinkUrl&&(
                <input className="input" style={{marginTop:8}} value={form.linkUrl||''} onChange={e=>upd('linkUrl',e.target.value)} placeholder="https://example.com/event"/>
              )}

            {/* ── Two Options: AI Generate OR Direct Upload ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
              {/* Option 1: AI Generate */}
              <button className="btn-primary" onClick={handleGenerate} disabled={generating} style={{background:'linear-gradient(135deg,#a855f7,#ec4899)',opacity:generating?0.6:1,padding:'14px 16px',fontSize:13,fontWeight:800}}>
                {generating?`\u23f3 ${t('operations.ai_generating')}...`:`\ud83e\udd16 ${t('operations.ai_generateAI')}`}
              </button>
              {/* OR divider */}
              <div style={{textAlign:'center',color:'var(--text-3)',fontSize:11,fontWeight:700}}>OR</div>
              {/* Option 2: Direct Upload */}
              <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'14px 16px',borderRadius:12,border:'2px dashed rgba(34,197,94,0.3)',background:'rgba(34,197,94,0.04)',cursor:'pointer',transition:'all 200ms',textAlign:'center'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(34,197,94,0.6)';e.currentTarget.style.background='rgba(34,197,94,0.08)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(34,197,94,0.3)';e.currentTarget.style.background='rgba(34,197,94,0.04)';}}>
                <input type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>
                <div style={{fontSize:20,marginBottom:4}}>{"\ud83d\udcc2"}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#22c55e'}}>{t('operations.ai_uploadCustom')}</div>
                <div style={{fontSize:8,color:'var(--text-3)',marginTop:2}}>JPG, PNG, GIF, WebP</div>
              </label>

            {/* Preview area */}
            {(form.generatedImage||form.uploadedImage)&&(
              <div>
                <div style={{borderRadius:12,overflow:'hidden',border:'1px solid rgba(168,85,247,0.2)'}}>
                  <img src={form.generatedImage||form.uploadedImage} alt="Preview" style={{width:'100%',maxHeight:420,objectFit:'contain',background:'#000'}}/>
                  {form.useLinkUrl&&form.linkUrl&&(
                    <div style={{padding:'8px 12px',background:'rgba(79,142,247,0.06)',fontSize:10,color:'#4f8ef7'}}>
                      {"\ud83d\udd17"} CTA: <a href={form.linkUrl} target="_blank" rel="noopener noreferrer" style={{color:'#4f8ef7'}}>{form.linkUrl}</a>
                  )}

                {/* ── Image Change Request ── */}
                <div style={{marginTop:12,padding:'14px 16px',borderRadius:12,background:'rgba(168,85,247,0.04)',border:'1px solid rgba(168,85,247,0.12)'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#a855f7',marginBottom:8}}>{"\u270f\ufe0f"} {t('operations.ai_changeImageTitle')}</div>
                  <div style={{display:'flex',gap:8}}>
                    <input className="input" style={{flex:1}} value={changePrompt} onChange={e=>setChangePrompt(e.target.value)} placeholder={t('operations.ai_changeImagePh')}
                      onKeyDown={e=>{if(e.key==='Enter'&&!generating)handleRegenerate();}}/>
                    <button className="btn-primary" onClick={handleRegenerate} disabled={generating||!changePrompt.trim()} style={{background:'linear-gradient(135deg,#6366f1,#a855f7)',whiteSpace:'nowrap',opacity:(generating||!changePrompt.trim())?0.5:1}}>
                      {generating?'\u23f3':'\ud83d\udd04'} {t('operations.ai_regenerate')}
                    </button>
                  <div style={{fontSize:9,color:'var(--text-3)',marginTop:6}}>{t('operations.ai_changeImageHelp')}</div>
              </div>
            )}

            {/* ── 중복 경고 ── */}
            {dupWarning && (
              <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.3)',marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:800,color:'#eab308',marginBottom:4}}>⚠️ {t('operations.ai_dupWarningTitle') || '동일한 크리에이티브가 이미 존재합니다'}</div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>
                  {t('operations.ai_dupWarningDesc') || '제목·플랫폼·카테고리·이벤트·시즌이 동일한 크리에이티브입니다.'}
                  {dupWarning.existing && <span style={{fontWeight:700,color:'#eab308'}}> (ID: {dupWarning.existing.id}, {dupWarning.existing.source_page}에서 생성)</span>}
                <button onClick={()=>setDupWarning(null)} style={{marginTop:8,padding:'4px 12px',borderRadius:6,border:'1px solid rgba(234,179,8,0.3)',background:'rgba(234,179,8,0.15)',color:'#eab308',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  {t('operations.ai_dupDismiss') || '무시하고 닫기'}
                </button>
            )}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn-ghost" onClick={()=>{setModal(null);setEditId(null);setDupWarning(null);}}>{t('operations.cancel')}</button>
              <button className="btn-primary" onClick={saveCreative} disabled={saving} style={{opacity:saving?0.6:1}}>
                {saving ? '⏳ ...' : t('operations.ai_saveCreative')}
              </button>
          </div>
        </Modal>
      )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
