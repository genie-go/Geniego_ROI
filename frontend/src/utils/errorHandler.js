/**
 * 표준 에러 핸들러 유틸리티
 * BUG-002 수정: 빈 에러 핸들러 대체용
 * 
 * 모든 API 에러를 일관되게 처리하고 사용자에게 적절한 피드백을 제공합니다.
 */

/**
 * API 에러를 처리하고 사용자에게 알림을 표시합니다.
 * 
 * @param {Error} error - 발생한 에러 객체
 * @param {Object} options - 옵션 객체
 * @param {Function} options.addAlert - GlobalDataContext의 addAlert 함수
 * @param {Function} options.setToast - Toast 상태 설정 함수 (대체 알림 방식)
 * @param {string} options.context - 에러 발생 컨텍스트 (예: "데이터 로드", "저장")
 * @param {boolean} options.silent - true면 사용자 알림 없이 콘솔에만 로그
 * @param {Function} options.onError - 추가 에러 처리 콜백
 */
export function handleApiError(error, options = {}) {
    const {
        addAlert,
        setToast,
        context = '작업',
        silent = false,
        onError
    } = options;

    // 콘솔에 에러 로그 (개발 환경에서만 표시, 프로덕션에서는 Vite가 제거)
    console.error(`[API Error] ${context}:`, error);

    // 에러 메시지 생성
    let userMessage = `${context} 중 오류가 발생했습니다.`;

    if (error.message) {
        userMessage += ` (${error.message})`;
    }

    // 네트워크 에러 감지
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = '네트워크 연결을 확인해주세요.';
    }

    // 사용자에게 알림 표시 (silent 모드가 아닐 때)
    if (!silent) {
        if (addAlert && typeof addAlert === 'function') {
            addAlert({
                type: 'error',
                msg: userMessage,
                timestamp: new Date().toISOString()
            });
        } else if (setToast && typeof setToast === 'function') {
            setToast(userMessage);
        }
    }

    // 추가 에러 처리 콜백 실행
    if (onError && typeof onError === 'function') {
        try {
            onError(error);
        } catch (callbackError) {
            console.error('[Error Handler] Callback error:', callbackError);
        }
    }
}

/**
 * API 호출을 래핑하여 자동으로 에러를 처리합니다.
 * 
 * @param {Promise} promise - API 호출 Promise
 * @param {Object} options - handleApiError와 동일한 옵션
 * @returns {Promise} 원본 Promise (에러는 처리되지만 reject는 유지)
 */
export function withErrorHandler(promise, options = {}) {
    return promise.catch(error => {
        handleApiError(error, options);
        throw error; // 에러를 다시 throw하여 호출자가 추가 처리 가능
    });
}

/**
 * fetch 호출을 래핑하여 자동으로 에러를 처리합니다.
 * 
 * @param {string} url - API URL
 * @param {Object} fetchOptions - fetch 옵션
 * @param {Object} errorOptions - handleApiError 옵션
 * @returns {Promise} fetch Promise
 */
export async function fetchWithErrorHandler(url, fetchOptions = {}, errorOptions = {}) {
    try {
        const response = await fetch(url, fetchOptions);

        // HTTP 에러 상태 체크
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.response = response;
            throw error;
        }

        return response;
    } catch (error) {
        handleApiError(error, {
            context: errorOptions.context || 'API 호출',
            ...errorOptions
        });
        throw error;
    }
}

/**
 * 간단한 에러 로깅 (사용자 알림 없이)
 * 
 * @param {string} context - 에러 컨텍스트
 * @param {Error} error - 에러 객체
 */
export function logError(context, error) {
    console.error(`[${context}]`, error);
}

/**
 * 기본 catch 핸들러 - 빈 catch 블록을 대체합니다.
 * 최소한의 에러 로깅을 수행합니다.
 * 
 * @param {string} context - 에러 발생 위치
 * @returns {Function} catch 핸들러 함수
 */
export function defaultCatchHandler(context = 'Unknown') {
    return (error) => {
        console.error(`[${context}] Error:`, error);
    };
}

export default {
    handleApiError,
    withErrorHandler,
    fetchWithErrorHandler,
    logError,
    defaultCatchHandler
};
