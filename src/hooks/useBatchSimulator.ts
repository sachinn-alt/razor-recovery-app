import { useState, useEffect, useRef } from 'react';
import type { Transaction, AgentLog } from '../types';
import { initialBatchData } from '../data';

interface UseBatchSimulatorProps {
  maxRetries: number;
  visaOutage: boolean;
  mastercardOutage: boolean;
  upiOutage: boolean;
  waTemplate: string;
  emailTemplate: string;
  smsTemplate: string;
  addLog: (source: AgentLog['source'], message: string, type?: AgentLog['type']) => void;
}

export const useBatchSimulator = ({
  maxRetries,
  visaOutage,
  mastercardOutage,
  upiOutage,
  waTemplate,
  emailTemplate,
  smsTemplate,
  addLog,
}: UseBatchSimulatorProps) => {
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [simDelay, setSimDelay] = useState<number>(1000);
  const [simIndex, setSimIndex] = useState<number>(0);
  const [exceptions, setExceptions] = useState<{ id: string; customerName: string; amount: number; reason: string; errorCode: string }[]>([]);
  const [batchData, setBatchData] = useState<Transaction[]>(initialBatchData);
  const [chartHistory, setChartHistory] = useState<{ recovered: number; lost: number; count: number }[]>([
    { recovered: 0, lost: 0, count: 0 }
  ]);

  const stateRef = useRef({ simState, simIndex, batchData, simDelay, maxRetries, visaOutage, mastercardOutage, upiOutage });

  useEffect(() => {
    stateRef.current = { simState, simIndex, batchData, simDelay, maxRetries, visaOutage, mastercardOutage, upiOutage };
  }, [simState, simIndex, batchData, simDelay, maxRetries, visaOutage, mastercardOutage, upiOutage]);

  const interpolateTemplate = (
    template: string,
    data: { customerName: string; amount: number; productName: string; notes: string; checkoutLink: string }
  ) => {
    return template
      .replace(/\{\{customerName\}\}/g, data.customerName)
      .replace(/\{\{amount\}\}/g, data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/\{\{productName\}\}/g, data.productName)
      .replace(/\{\{notes\}\}/g, data.notes || 'a billing decline')
      .replace(/\{\{checkoutLink\}\}/g, data.checkoutLink);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (simState === 'running') {
      interval = setInterval(() => {
        const { 
          simIndex: currentIndex, 
          batchData: currentData, 
          maxRetries: limit,
          visaOutage: isVisaDown,
          mastercardOutage: isMcDown,
          upiOutage: isUpiDown
        } = stateRef.current;
        
        const nextIdx = currentData.findIndex((tx, i) => i >= currentIndex && (tx.status === 'Failed' || tx.status === 'Recovering'));
        
        if (nextIdx === -1) {
          setSimState('done');
          addLog('SIMULATOR', 'Batch processing completed. Standard metrics updated.', 'success');
          return;
        }

        setSimIndex(nextIdx);
        const tx = currentData[nextIdx];

        // Check active gateway outages
        let hasActiveOutage = false;
        let outageMessage = '';

        if (isVisaDown && (tx.failureType.includes('card') || tx.initialErrorCode.includes('LIMIT_EXCEEDED') || tx.initialErrorCode.includes('INSUFFICIENT_FUNDS'))) {
          hasActiveOutage = true;
          outageMessage = `Visa Network Downtime detected on card issuer server.`;
        } else if (isMcDown && (tx.failureType.includes('authentication') || tx.initialErrorCode.includes('AUTHENTICATION'))) {
          hasActiveOutage = true;
          outageMessage = `Mastercard 3D Secure verification gateway drop detected.`;
        } else if (isUpiDown && (tx.failureType.includes('mandate') || tx.initialErrorCode.includes('UPI'))) {
          hasActiveOutage = true;
          outageMessage = `UPI Autopay PSP server latency detected.`;
        }

        if (hasActiveOutage) {
          setSimIndex(nextIdx + 1);
          setBatchData(prev => 
            prev.map((t, idx) => {
              if (idx === nextIdx) {
                return {
                  ...t,
                  status: 'Recovering' as const,
                  notes: `Delayed due to Bank/Gateway server outage.`
                };
              }
              return t;
            })
          );
          addLog('WEBHOOK', `[DOWNTIME WARNING] ${outageMessage} Scheduled intelligent retry backoff for [${tx.id}].`, 'warning');
          return;
        }

        const updatedAttempts = tx.attempts + 1;
        let nextStatus: Transaction['status'] = 'Recovering';
        let logText = '';
        let logType: AgentLog['type'] = 'info';

        const isRecovered = Math.random() < 0.65;
        
        if (isRecovered) {
          nextStatus = 'Recovered';
          logText = `Recovered transaction [${tx.id}] for ₹${tx.amount.toFixed(2)}. payment.success webhook captured.`;
          logType = 'success';
          setSimIndex(nextIdx + 1);
        } else {
          if (updatedAttempts >= limit) {
            nextStatus = 'Escalated';
            logText = `Max retries limit [${limit}] reached for [${tx.id}]. Escalated exception logged.`;
            logType = 'error';
            
            setExceptions(prev => [
              ...prev,
              {
                id: tx.id,
                customerName: tx.customerName,
                amount: tx.amount,
                reason: 'Max Retries Exceeded',
                errorCode: tx.initialErrorCode
              }
            ]);
            setSimIndex(nextIdx + 1);
          } else {
            let rawTemplate = waTemplate;
            if (tx.recoveryChannel === 'Email') rawTemplate = emailTemplate;
            else if (tx.recoveryChannel === 'SMS') rawTemplate = smsTemplate;

            const renderedNudge = interpolateTemplate(rawTemplate, {
              customerName: tx.customerName,
              amount: tx.amount,
              productName: tx.productName,
              notes: tx.notes || 'decline',
              checkoutLink: `rpy.to/rec_${tx.id}`
            });

            logText = `Nudge dispatched via ${tx.recoveryChannel}: "${renderedNudge.split('\n')[0]}"`;
            logType = 'debug';
          }
        }

        setBatchData(prev => {
          const newData = prev.map((t, idx) => {
            if (idx === nextIdx) {
              return {
                ...t,
                status: nextStatus,
                attempts: updatedAttempts
              };
            }
            return t;
          });

          let recovered = 0;
          let lost = 0;
          newData.forEach(tx => {
            if (tx.status === 'Recovered') {
              recovered += tx.amount;
            } else if (tx.status === 'Escalated') {
              lost += tx.amount;
            }
          });

          setChartHistory(h => [
            ...h,
            { recovered, lost, count: h.length }
          ]);

          return newData;
        });

        addLog(logType === 'success' ? 'WEBHOOK' : 'AGENT', logText, logType);
      }, simDelay);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simState, simDelay, waTemplate, emailTemplate, smsTemplate]);

  const startSimulation = () => {
    if (simState === 'running') return;
    setSimState('running');
    addLog('SIMULATOR', 'Initiating automated Webhook failure recovery sequence.', 'warning');
  };

  const pauseSimulation = () => {
    setSimState('paused');
    addLog('SIMULATOR', 'Batch simulation paused by operator.', 'warning');
  };

  const resetSimulation = () => {
    setSimState('idle');
    setSimIndex(0);
    setExceptions([]);
    setBatchData(JSON.parse(JSON.stringify(initialBatchData)));
    setChartHistory([{ recovered: 0, lost: 0, count: 0 }]);
    addLog('SIMULATOR', 'Simulation reset. Batch dataset restored.', 'info');
  };

  return {
    simState,
    simDelay,
    setSimDelay,
    simIndex,
    exceptions,
    setExceptions,
    batchData,
    setBatchData,
    chartHistory,
    setChartHistory,
    startSimulation,
    pauseSimulation,
    resetSimulation,
  };
};
