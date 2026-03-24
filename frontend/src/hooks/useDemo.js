import { useAuth } from "../auth/AuthContext";

/**
 * useDemo — 데모 유저 여부를 Confirm하고 분기 헬퍼를 제공합니다.
 *
 * 사용법:
 *   const { isDemo, demoOr } = useDemo();
 *   const customers = demoOr(DEMO_CRM_CUSTOMERS, realCustomers);
 */
export default function useDemo() {
    const { user, plan } = useAuth();
    const isDemo = !user || plan === "demo" || plan === null || plan === undefined;

    /**
     * 데모 유저면 demoValue, 유료 유저면 realValue 반환
     * @param {*} realValue
     * @param {*} demoValue
     */
    function demoOr(realValue, demoValue) {
        return isDemo ? demoValue : realValue;
    }

    return { isDemo, demoOr };
}
