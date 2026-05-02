const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

const profileKeys = {
  ko: {
    "profile.title": "회원정보 관리",
    "profile.tabInfo": "📋 회원정보",
    "profile.tabPassword": "🔐 비밀번호 변경",
    "profile.emailLabel": "이메일 (변경 불가)",
    "profile.nameLabel": "이름 *",
    "profile.namePlaceholder": "이름을 입력하세요",
    "profile.phoneLabel": "전화번호",
    "profile.companyLabel": "회사 / 조직",
    "profile.companyPlaceholder": "회사명을 입력하세요",
    "profile.joinDate": "가입일",
    "profile.lastLogin": "최근 로그인",
    "profile.saveBtn": "💾 회원정보 저장",
    "profile.saving": "저장 중...",
    "profile.saved": "회원정보가 수정되었습니다.",
    "profile.savedLocal": "회원정보가 수정되었습니다. (로컬 저장)",
    "profile.nameRequired": "이름을 입력해 주세요.",
    "profile.pwGuide": "비밀번호 변경 시 현재 비밀번호 확인이 필요합니다.",
    "profile.pwGuide2": "새 비밀번호는 <strong>8자 이상</strong>, 대문자·숫자·특수문자를 포함하면 더 안전합니다.",
    "profile.curPwLabel": "현재 비밀번호 *",
    "profile.curPwPlaceholder": "현재 비밀번호 입력",
    "profile.newPwLabel": "새 비밀번호 *",
    "profile.newPwPlaceholder": "새 비밀번호 (8자 이상)",
    "profile.confirmPwLabel": "새 비밀번호 확인 *",
    "profile.confirmPwPlaceholder": "새 비밀번호 재입력",
    "profile.pwMatch": "비밀번호가 일치합니다",
    "profile.pwNoMatch": "비밀번호가 일치하지 않습니다",
    "profile.changePwBtn": "🔐 비밀번호 변경",
    "profile.changingPw": "변경 중...",
    "profile.pwChanged": "비밀번호가 변경되었습니다.",
    "profile.pwChangeFail": "비밀번호 변경에 실패했습니다.",
    "profile.pwCurRequired": "현재 비밀번호를 입력해 주세요.",
    "profile.pwMinLength": "새 비밀번호는 8자 이상이어야 합니다.",
    "profile.pwMismatch": "새 비밀번호가 일치하지 않습니다.",
    "profile.pwSameAsCur": "현재 비밀번호와 다른 비밀번호를 입력해 주세요.",
    "profile.pwCurWrong": "현재 비밀번호가 올바르지 않습니다.",
    "profile.pwApiNotReady": "비밀번호 변경 API가 준비 중입니다.",
    "profile.serverError": "서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    "profile.strWeak": "약함",
    "profile.strFair": "보통",
    "profile.strGood": "양호",
    "profile.strStrong": "강함",
    "profile.strVeryStrong": "매우 강함",
  },
  en: {
    "profile.title": "Profile Settings",
    "profile.tabInfo": "📋 Profile Info",
    "profile.tabPassword": "🔐 Change Password",
    "profile.emailLabel": "Email (read-only)",
    "profile.nameLabel": "Name *",
    "profile.namePlaceholder": "Enter your name",
    "profile.phoneLabel": "Phone",
    "profile.companyLabel": "Company / Organization",
    "profile.companyPlaceholder": "Enter company name",
    "profile.joinDate": "Joined",
    "profile.lastLogin": "Last login",
    "profile.saveBtn": "💾 Save Profile",
    "profile.saving": "Saving...",
    "profile.saved": "Profile updated successfully.",
    "profile.savedLocal": "Profile saved locally.",
    "profile.nameRequired": "Please enter your name.",
    "profile.pwGuide": "Current password verification is required to change your password.",
    "profile.pwGuide2": "New password must be <strong>8+ characters</strong>. Include uppercase, numbers, and symbols for better security.",
    "profile.curPwLabel": "Current Password *",
    "profile.curPwPlaceholder": "Enter current password",
    "profile.newPwLabel": "New Password *",
    "profile.newPwPlaceholder": "New password (8+ chars)",
    "profile.confirmPwLabel": "Confirm New Password *",
    "profile.confirmPwPlaceholder": "Re-enter new password",
    "profile.pwMatch": "Passwords match",
    "profile.pwNoMatch": "Passwords do not match",
    "profile.changePwBtn": "🔐 Change Password",
    "profile.changingPw": "Changing...",
    "profile.pwChanged": "Password changed successfully.",
    "profile.pwChangeFail": "Failed to change password.",
    "profile.pwCurRequired": "Please enter your current password.",
    "profile.pwMinLength": "New password must be at least 8 characters.",
    "profile.pwMismatch": "New passwords do not match.",
    "profile.pwSameAsCur": "New password must differ from current password.",
    "profile.pwCurWrong": "Current password is incorrect.",
    "profile.pwApiNotReady": "Password change API is not ready yet.",
    "profile.serverError": "Server connection failed. Please try again later.",
    "profile.strWeak": "Weak",
    "profile.strFair": "Fair",
    "profile.strGood": "Good",
    "profile.strStrong": "Strong",
    "profile.strVeryStrong": "Very Strong",
  },
  ja: {
    "profile.title": "会員情報管理",
    "profile.tabInfo": "📋 会員情報",
    "profile.tabPassword": "🔐 パスワード変更",
    "profile.emailLabel": "メール（変更不可）",
    "profile.nameLabel": "名前 *",
    "profile.namePlaceholder": "名前を入力してください",
    "profile.phoneLabel": "電話番号",
    "profile.companyLabel": "会社 / 組織",
    "profile.companyPlaceholder": "会社名を入力してください",
    "profile.joinDate": "登録日",
    "profile.lastLogin": "最終ログイン",
    "profile.saveBtn": "💾 保存",
    "profile.saving": "保存中...",
    "profile.saved": "会員情報が更新されました。",
    "profile.savedLocal": "ローカルに保存されました。",
    "profile.nameRequired": "名前を入力してください。",
    "profile.curPwLabel": "現在のパスワード *",
    "profile.curPwPlaceholder": "現在のパスワード入力",
    "profile.newPwLabel": "新しいパスワード *",
    "profile.newPwPlaceholder": "新しいパスワード（8文字以上）",
    "profile.confirmPwLabel": "新しいパスワード確認 *",
    "profile.confirmPwPlaceholder": "新しいパスワード再入力",
    "profile.pwMatch": "パスワードが一致します",
    "profile.pwNoMatch": "パスワードが一致しません",
    "profile.changePwBtn": "🔐 パスワード変更",
    "profile.changingPw": "変更中...",
    "profile.pwChanged": "パスワードが変更されました。",
    "profile.pwChangeFail": "パスワード変更に失敗しました。",
    "profile.pwCurRequired": "現在のパスワードを入力してください。",
    "profile.pwMinLength": "新しいパスワードは8文字以上必要です。",
    "profile.pwMismatch": "新しいパスワードが一致しません。",
    "profile.pwSameAsCur": "現在と異なるパスワードを入力してください。",
    "profile.pwCurWrong": "現在のパスワードが正しくありません。",
    "profile.serverError": "サーバー接続に失敗しました。",
    "profile.strWeak": "弱い",
    "profile.strFair": "普通",
    "profile.strGood": "良好",
    "profile.strStrong": "強い",
    "profile.strVeryStrong": "非常に強い",
  },
};

// For other languages, use English as fallback
const otherLangs = ['zh','zh-TW','de','th','vi','id','es','fr','pt','ru','ar','hi'];

const langs = ['ko','en','ja', ...otherLangs];

langs.forEach(lang => {
  const fpath = path.join(DIR, lang + '.js');
  if (!fs.existsSync(fpath)) return;
  let c = fs.readFileSync(fpath, 'utf8');
  
  // Check if profile section already exists
  if (c.includes('"profile":')) {
    console.log(`${lang}: profile section already exists, skipping`);
    return;
  }
  
  const keys = profileKeys[lang] || profileKeys['en'];
  const entries = Object.entries(keys).map(([k, v]) => {
    const shortKey = k.replace('profile.', '');
    return `    "${shortKey}": "${v.replace(/"/g, '\\"')}"`;
  }).join(',\n');
  
  const block = `  "profile": {\n${entries}\n  },`;
  
  // Insert before the last closing brace of the export
  const lastBrace = c.lastIndexOf('};');
  if (lastBrace > -1) {
    c = c.substring(0, lastBrace) + block + '\n' + c.substring(lastBrace);
    fs.writeFileSync(fpath, c, 'utf8');
    console.log(`${lang}: injected ${Object.keys(keys).length} profile keys`);
  }
});
