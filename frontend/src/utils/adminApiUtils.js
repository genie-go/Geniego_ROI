/**
 * Admin API 공통 유틸리티
 * BUG-009 수정: 중복된 API 호출 패턴을 공통 함수로 추출
 * 
 * @module adminApiUtils
 */

const API = "/api";

/**
 * 인증 헤더 생성
 * @param {string} token - 인증 토큰
 * @returns {Object} 헤더 객체
 */
export function createAuthHeaders(token) {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
}

/**
 * 공통 API 호출 함수 (에러 핸들링 포함)
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - fetch 옵션
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 * @returns {Promise<Object>} API 응답
 */
export async function apiCall(endpoint, options = {}, onSuccess = null, onError = null) {
    try {
        const response = await fetch(`${API}${endpoint}`, options);
        const data = await response.json();

        if (data.ok) {
            if (onSuccess) onSuccess(data);
            return { success: true, data };
        } else {
            const errorMsg = data.error || "요청 실패";
            if (onError) onError(errorMsg);
            return { success: false, error: errorMsg };
        }
    } catch (error) {
        const errorMsg = "네트워크 오류";
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * 사용자 플랜 변경
 * @param {number} userId - 사용자 ID
 * @param {string} plan - 변경할 플랜
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function updateUserPlan(userId, plan, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}/plan`,
        {
            method: "PATCH",
            headers,
            body: JSON.stringify({ plan })
        },
        () => onSuccess("플랜 변경 완료"),
        onError
    );
}

/**
 * 사용자 활성화/비활성화 토글
 * @param {number} userId - 사용자 ID
 * @param {boolean} currentActive - 현재 활성화 상태
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function toggleUserActive(userId, currentActive, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}/active`,
        {
            method: "PATCH",
            headers,
            body: JSON.stringify({ active: !currentActive })
        },
        () => onSuccess(currentActive ? "비활성화 완료" : "활성화 완료"),
        onError
    );
}

/**
 * 사용자 비밀번호 초기화
 * @param {number} userId - 사용자 ID
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function resetUserPassword(userId, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}/reset-password`,
        {
            method: "POST",
            headers
        },
        (data) => onSuccess(`임시 비밀번호: ${data.temp_password || "(이메일 발송)"}`),
        onError
    );
}

/**
 * GDPR 영구 삭제
 * @param {number} userId - 사용자 ID
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function gdprDeleteUser(userId, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}`,
        {
            method: "DELETE",
            headers,
            body: JSON.stringify({ gdpr: true })
        },
        () => onSuccess("영구 삭제 완료"),
        onError
    );
}

/**
 * 2FA 설정 변경
 * @param {number} userId - 사용자 ID
 * @param {boolean} enable - 활성화 여부
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function update2FA(userId, enable, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}/2fa`,
        {
            method: "PATCH",
            headers,
            body: JSON.stringify({ two_factor: enable })
        },
        () => onSuccess(enable ? "2FA 강제 활성화 완료" : "2FA 비활성화 완료"),
        onError
    );
}

/**
 * 사용자 세션 강제 종료
 * @param {number} userId - 사용자 ID
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function killUserSessions(userId, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users/${userId}/sessions`,
        {
            method: "DELETE",
            headers
        },
        () => onSuccess("모든 세션 강제 종료 완료"),
        onError
    );
}

/**
 * 사용자 목록 조회
 * @param {string} token - 인증 토큰
 * @returns {Promise<Array>} 사용자 목록
 */
export async function fetchUsers(token) {
    const headers = createAuthHeaders(token);
    try {
        const response = await fetch(`${API}/v423/admin/users`, { headers });
        const data = await response.json();

        if (data.명 || data.users) {
            const raw = data.명 || data.users;
            return raw.map(user => {
                if (user.extra_data && typeof user.extra_data === 'string') {
                    try {
                        const extraData = JSON.parse(user.extra_data);
                        return { ...user, ...extraData };
                    } catch (e) {
                        // JSON 파싱 실패 시 원본 반환
                    }
                }
                return user;
            });
        } else if (data.ok === false) {
            throw new Error(data.error || "조회 실패");
        }
        return [];
    } catch (error) {
        console.error('[adminApiUtils] fetchUsers failed:', error);
        throw error;
    }
}

/**
 * 사용자 등록
 * @param {Object} userData - 사용자 데이터
 * @param {string} token - 인증 토큰
 * @param {Function} onSuccess - 성공 콜백
 * @param {Function} onError - 에러 콜백
 */
export async function createUser(userData, token, onSuccess, onError) {
    const headers = createAuthHeaders(token);
    return apiCall(
        `/v423/admin/users`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(userData)
        },
        () => onSuccess("등록되었습니다."),
        onError
    );
}

/**
 * 일괄 플랜 변경
 * @param {Array<number>} userIds - 사용자 ID 배열
 * @param {string} plan - 변경할 플랜
 * @param {string} token - 인증 토큰
 * @returns {Promise<Object>} 성공/실패 카운트
 */
export async function bulkUpdatePlan(userIds, plan, token) {
    const headers = createAuthHeaders(token);
    let successCount = 0;

    for (const userId of userIds) {
        try {
            const result = await apiCall(
                `/v423/admin/users/${userId}/plan`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ plan })
                }
            );
            if (result.success) successCount++;
        } catch (error) {
            // 개별 실패는 무시하고 계속 진행
        }
    }

    return {
        total: userIds.length,
        success: successCount,
        failed: userIds.length - successCount
    };
}

/**
 * 일괄 활성화/비활성화
 * @param {Array<number>} userIds - 사용자 ID 배열
 * @param {boolean} active - 활성화 여부
 * @param {string} token - 인증 토큰
 * @returns {Promise<Object>} 성공/실패 카운트
 */
export async function bulkUpdateActive(userIds, active, token) {
    const headers = createAuthHeaders(token);
    let successCount = 0;

    for (const userId of userIds) {
        try {
            const result = await apiCall(
                `/v423/admin/users/${userId}/active`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ active })
                }
            );
            if (result.success) successCount++;
        } catch (error) {
            // 개별 실패는 무시하고 계속 진행
        }
    }

    return {
        total: userIds.length,
        success: successCount,
        failed: userIds.length - successCount
    };
}
