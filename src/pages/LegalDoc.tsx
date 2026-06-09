import React from 'react';
import { ArrowLeft, ShieldCheck, Scale, FileText } from 'lucide-react';

interface LegalDocProps {
  docType: 'tos' | 'privacy' | 'dmca';
  onBack: () => void;
}

export default function LegalDoc({ docType, onBack }: LegalDocProps) {
  let title = '';
  let icon = null;
  let content = null;

  if (docType === 'tos') {
    title = 'Terms of Service';
    icon = <Scale className="w-8 h-8 text-red-500" />;
    content = (
      <div className="space-y-6">
        <p>Welcome to Anipriv8. By accessing or using our platform, you agree to be bound by these Terms of Service.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">1. Acceptance of Terms</h3>
        <p>By using Anipriv8, you agree to comply with and be legally bound by the terms and conditions outlined in this document. If you do not agree to any part of these terms, you must discontinue use immediately.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">2. Use of Service</h3>
        <p>Anipriv8 is provided for personal use. You agree not to misuse the service or help anyone else do so. The service functions as an aggregation index, and does not directly host any video or manga content.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">3. Intellectual Property</h3>
        <p>All source code, design elements, and platform branding are the property of Anipriv8. You may not duplicate, copy, or reuse any portion of the HTML/CSS, Javascript, or visual design elements without express written permission.</p>
      </div>
    );
  } else if (docType === 'privacy') {
    title = 'Privacy Policy';
    icon = <ShieldCheck className="w-8 h-8 text-blue-500" />;
    content = (
      <div className="space-y-6">
        <p>At Anipriv8, we take your privacy seriously. This policy explains how we collect, use, and protect your data.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">1. Information Collection</h3>
        <p>We may collect basic profile information you provide, such as your email address and username if you choose to create an account. However, browsing without an account collects no persistent identifiable data.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">2. Local Storage & Cookies</h3>
        <p>Anipriv8 utilizes local storage on your device to maintain your preferred settings, search history, and list configurations. This data never leaves your device unless synced manually.</p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">3. Third-Party Services</h3>
        <p>When fetching metadata, posters, or streaming media, your browser connects directly to third-party providers (such as AniList or Consumet APIs). We do not control the privacy practices of these external services.</p>
      </div>
    );
  } else if (docType === 'dmca') {
    title = 'Digital Millennium Copyright Act (DMCA)';
    icon = <FileText className="w-8 h-8 text-yellow-500" />;
    content = (
      <div className="space-y-6">
        <p className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200">
          <strong>Important Notice:</strong> Anipriv8 acts solely as an aggregation directory. No video, audio, or image files are hosted on our servers. All media streams are provided by non-affiliated third parties.
        </p>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mt-8">Removal Requests</h3>
        <p>If you believe that your copyrighted work has been infringed by a third-party service indexed on Anipriv8, please direct your takedown notice directly to the host of the infringing content.</p>
        <p>While we do not control the external servers, we are committed to respecting intellectual property. If notified of verified infringing links, Anipriv8 administrators may remove specific directory listings from our local platform index.</p>
        <p>To request a listing removal, please contact our legal email alias with specific URL references.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#040405] pt-safe flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-24">
        
        {/* Back navigation */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 cursor-pointer group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-xs uppercase tracking-widest">Back to Home</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-zinc-900 pb-8 mb-12">
          {icon}
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
            {title}
          </h1>
        </div>

        {/* Content Document */}
        <div className="prose prose-invert max-w-none prose-headings:font-black prose-p:text-zinc-400 prose-p:leading-relaxed prose-a:text-red-500 prose-a:no-underline hover:prose-a:underline font-mono text-sm md:text-base selection:bg-red-500/30">
          {content}
        </div>

      </div>
    </div>
  );
}
