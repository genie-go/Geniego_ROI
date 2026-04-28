import { Navigate } from 'react-router-dom';
import { useT } from '../i18n/index.js';
export default function OperationsGuide() { return <Navigate to="/help" replace />; }
  const t = useT();
