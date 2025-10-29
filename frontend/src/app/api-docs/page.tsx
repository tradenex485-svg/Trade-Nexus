'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-300">Loading API Documentation...</p>
      </div>
    </div>
  ),
});

export default function APIDocumentationPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Trade Nexus API Documentation</h1>
          <p className="text-slate-300">
            Interactive API documentation for Trade Nexus - CFTC Position Limits Compliance Platform
          </p>
          <div className="mt-3 flex gap-4 text-sm">
            <a
              href="#"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Download OpenAPI Spec
            </a>
            <a
              href="https://github.com/swagger-api/swagger-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Swagger UI Documentation
            </a>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="api-docs-container">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-300">Loading API Documentation...</p>
              </div>
            </div>
          }
        >
          <SwaggerUI
            url="/openapi.yaml"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
          />
        </Suspense>
      </div>

      <style jsx global>{`
        .api-docs-container {
          /* Override Swagger UI default dark theme */
          --swagger-ui-bg: #0f172a;
          --swagger-ui-border-color: #334155;
        }

        /* Custom Swagger UI styling to match Trade Nexus theme */
        .swagger-ui {
          font-family: inherit;
        }

        .swagger-ui .topbar {
          display: none; /* Hide default topbar since we have our own header */
        }

        .swagger-ui .info {
          margin: 2rem auto;
          max-width: 1280px;
          padding: 0 1.5rem;
        }

        .swagger-ui .info .title {
          color: #f1f5f9;
          font-size: 2rem;
        }

        .swagger-ui .info .description {
          color: #cbd5e1;
        }

        .swagger-ui .scheme-container {
          background: #1e293b;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem auto;
          max-width: 1280px;
        }

        .swagger-ui .opblock-tag {
          border-bottom: 1px solid #334155;
          color: #f1f5f9;
          font-size: 1.5rem;
        }

        .swagger-ui .opblock {
          border: 1px solid #334155;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          background: #1e293b;
        }

        .swagger-ui .opblock .opblock-summary {
          border: none;
        }

        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 0.25rem;
          font-weight: 600;
        }

        .swagger-ui .opblock.opblock-post {
          border-color: #10b981;
        }

        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #10b981;
        }

        .swagger-ui .opblock.opblock-get {
          border-color: #3b82f6;
        }

        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #3b82f6;
        }

        .swagger-ui .opblock.opblock-put {
          border-color: #f59e0b;
        }

        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #f59e0b;
        }

        .swagger-ui .opblock.opblock-delete {
          border-color: #ef4444;
        }

        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #ef4444;
        }

        .swagger-ui .opblock .opblock-summary-path {
          color: #f1f5f9;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .swagger-ui .opblock .opblock-summary-description {
          color: #cbd5e1;
        }

        .swagger-ui .btn {
          border-radius: 0.375rem;
          font-weight: 500;
        }

        .swagger-ui .btn.authorize {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .swagger-ui .btn.authorize svg {
          fill: white;
        }

        .swagger-ui .btn.try-out__btn {
          background: #10b981;
          color: white;
          border: none;
        }

        .swagger-ui .btn.execute {
          background: #3b82f6;
          color: white;
          border: none;
        }

        .swagger-ui .btn.cancel {
          background: #64748b;
          color: white;
          border: none;
        }

        .swagger-ui .parameters-col_description {
          color: #cbd5e1;
        }

        .swagger-ui .response-col_status {
          color: #f1f5f9;
        }

        .swagger-ui .response-col_description {
          color: #cbd5e1;
        }

        .swagger-ui table thead tr th {
          color: #f1f5f9;
          border-bottom: 1px solid #334155;
        }

        .swagger-ui table tbody tr td {
          color: #cbd5e1;
          border-bottom: 1px solid #334155;
        }

        .swagger-ui .model {
          color: #cbd5e1;
        }

        .swagger-ui .model-box {
          background: #1e293b;
          border-radius: 0.375rem;
          padding: 1rem;
        }

        .swagger-ui .model-title {
          color: #f1f5f9;
        }

        .swagger-ui .prop-type {
          color: #22d3ee;
        }

        .swagger-ui .prop-format {
          color: #a78bfa;
        }

        .swagger-ui section.models {
          border: 1px solid #334155;
          border-radius: 0.5rem;
          background: #1e293b;
          padding: 1rem;
        }

        .swagger-ui section.models h4 {
          color: #f1f5f9;
        }

        .swagger-ui .loading-container {
          color: #cbd5e1;
        }

        /* Filter box */
        .swagger-ui .filter-container {
          margin: 1rem auto;
          max-width: 1280px;
          padding: 0 1.5rem;
        }

        .swagger-ui .filter .operation-filter-input {
          background: #1e293b;
          border: 1px solid #334155;
          color: #f1f5f9;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
        }

        .swagger-ui .filter .operation-filter-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
