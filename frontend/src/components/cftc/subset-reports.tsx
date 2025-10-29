'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { subsetReportsApi } from '@/lib/api';
import { FileText, Download, Calendar, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SubsetReports() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reports = [
    {
      id: 'top-counterparties',
      name: 'Top 10 Physical Counterparties',
      description: 'Natural gas physical counterparty analysis with volume breakdown',
      icon: TrendingUp,
      color: 'blue',
    },
    {
      id: 'next-day-fixed',
      name: 'Next-Day Fixed Price',
      description: 'Physical next-day fixed-price transactions',
      icon: FileText,
      color: 'green',
    },
    {
      id: 'next-day-index',
      name: 'Next-Day Index Based',
      description: 'Physical next-day index-based transactions',
      icon: FileText,
      color: 'purple',
    },
    {
      id: 'next-day-exposure',
      name: 'Next-Day Print Exposure',
      description: 'Exposure summary by market location',
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const generateReport = async (reportId: string) => {
    try {
      setLoading(reportId);
      setError(null);
      setSelectedReport(reportId);

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      let data;
      switch (reportId) {
        case 'top-counterparties':
          data = await subsetReportsApi.getTopCounterparties(thirtyDaysAgo, today);
          break;
        case 'next-day-fixed':
          data = await subsetReportsApi.getNextDayFixed(today);
          break;
        case 'next-day-index':
          data = await subsetReportsApi.getNextDayIndex(today);
          break;
        case 'next-day-exposure':
          data = await subsetReportsApi.getNextDayExposure(today);
          break;
      }

      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(null);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CFTC Subset Reports
          </CardTitle>
          <CardDescription>
            Specialized reports for CFTC position limits compliance and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              const isLoading = loading === report.id;
              const isSelected = selectedReport === report.id;

              return (
                <div
                  key={report.id}
                  className={cn(
                    'p-4 rounded-lg border transition-all cursor-pointer hover:border-slate-500',
                    isSelected
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-slate-700/30 border-slate-600'
                  )}
                  onClick={() => !isLoading && generateReport(report.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                      e.preventDefault();
                      generateReport(report.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Generate ${report.name}`}
                  aria-disabled={isLoading}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        `text-${report.color}-400`
                      )}
                    />
                    {isSelected && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        Active
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1">{report.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{report.description}</p>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      generateReport(report.id);
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {reportData && (
            <Card className="bg-slate-900/50 border-slate-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">Report Results</CardTitle>
                    <CardDescription>
                      {reportData.report_type} - {reportData.total_counterparties || reportData.total_transactions || reportData.total_locations || 0} records
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={downloadReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                      <tr>
                        {reportData.data && reportData.data.length > 0 && Object.keys(reportData.data[0]).map((key) => (
                          <th key={key} className="text-left p-2 text-slate-300 font-medium">
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data && reportData.data.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                          {Object.values(row).map((value: any, vidx) => (
                            <td key={vidx} className="p-2 text-slate-300">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!reportData.data || reportData.data.length === 0) && (
                    <div className="text-center py-8 text-slate-400">
                      No data available for this report period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
