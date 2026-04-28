#!/bin/bash
# SSH 키를 서버에 복사하여 비밀번호 없이 접속 가능하게 함
# 그 후 rsync로 배포

set -e

REMOTE_USER="root"
REMOTE_HOST="1.201.177.46"
REMOTE_PATH="/home/wwwroot/roi.geniego.com/frontend/dist"
LOCAL_BUILD_DIR="./frontend/dist"
SSH_KEY="$HOME/.ssh/id_rsa"
PASSWORD='vot@Wlroi6!'

echo "==============================="
echo "  GeniegoROI Production Deploy"
echo "==============================="
echo ""

# 빌드 디렉토리 확인
if [ ! -d "$LOCAL_BUILD_DIR" ]; then
  echo "❌ Build directory does not exist: $LOCAL_BUILD_DIR"
  exit 1
fi

echo "📁 Build dir: $LOCAL_BUILD_DIR"
echo "📦 Files: $(ls "$LOCAL_BUILD_DIR" | wc -l) items"
echo ""

# ssh-copy-id로 키 등록 시도 (이미 등록되어 있으면 스킵)
echo "🔑 Checking SSH key auth..."
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes $REMOTE_USER@$REMOTE_HOST "echo key_auth_ok" 2>/dev/null; then
  echo "  ✅ SSH key auth working"
else
  echo "  ⚠ SSH key auth not set up. Using sshpass or manual deploy."
  echo ""
  echo "  Please run this command manually to copy your SSH key:"
  echo "  ssh-copy-id -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST"
  echo "  Then run this script again."
  echo ""
  echo "  Or deploy manually with:"
  echo "  scp -r $LOCAL_BUILD_DIR/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
  exit 1
fi

# rsync 배포
echo ""
echo "🚀 Deploying to production..."
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" "$LOCAL_BUILD_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Visit: https://roi.genie-go.com"
