import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import MetricCard from '../components/MetricCard';
import { stringifyJson } from '../utils/formatters';

function isObjectLike(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export default function ControlsPage() {
  const [features, setFeatures] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');

  async function loadControls() {
    try {
      setLoading(true);
      const { data } = await adminClient.controls();
      const nextFeatures = data.features || [];
      setFeatures(nextFeatures);
      setDrafts(
        Object.fromEntries(
          nextFeatures.map((feature) => [
            feature.key,
            {
              enabled: Boolean(feature.enabled),
              configText: stringifyJson(feature.config)
            }
          ])
        )
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load feature controls.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadControls();
  }, []);

  const updateDraft = (key, patch) => {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch
      }
    }));
  };

  const handleSave = async (featureKey) => {
    const draft = drafts[featureKey];

    if (!draft) {
      return;
    }

    let parsedConfig = {};

    try {
      parsedConfig = draft.configText.trim() ? JSON.parse(draft.configText) : {};
    } catch (_error) {
      toast.error('Feature config must be valid JSON.');
      return;
    }

    if (!isObjectLike(parsedConfig)) {
      toast.error('Feature config must be a JSON object.');
      return;
    }

    try {
      setSavingKey(featureKey);
      await adminClient.updateFeature(featureKey, {
        enabled: Boolean(draft.enabled),
        config: parsedConfig
      });
      toast.success('Feature control updated.');
      await loadControls();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save feature control.');
    } finally {
      setSavingKey('');
    }
  };

  const enabledCount = features.filter((feature) => feature.enabled).length;

  return (
    <AdminShell
      title="Feature controls"
      subtitle="Roll out or disable product capabilities without redeploying the LitFlow backend."
      headerVariant="compact"
      showStatusStrip={false}
      actions={
        <button type="button" className="ghost-button" onClick={() => loadControls()}>
          Refresh controls
        </button>
      }
    >
      <section id="controls-overview" className="metrics-grid">
        <MetricCard label="Total controls" value={features.length} helper="Admin-manageable runtime switches" />
        <MetricCard label="Enabled controls" value={enabledCount} helper="Currently active flags" />
        <MetricCard label="Disabled controls" value={features.length - enabledCount} helper="Hidden or paused features" />
        <MetricCard
          label="AI availability"
          value={features.find((feature) => feature.key === 'ai_features')?.enabled ? 'ON' : 'OFF'}
          helper="Controls summaries and simplification"
        />
        <MetricCard
          label="Ads availability"
          value={features.find((feature) => feature.key === 'ads_enabled')?.enabled ? 'ON' : 'OFF'}
          helper="Free-plan ad visibility"
        />
        <MetricCard
          label="Beta rollout"
          value={features.find((feature) => feature.key === 'new_features')?.enabled ? 'LIVE' : 'PAUSED'}
          helper="New feature switch"
        />
      </section>

      <section id="controls-runtime" className="cards-grid" style={{ marginTop: '1rem' }}>
        {loading ? (
          <div className="empty-state">Loading feature controls...</div>
        ) : (
          features.map((feature) => {
            const draft = drafts[feature.key] || {
              enabled: Boolean(feature.enabled),
              configText: stringifyJson(feature.config)
            };

            return (
              <article key={feature.key} className="feature-card">
                <div className="switch-row">
                  <div>
                    <p className="eyebrow">Runtime switch</p>
                    <h3>{feature.label}</h3>
                    <p>{feature.description}</p>
                  </div>
                  <div className={`switch-pill ${draft.enabled ? 'enabled' : ''}`}>
                    {draft.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                <label>
                  <span>Feature status</span>
                  <select
                    value={draft.enabled ? 'enabled' : 'disabled'}
                    onChange={(event) =>
                      updateDraft(feature.key, { enabled: event.target.value === 'enabled' })
                    }
                  >
                    <option value="enabled">enabled</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>

                <label style={{ marginTop: '1rem' }}>
                  <span>JSON config</span>
                  <textarea
                    className="json-textarea"
                    value={draft.configText}
                    onChange={(event) => updateDraft(feature.key, { configText: event.target.value })}
                  />
                </label>

                <div className="card-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={Boolean(savingKey)}
                    onClick={() => handleSave(feature.key)}
                  >
                    {savingKey === feature.key ? 'Saving...' : 'Save control'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </AdminShell>
  );
}
