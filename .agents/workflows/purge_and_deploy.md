---
description: 대모용 가상데이터 완전 삭제 → 빌드 → 로컬·운영 서버 배포
---
1. **의존성 설치**
   ```bash
   cd d:/project/GeniegoROI
   npm ci
   ```

2. **데모·목데이터 정리**
   ```bash
   node frontend/fix_demo.cjs          # 기존 한국어 데모 문자열을 영어로 교체
   node frontend/remove_all_mocks.cjs   # 모든 JSX 파일에서 mock 데이터(배열·객체·시드) 제거
   ```

3. **프론트엔드 빌드 (Vite)**
   ```bash
   npm run build   # 결과물은 frontend/dist 에 생성
   ```

4. **배포 스크립트 검증** (이미 `deploy.sh` 가 `./dist` 로 수정되었습니다.)

5. **배포 실행**
   ```bash
   ./deploy.sh
   ```
