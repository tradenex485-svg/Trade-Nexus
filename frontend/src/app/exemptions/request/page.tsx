'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { hedgeExemptionsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function RequestExemptionPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    commodity_code: '',
    exemption_type: 'bona_fide_hedge',
    requested_amount: '',
    current_position: '',
    business_justification: '',
    supporting_documents: '',
  });

  const exemptionTypes = [
    { value: 'bona_fide_hedge', label: 'Bona Fide Hedge', description: 'Position held for hedging physical exposure' },
    { value: 'spread_exemption', label: 'Spread Exemption', description: 'Inter-commodity or inter-market spread' },
    { value: 'risk_management', label: 'Risk Management', description: 'Portfolio risk management strategy' },
    { value: 'swap_dealer', label: 'Swap Dealer', description: 'Swap dealer hedging activity' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.commodity_code || !formData.requested_amount || !formData.business_justification) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await hedgeExemptionsApi.create({
        commodity_code: formData.commodity_code.toUpperCase(),
        exemption_type: formData.exemption_type,
        requested_amount: parseFloat(formData.requested_amount),
        current_position: parseFloat(formData.current_position) || 0,
        business_justification: formData.business_justification,
        supporting_documents: formData.supporting_documents || undefined,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/exemptions');
        }, 2000);
      } else {
        setError(response.message || 'Failed to submit exemption request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit exemption request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredPermissions={['exemptions.create']}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/exemptions')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exemptions
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Request Position Limit Exemption</h1>
              <p className="text-slate-400 text-sm mt-1">
                Submit a request for exemption from CFTC position limits
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-green-400">
              Exemption request submitted successfully! Redirecting to exemptions dashboard...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Request Form */}
        <Card className="cyber-border border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Exemption Request Details
            </CardTitle>
            <CardDescription>
              Provide detailed information to support your exemption request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Exemption Type */}
              <div>
                <label htmlFor="exemption_type" className="block text-sm font-medium text-white mb-2">
                  Exemption Type *
                </label>
                <select
                  id="exemption_type"
                  name="exemption_type"
                  value={formData.exemption_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {exemptionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {exemptionTypes.find(t => t.value === formData.exemption_type)?.description}
                </p>
              </div>

              {/* Commodity Code */}
              <div>
                <label htmlFor="commodity_code" className="block text-sm font-medium text-white mb-2">
                  Commodity Code *
                </label>
                <input
                  type="text"
                  id="commodity_code"
                  name="commodity_code"
                  value={formData.commodity_code}
                  onChange={handleInputChange}
                  placeholder="e.g., NG, CL, HO"
                  required
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Enter the commodity symbol (e.g., NG for Natural Gas, CL for Crude Oil)
                </p>
              </div>

              {/* Requested Amount and Current Position - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="requested_amount" className="block text-sm font-medium text-white mb-2">
                    Requested Exemption Amount (lots) *
                  </label>
                  <input
                    type="number"
                    id="requested_amount"
                    name="requested_amount"
                    value={formData.requested_amount}
                    onChange={handleInputChange}
                    placeholder="e.g., 5000"
                    required
                    min="1"
                    step="1"
                    className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="current_position" className="block text-sm font-medium text-white mb-2">
                    Current Position (lots)
                  </label>
                  <input
                    type="number"
                    id="current_position"
                    name="current_position"
                    value={formData.current_position}
                    onChange={handleInputChange}
                    placeholder="e.g., 12500"
                    step="1"
                    className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* Business Justification */}
              <div>
                <label htmlFor="business_justification" className="block text-sm font-medium text-white mb-2">
                  Business Justification *
                </label>
                <textarea
                  id="business_justification"
                  name="business_justification"
                  value={formData.business_justification}
                  onChange={handleInputChange}
                  placeholder="Provide detailed rationale for the exemption request, including:\n- Description of physical exposure or hedging need\n- Business purpose of positions\n- Risk management strategy\n- Timeline and expected duration"
                  required
                  rows={8}
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Minimum 50 characters required. Be specific about the business need and risk being hedged.
                </p>
              </div>

              {/* Supporting Documents */}
              <div>
                <label htmlFor="supporting_documents" className="block text-sm font-medium text-white mb-2">
                  Supporting Documentation (optional)
                </label>
                <textarea
                  id="supporting_documents"
                  name="supporting_documents"
                  value={formData.supporting_documents}
                  onChange={handleInputChange}
                  placeholder="List or link to supporting documents:\n- Physical contract references\n- Risk analysis reports\n- Trading strategy documentation\n- External hedging agreements"
                  rows={4}
                  className="w-full px-4 py-2.5 glass border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Reference any supporting documentation that validates your exemption request
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  {loading ? 'Submitting...' : 'Submit Exemption Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/exemptions')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-slate-500 pt-2">
                * Required fields. Your request will be reviewed by the compliance team within 2 business days.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="mt-6 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 space-y-2">
            <p>
              • Exemption requests are subject to review and approval by the compliance team
            </p>
            <p>
              • Approved exemptions are typically valid for 90 days unless otherwise specified
            </p>
            <p>
              • You will receive email notification when your request is reviewed
            </p>
            <p>
              • Trading in excess of position limits without an approved exemption may result in regulatory violations
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
