import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n';
import { getJson } from '../services/apiClient.js';
const teams = ['US', 'JP', 'EU'];
const channels = ['Meta', 'TikTok', 'Amazon'];

export default function AdvertisingPerformance() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [team, setTeam] = useState('US');
  const [channel, setChannel] = useState('Meta');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const json = await getJson(`/api/v1/ad-performance?team=${team}&channel=${channel}`);
        setData(json);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchData();
  }, [team, channel]);

  return (
    <div className="ad-performance-page">
      <h2>{t('adPerf.title')}</h2>
      <div className="filters">
        <label>{t('adPerf.team')}:
          <select value={team} onChange={e => setTeam(e.target.value)}>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>{t('adPerf.channel')}:
          <select value={channel} onChange={e => setChannel(e.target.value)}>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      {loading ? <p>{t('adPerf.loading')}</p> : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>{t('adPerf.date')}</th>
              <th>{t('adPerf.impressions')}</th>
              <th>{t('adPerf.clicks')}</th>
              <th>{t('adPerf.conversions')}</th>
              <th>{t('adPerf.spend')}</th>
              <th>{t('adPerf.cpa')}</th>
              <th>{t('adPerf.roas')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.impressions}</td>
                <td>{row.clicks}</td>
                <td>{row.conversions}</td>
                <td>{row.spend}</td>
                <td>{row.cpa?.toFixed(2) ?? ''}</td>
                <td>{row.roas?.toFixed(2) ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
