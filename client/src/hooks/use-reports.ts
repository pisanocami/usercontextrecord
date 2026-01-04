/**
 * useReports Hook - Manages ExecReports and MasterReports state
 */

import { useState, useCallback } from 'react';

// ExecReport types
export interface ExecReport {
  id: string;
  moduleId: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  executedAt: string;
  output: {
    hasData: boolean;
    confidence: number;
    insights: any[];
    recommendations: any[];
    dataSources: string[];
    [key: string]: any;
  };
  playbookResult?: {
    insights: any[];
    recommendations: any[];
    deprioritized: string[];
    councilPrompt: string;
  };
  created_at: string;
}

// MasterReport types
export interface MasterReport {
  id: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  generatedAt: string;
  ucrSnapshot: {
    brand: any;
    strategicIntent: any;
    negativeScope: any;
  };
  execReportIds: string[];
  consolidatedInsights: any[];
  consolidatedRecommendations: any[];
  councilSynthesis: {
    keyThemes: string[];
    crossModulePatterns: string[];
    prioritizedActions: string[];
  };
  modulesIncluded: string[];
  overallConfidence: number;
  dataFreshness: 'fresh' | 'moderate' | 'stale';
  created_at: string;
}

// UI States
export interface ReportsState {
  execReports: ExecReport[];
  masterReports: MasterReport[];
  currentMasterReport: MasterReport | null;
  loading: boolean;
  error: string | null;
}

export const useReports = (configurationId: number) => {
  const [state, setState] = useState<ReportsState>({
    execReports: [],
    masterReports: [],
    currentMasterReport: null,
    loading: false,
    error: null,
  });

  const fetchExecReports = useCallback(async (contextVersion?: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (contextVersion !== undefined) {
        params.append('contextVersion', contextVersion.toString());
      }
      
      const url = `/api/configurations/${configurationId}/exec-reports${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exec reports: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        execReports: data.reports || [],
        loading: false,
      }));
      
      return data.reports || [];
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return [];
    }
  }, [configurationId]);

  const fetchMasterReports = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/configurations/${configurationId}/master-reports`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch master reports: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Also fetch the latest
      const latestResponse = await fetch(`/api/configurations/${configurationId}/master-reports/latest`);
      let latest = null;
      if (latestResponse.ok) {
        const latestData = await latestResponse.json();
        latest = latestData.report;
      }
      
      setState(prev => ({
        ...prev,
        masterReports: data.reports || [],
        currentMasterReport: latest,
        loading: false,
      }));
      
      return data.reports || [];
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return [];
    }
  }, [configurationId]);

  const generateMasterReport = useCallback(async (contextVersion: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/configurations/${configurationId}/master-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contextVersion }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate master report: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        currentMasterReport: data.report,
        masterReports: [...prev.masterReports, data.report],
        loading: false,
      }));
      
      return data.report;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  }, [configurationId]);

  const getExecReportById = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/exec-reports/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exec report: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.report;
    } catch (error: any) {
      console.error('Error fetching exec report:', error);
      return null;
    }
  }, []);

  const getMasterReportById = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/master-reports/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch master report: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.report;
    } catch (error: any) {
      console.error('Error fetching master report:', error);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchExecReports,
    fetchMasterReports,
    generateMasterReport,
    getExecReportById,
    getMasterReportById,
    clearError,
  };
};

export default useReports;
