import { Navigate } from 'react-router-dom';
import { useT } from '../i18n/index.js';
export default function Reports() { return <Navigate to="/report-builder" replace />; }
  const t = useT();
