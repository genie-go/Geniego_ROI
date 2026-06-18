import React, { useRef } from 'react';

/*
 * AvatarField (231차 #3) — 멤버/파트너/하위관리자 프로필 사진 등록·표시 공용 컴포넌트.
 * Base64 data-URL 저장(서버 photo 컬럼). 업로드 시 클라이언트에서 정사각 리사이즈(기본 160px)·JPEG 압축.
 *  - value: data-URL 문자열(없으면 이니셜 플레이스홀더)
 *  - onChange(dataUrl): editable 일 때 새 사진 선택 시 호출(없으면 표시 전용)
 *  - name: 플레이스홀더 이니셜용 이름
 */
function fileToResizedDataUrl(file, max = 160) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('no file'));
    if (!/^image\//.test(file.type)) return reject(new Error('이미지 파일만 가능합니다.'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const cv = document.createElement('canvas');
        cv.width = max; cv.height = max;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
        resolve(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

export default function AvatarField({ value, onChange, name = '', size = 44, editable = false }) {
  const inputRef = useRef(null);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const url = await fileToResizedDataUrl(f);
      onChange && onChange(url);
    } catch (err) { alert(String(err.message || err)); }
    e.target.value = '';
  };
  const box = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: value ? 'transparent' : 'linear-gradient(135deg,#a855f7,#4f8ef7)',
    color: '#fff', fontWeight: 800, fontSize: size * 0.4, border: '1px solid rgba(0,0,0,0.08)',
    cursor: editable ? 'pointer' : 'default', position: 'relative',
  };
  return (
    <div
      style={box}
      title={editable ? '클릭하여 사진 등록/변경' : (name || '')}
      onClick={editable ? () => inputRef.current && inputRef.current.click() : undefined}
    >
      {value
        ? <img src={value} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{initial}</span>}
      {editable && (
        <span style={{ position: 'absolute', right: -2, bottom: -2, fontSize: size * 0.28, background: '#fff', borderRadius: '50%', lineHeight: 1, padding: 1, boxShadow: '0 0 3px rgba(0,0,0,0.3)' }}>📷</span>
      )}
      {editable && <input ref={inputRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />}
    </div>
  );
}
