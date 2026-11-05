import React from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { th } from '../i18n/th';

interface CorporateHeaderProps {
  title: string;
  description: string;
  step: number;
}

export function CorporateHeader({ title, description, step }: CorporateHeaderProps) {
  const { isSampleMode } = useAppState();

  return (
    <header className="sl-main__head" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="sl-label">ขั้นที่ {step} จาก 6</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {isSampleMode && (
          <span className="sl-badge sl-badge--info" style={{ background: 'var(--accent)', color: 'white' }}>
            ตัวอย่างข้อมูล
          </span>
        )}
      </div>
    </header>
  );
}

export function CorporateFooter({ runId, seed, version = "1.0.0" }: { runId: string | null; seed: string | null; version?: string }) {
  return (
    <footer style={{ 
      marginTop: 'var(--space-6)', 
      paddingTop: 'var(--space-3)', 
      borderTop: 'var(--border-hair) solid var(--line)', 
      display: 'flex', 
      justifyContent: 'space-between', 
      fontSize: '12px', 
      color: 'var(--ink-3)',
      fontFamily: 'var(--font-mono)'
    }}>
      <div>
        <span>Run ID: {runId || '—'}</span>
        <span style={{ margin: '0 var(--space-3)' }}>•</span>
        <span>Seed: {seed || '—'}</span>
      </div>
      <div>Version {version}</div>
    </footer>
  );
}

export function StepProgress({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: th.importData },
    { label: th.specialRequests },
    { label: th.scheduler },
    { label: th.timetable },
    { label: th.aiResults },
    { label: th.summaryExport },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: 'var(--space-2)', 
      marginBottom: 'var(--space-4)',
      overflowX: 'auto',
      paddingBottom: 'var(--space-2)'
    }}>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={i} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-2)', 
            opacity: isActive || isCompleted ? 1 : 0.5,
            flexShrink: 0
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: isActive ? 'var(--accent)' : isCompleted ? 'var(--accent)' : 'var(--line)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'transform 0.2s ease'
            }}>
              {stepNum}
            </div>
            <span style={{ fontSize: '14px', fontWeight: isActive ? '600' : '400' }}>{step.label}</span>
            {i < 5 && <div style={{ width: 'var(--space-4)', height: '2px', background: isCompleted ? 'var(--accent)' : 'var(--line)' }} />}
          </div>
        );
      })}
    </div>
  );
}
