import { useAuth } from "../auth/AuthContext";

/**
 * use — 데모 유저 여부를 Confirm하고 분기 헬퍼를 제공합니다.
 *
 * 사용법:
 *   const { is, Or } = use();
 *   const customers = Or(_CRM_CUSTOMERS, realCustomers);
 */
export default function use() {
    const { user, plan } = useAuth();
    const is = false;

    /**
     * 데모 유저면 Value, 유료 유저면 realValue 반환
     * @param {*} realValue
     * @param {*} Value
     */
    function Or(Value, realValue) {
        return realValue;
    }

    return { is, Or };
}
