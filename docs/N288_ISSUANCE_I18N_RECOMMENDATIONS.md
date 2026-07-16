# 288차 — 발급 매뉴얼 15개국 정합 추천문안 (de-require 필드 "선택" 표기)

> **워크플로우**: CC추천(본 문서) → 사용자 교차검증 → 승인 시 적용. ko는 이미 적용 완료(GeniegoKnowledge.php·issuanceGuide.js). 본 문서는 **14개국(en,ja,zh,zh-TW,de,th,vi,id,ar,es,fr,hi,pt,ru)** issuanceGuide.{lang}.js + api_manuals/<lang>/<key>.html 정합용.

## 배경
288차에 백엔드 어댑터가 **읽지 않는데 프론트가 필수로 강제**하던 필드를 선택(opt)으로 완화 → 등록 차단 해소. 매뉴얼/챗봇도 해당 필드를 "선택"으로 안내해 정합.

## 대상 필드 · 채널
| 그룹 | 필드 | 채널 | 사유(백엔드 미read) |
|------|------|------|------|
| A | `cust_code` | cj, lotte, hanjin, ems, cj_intl | 추적은 t_key(api_key)만 사용. cust_code=전용 API 계약 시에만 |
| B | `account_number` | dhl | 추적은 api_key만. account_number=요율·예약 전용 |
| C | `account_number` | fedex, ups, tnt | 추적은 api_key(+secret)만 |
| D | `client_key` | toss(토스페이먼츠) | 정산수집은 secret_key만. client_key=결제위젯 클라이언트용 |
| E | `publishable_key`·`public_key` | stripe, checkout | 정산수집은 secret_key만. 클라이언트용 키 |

> **braintree public_key 는 대상 아님**(de-require 안 함 — 그대로 필수 유지).

## 추천 주석문안 (괄호 안 = 각 필드 뒤에 붙일 "선택" 안내)
문장 골격 `GenieGo [등록]에 …를 입력해 저장합니다` 는 각 언어 기존 번역 유지, 아래 **괄호 주석만** 해당 필드 뒤에 삽입.

### 그룹 A — cust_code: "(전용 API 계약 시에만 입력 · 선택)"
| lang | 추천문안 |
|------|------|
| ko | (전용 API 계약 시에만 입력 · 선택) |
| en | (only for the dedicated carrier API contract · optional) |
| ja | (専用API契約時のみ入力 · 任意) |
| zh | (仅在使用专用API合约时填写 · 选填) |
| zh-TW | (僅在使用專用API合約時填寫 · 選填) |
| de | (nur bei dediziertem API-Vertrag · optional) |
| th | (กรอกเฉพาะเมื่อใช้สัญญา API เฉพาะ · ไม่บังคับ) |
| vi | (chỉ khi dùng hợp đồng API riêng · tùy chọn) |
| id | (hanya untuk kontrak API khusus · opsional) |
| ar | (فقط عند استخدام عقد API مخصص · اختياري) |
| es | (solo con contrato de API dedicada · opcional) |
| fr | (uniquement avec un contrat d'API dédiée · facultatif) |
| hi | (केवल समर्पित API अनुबंध के लिए · वैकल्पिक) |
| pt | (apenas com contrato de API dedicada · opcional) |
| ru | (только для отдельного API-договора · необязательно) |

### 그룹 B — dhl account_number: "(요율·예약 시에만 입력 · 선택)"
| lang | 추천문안 |
|------|------|
| ko | (요율·예약 시에만 입력 · 선택) |
| en | (only for rates/booking · optional) |
| ja | (料金・予約時のみ入力 · 任意) |
| zh | (仅在计费/预约时填写 · 选填) |
| zh-TW | (僅在計費/預約時填寫 · 選填) |
| de | (nur für Tarife/Buchung · optional) |
| th | (กรอกเฉพาะสำหรับค่าบริการ/การจอง · ไม่บังคับ) |
| vi | (chỉ cho biểu giá/đặt chỗ · tùy chọn) |
| id | (hanya untuk tarif/pemesanan · opsional) |
| ar | (فقط للأسعار/الحجز · اختياري) |
| es | (solo para tarifas/reservas · opcional) |
| fr | (uniquement pour tarifs/réservation · facultatif) |
| hi | (केवल दरों/बुकिंग के लिए · वैकल्पिक) |
| pt | (apenas para tarifas/reservas · opcional) |
| ru | (только для тарифов/бронирования · необязательно) |

### 그룹 C — fedex/ups/tnt account_number: "(선택)"
| lang | 추천문안 |
|------|------|
| ko | (선택) |
| en | (optional) |
| ja | (任意) |
| zh | (选填) |
| zh-TW | (選填) |
| de | (optional) |
| th | (ไม่บังคับ) |
| vi | (tùy chọn) |
| id | (opsional) |
| ar | (اختياري) |
| es | (opcional) |
| fr | (facultatif) |
| hi | (वैकल्पिक) |
| pt | (opcional) |
| ru | (необязательно) |

### 그룹 D — toss client_key: "(결제위젯용 · 정산수집 불필요 · 선택)"
| lang | 추천문안 |
|------|------|
| ko | (결제위젯용 · 정산수집 불필요 · 선택) |
| en | (payment-widget key · not needed for settlement collection · optional) |
| ja | (決済ウィジェット用 · 精算収集には不要 · 任意) |
| zh | (支付组件用 · 结算采集无需 · 选填) |
| zh-TW | (付款元件用 · 結算擷取無需 · 選填) |
| de | (für Zahlungs-Widget · für Abrechnungserfassung nicht nötig · optional) |
| th | (สำหรับวิดเจ็ตชำระเงิน · ไม่จำเป็นต่อการเก็บข้อมูลการชำระบัญชี · ไม่บังคับ) |
| vi | (dùng cho widget thanh toán · không cần cho thu thập đối soát · tùy chọn) |
| id | (untuk widget pembayaran · tidak perlu untuk pengumpulan settlement · opsional) |
| ar | (لأداة الدفع · غير مطلوب لتحصيل التسويات · اختياري) |
| es | (para widget de pago · no necesario para la recaudación de liquidaciones · opcional) |
| fr | (pour le widget de paiement · inutile pour la collecte des règlements · facultatif) |
| hi | (भुगतान विजेट के लिए · निपटान संग्रह हेतु आवश्यक नहीं · वैकल्पिक) |
| pt | (para widget de pagamento · não necessário para a coleta de liquidação · opcional) |
| ru | (для платёжного виджета · не требуется для сбора расчётов · необязательно) |

### 그룹 E — stripe publishable_key / checkout public_key: "(클라이언트용 · 정산수집 불필요 · 선택)"
| lang | 추천문안 |
|------|------|
| ko | (클라이언트용 · 정산수집 불필요 · 선택) |
| en | (client-side key · not needed for settlement collection · optional) |
| ja | (クライアント用 · 精算収集には不要 · 任意) |
| zh | (客户端用 · 结算采集无需 · 选填) |
| zh-TW | (用戶端用 · 結算擷取無需 · 選填) |
| de | (clientseitig · für Abrechnungserfassung nicht nötig · optional) |
| th | (สำหรับฝั่งไคลเอนต์ · ไม่จำเป็นต่อการเก็บข้อมูลการชำระบัญชี · ไม่บังคับ) |
| vi | (dùng phía client · không cần cho thu thập đối soát · tùy chọn) |
| id | (sisi klien · tidak perlu untuk pengumpulan settlement · opsional) |
| ar | (من جهة العميل · غير مطلوب لتحصيل التسويات · اختياري) |
| es | (del lado del cliente · no necesario para la recaudación de liquidaciones · opcional) |
| fr | (côté client · inutile pour la collecte des règlements · facultatif) |
| hi | (क्लाइंट-साइड · निपटान संग्रह हेतु आवश्यक नहीं · वैकल्पिक) |
| pt | (do lado do cliente · não necessário para a coleta de liquidação · opcional) |
| ru | (на стороне клиента · не требуется для сбора расчётов · необязательно) |

## 적용 대상 파일 (승인 후)
1. `frontend/src/data/issuanceGuide.{lang}.js` (14개국) — ko에서 수정한 것과 동일 라인(각 언어 번역문의 필드 나열부에서 해당 필드를 빼고 위 주석 삽입).
2. `frontend/public/api_manuals/<lang>/<key>.html` — 대상 채널: cj, lotte, hanjin, ems, cj_intl(그룹A) · dhl(B) · fedex, ups, tnt(C) · toss(D) · stripe, checkout(E). 각 언어 폴더의 해당 HTML에서 필드 필수 표기를 "선택"으로.
   - ★api_manuals는 사용자 제공 번역본 → **교차검증 후에만** 적용(재번역 금지 가드레일).

## 교차검증 요청
- 각 언어 원어민 관점에서 위 주석문안이 자연스러운지 확인해 주세요(특히 ja/zh/ar/hi/ru).
- 수정할 문안이 있으면 알려주시면 반영 후, issuanceGuide 14개국 적용 → 재빌드 → 운영·데모 배포(별도 승인)로 진행합니다.
