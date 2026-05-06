#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GeniegoROI i18n Ultra Optimizer V1
- 다국어 로케일 파일(JS) 내 Topbar 키 지능적 주입
- 자동 백업 및 구문 안전성(Comma Handling) 보장
"""

import os
import re
import shutil
from datetime import datetime

# [설정] 로케일 파일이 위치한 경로 (본인의 환경에 맞는지 확인하세요)
LOCALE_DIR = r"d:\project\GeniegoROI\frontend\src\i18n\locales"

# 최고 사양 번역 데이터 세트
NEW_KEYS = {
    "en": {
        "darkModeToggle": "Switch to Dark Mode (Night)",
        "lightModeToggle": "Switch to Light Mode (Day)",
        "themeChangeTitle": "Change Background Theme",
        "themeSelect": "🎨 Theme",
        "langSelect": "🌐 Language",
        "detectedLang": "🌐 Detected: {{lang}}",
        "notifCenter": "Notification Center",
        "unreadCount": "{{n}} unread",
        "allRead": "All read",
        "markAllRead": "Mark all read",
        "noNotif": "📭 No notifications",
        "sendFeedback": "💬 Send Feedback",
        "clearAll": "Clear All",
        "confirmClear": "Delete all notifications?",
        "secAgo": "{{n}}s ago",
        "minAgo": "{{n}}m ago",
        "hrAgo": "{{n}}h ago",
        "dayAgo": "{{n}}d ago",
        "moreMenu": "More",
        "helpBtn": "📚 Help",
        "close": "Close",
        "menuToggle": "Open/Close Menu",
        "sidebarToggle": "Sidebar Toggle",
    },
    "ko": {
        "darkModeToggle": "다크 모드로 전환 (Night Mode)",
        "lightModeToggle": "라이트 모드로 전환 (Day Mode)",
        "themeChangeTitle": "배경 테마 변경",
        "themeSelect": "🎨 테마",
        "langSelect": "🌐 언어 선택",
        "detectedLang": "🌐 감지된 언어: {{lang}}",
        "notifCenter": "알림 센터",
        "unreadCount": "미읽음 {{n}}건",
        "allRead": "모두 읽음",
        "markAllRead": "모두 읽음 처리",
        "noNotif": "📭 알림이 없습니다",
        "sendFeedback": "💬 피드백 보내기",
        "clearAll": "전체 읽음 처리",
        "confirmClear": "알림을 모두 삭제할까요?",
        "secAgo": "{{n}}초 전",
        "minAgo": "{{n}}분 전",
        "hrAgo": "{{n}}시간 전",
        "dayAgo": "{{n}}일 전",
        "moreMenu": "더 보기",
        "helpBtn": "📚 도움말",
        "close": "닫기",
        "menuToggle": "메뉴 열기/닫기",
        "sidebarToggle": "사이드바 토글",
    },
    "ja": {
        "darkModeToggle": "ダークモードに切替 (Night)",
        "lightModeToggle": "ライトモードに切替 (Day)",
        "themeChangeTitle": "背景テーマを変更",
        "themeSelect": "🎨 テーマ",
        "langSelect": "🌐 言語選択",
        "detectedLang": "🌐 検出された言語: {{lang}}",
        "notifCenter": "通知センター",
        "unreadCount": "未読 {{n}}件",
        "allRead": "すべて既読",
        "markAllRead": "すべて既読にする",
        "noNotif": "📭 通知はありません",
        "sendFeedback": "💬 フィードバック送信",
        "clearAll": "すべてクリア",
        "confirmClear": "通知をすべて削除しますか？",
        "secAgo": "{{n}}秒前",
        "minAgo": "{{n}}分前",
        "hrAgo": "{{n}}時間前",
        "dayAgo": "{{n}}日前",
        "moreMenu": "もっと見る",
        "helpBtn": "📚 ヘルプ",
        "close": "閉じる",
        "menuToggle": "メニュー開閉",
        "sidebarToggle": "サイドバー切替",
    },
    "zh": {"darkModeToggle": "切换到暗黑模式", "lightModeToggle": "切换到亮色模式", "themeChangeTitle": "更改背景主题", "themeSelect": "🎨 主题", "langSelect": "🌐 语言选择", "detectedLang": "🌐 检测到的语言: {{lang}}", "notifCenter": "通知中心", "unreadCount": "未读 {{n}} 条", "allRead": "全部已读", "markAllRead": "全部标为已读", "noNotif": "📭 暂无通知", "sendFeedback": "💬 发送反馈", "clearAll": "清除全部", "confirmClear": "确定清除所有通知？", "secAgo": "{{n}}秒前", "minAgo": "{{n}}分前", "hrAgo": "{{n}}小时前", "dayAgo": "{{n}}天前", "moreMenu": "更多", "helpBtn": "📚 帮助", "close": "关闭", "menuToggle": "打开/关闭菜单", "sidebarToggle": "切换侧边栏"},
    "zh-TW": {"darkModeToggle": "切換到暗黑模式", "lightModeToggle": "切換到亮色模式", "themeChangeTitle": "變更背景主題", "themeSelect": "🎨 主題", "langSelect": "🌐 語言選擇", "detectedLang": "🌐 偵測到的語言: {{lang}}", "notifCenter": "通知中心", "unreadCount": "未讀 {{n}} 則", "allRead": "全部已讀", "markAllRead": "全部標為已讀", "noNotif": "📭 暫無通知", "sendFeedback": "💬 傳送意見", "clearAll": "清除全部", "confirmClear": "確定清除所有通知？", "secAgo": "{{n}}秒前", "minAgo": "{{n}}分前", "hrAgo": "{{n}}小時前", "dayAgo": "{{n}}天前", "moreMenu": "更多", "helpBtn": "📚 說明", "close": "關閉", "menuToggle": "開啟/關閉選單", "sidebarToggle": "切換側邊欄"},
    "de": {"darkModeToggle": "Zum Dunkelmodus wechseln", "lightModeToggle": "Zum Hellmodus wechseln", "themeChangeTitle": "Hintergrundthema ändern", "themeSelect": "🎨 Thema", "langSelect": "🌐 Sprache", "detectedLang": "🌐 Erkannte Sprache: {{lang}}", "notifCenter": "Benachrichtigungszentrum", "unreadCount": "{{n}} ungelesen", "allRead": "Alle gelesen", "markAllRead": "Alle als gelesen markieren", "noNotif": "📭 Keine Benachrichtigungen", "sendFeedback": "💬 Feedback senden", "clearAll": "Alle löschen", "confirmClear": "Alle Benachrichtigungen löschen?", "secAgo": "vor {{n}}s", "minAgo": "vor {{n}}m", "hrAgo": "vor {{n}}h", "dayAgo": "vor {{n}}d", "moreMenu": "Mehr", "helpBtn": "📚 Hilfe", "close": "Schließen", "menuToggle": "Menü öffnen/schließen", "sidebarToggle": "Seitenleiste umschalten"},
    "th": {"darkModeToggle": "เปลี่ยนเป็นโหมดมืด", "lightModeToggle": "เปลี่ยนเป็นโหมดสว่าง", "themeChangeTitle": "เปลี่ยนธีมพื้นหลัง", "themeSelect": "🎨 ธีม", "langSelect": "🌐 เลือกภาษา", "detectedLang": "🌐 ภาษาที่ตรวจพบ: {{lang}}", "notifCenter": "ศูนย์การแจ้งเตือน", "unreadCount": "ยังไม่อ่าน {{n}} รายการ", "allRead": "อ่านทั้งหมดแล้ว", "markAllRead": "ทำเครื่องหมายอ่านทั้งหมด", "noNotif": "📭 ไม่มีการแจ้งเตือน", "sendFeedback": "💬 ส่งความคิดเห็น", "clearAll": "ล้างทั้งหมด", "confirmClear": "ลบการแจ้งเตือนทั้งหมด?", "secAgo": "{{n}} วินาทีที่แล้ว", "minAgo": "{{n}} นาทีที่แล้ว", "hrAgo": "{{n}} ชั่วโมงที่แล้ว", "dayAgo": "{{n}} วันที่แล้ว", "moreMenu": "เพิ่มเติม", "helpBtn": "📚 ช่วยเหลือ", "close": "ปิด", "menuToggle": "เปิด/ปิดเม뉴", "sidebarToggle": "สลับแถบด้านข้าง"},
    "vi": {"darkModeToggle": "Chuyển sang chế độ tối", "lightModeToggle": "Chuyển sang chế độ sáng", "themeChangeTitle": "Đổi chủ đề nền", "themeSelect": "🎨 Chủ đề", "langSelect": "🌐 Chọn ngôn ngữ", "detectedLang": "🌐 Ngôn ngữ phát hiện: {{lang}}", "notifCenter": "Trung tâm thông báo", "unreadCount": "{{n}} chưa đọc", "allRead": "Đã đọc tất cả", "markAllRead": "Đánh dấu tất cả đã đọc", "noNotif": "📭 Không có thông báo", "sendFeedback": "💬 Gửi phản hồi", "clearAll": "Xóa tất cả", "confirmClear": "Xóa tất cả thông báo?", "secAgo": "{{n}} giây trước", "minAgo": "{{n}} phút trước", "hrAgo": "{{n}} giờ trước", "dayAgo": "{{n}} ngày trước", "moreMenu": "Xem thêm", "helpBtn": "📚 Trợ giúp", "close": "Đóng", "menuToggle": "Mở/Đóng menu", "sidebarToggle": "Thu/mở thanh bên"},
    "id": {"darkModeToggle": "Ganti ke Mode Gelap", "lightModeToggle": "Ganti ke Mode Terang", "themeChangeTitle": "Ubah Tema Latar Belakang", "themeSelect": "🎨 Tema", "langSelect": "🌐 Pilih Bahasa", "detectedLang": "🌐 Bahasa terdeteksi: {{lang}}", "notifCenter": "Pusat Notifikasi", "unreadCount": "{{n}} belum dibaca", "allRead": "Semua sudah dibaca", "markAllRead": "Tandai semua sudah dibaca", "noNotif": "📭 Tidak ada notifikasi", "sendFeedback": "💬 Kirim Masukan", "clearAll": "Hapus Semua", "confirmClear": "Hapus semua notifikasi?", "secAgo": "{{n}} detik lalu", "minAgo": "{{n}} menit lalu", "hrAgo": "{{n}} jam lalu", "dayAgo": "{{n}} hari lalu", "moreMenu": "Lainnya", "helpBtn": "📚 Bantuan", "close": "Tutup", "menuToggle": "Buka/Tutup Menu", "sidebarToggle": "Toggle Sidebar"},
}

def backup_file(fpath):
    """수정 전 현재 파일을 타임스탬프와 함께 백업합니다."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    bak_path = f"{fpath}.{timestamp}.bak"
    shutil.copy2(fpath, bak_path)
    return bak_path

def upgrade_locale_file(lang, keys):
    fname = f"{lang}.js"
    fpath = os.path.join(LOCALE_DIR, fname)
    
    if not os.path.exists(fpath):
        print(f"⚠️  미검출: {fname} (경로 확인 필요)")
        return

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 중복 검사: 이미 핵심 키가 있으면 건너뜀
    if "darkModeToggle" in content:
        print(f"⏩ SKIP: {fname} (이미 최신 키가 적용되어 있습니다.)")
        return

    # 2. topbar 섹션 찾기 (정규표현식으로 { ... } 블록 추출)
    # topbar: { 로 시작해서 }, 로 끝나는 가장 가까운 구간을 찾습니다.
    pattern = re.compile(r'(topbar:\s*{)([\s\S]*?)(},)')
    match = pattern.search(content)
    
    if not match:
        print(f"❌ ERROR: {fname} 내 'topbar' 섹션 구조를 분석할 수 없습니다.")
        return

    prefix = match.group(1)      # topbar: {
    inner_body = match.group(2)  # 내부 기존 키들
    suffix = match.group(3)      # },

    # 3. 새로운 번역 키 생성
    new_entries = []
    for k, v in keys.items():
        v_escaped = v.replace('"', '\\"')
        new_entries.append(f'        {k}: "{v_escaped}",')
    new_block = "\n".join(new_entries)

    # 4. 콤마 처리 보정 (기존 내용의 마지막 줄에 콤마가 없으면 추가)
    cleaned_inner = inner_body.rstrip()
    if cleaned_inner and not cleaned_inner.endswith(','):
        cleaned_inner += ','
    
    # 5. 최종 섹션 조립
    updated_section = f"{prefix}\n{cleaned_inner}\n{new_block}\n    {suffix}"
    
    # 전체 파일 내용 치환
    new_content = content.replace(match.group(0), updated_section)

    # 6. 백업 후 안전하게 쓰기
    backup_file(fpath)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"✅ FIXED: {fname} 업데이트 완료 (백업 생성됨)")

def main():
    print(f"🚀 GeniegoROI 다국어 고도화 엔진 시작 (대상: {len(NEW_KEYS)}개 언어)")
    if not os.path.exists(LOCALE_DIR):
        print(f"❌ 치명적 오류: 경로를 찾을 수 없습니다 -> {LOCALE_DIR}")
        return

    for lang, keys in NEW_KEYS.items():
        upgrade_locale_file(lang, keys)
    
    print("\n✨ 모든 작업이 안전하게 완료되었습니다.")

if __name__ == "__main__":
    main()