'use client';

interface LandingProps {
  onLogin: () => void;
  error?: string;
}

export default function Landing({ onLogin, error }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-white font-semibold text-xl">Blazel</span>
          </div>
          <button
            onClick={onLogin}
            className="text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <span className="text-blue-400 text-sm font-medium">AI-Powered Content Generation</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            LinkedIn Posts That
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Sound Like You</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate authentic LinkedIn content with AI that learns your voice.
            Every edit you make trains the model to write more like you.
          </p>

          {error && (
            <div className="mb-6 inline-block px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            Get Started Free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            How the Feedback Loop Works
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            The more you use Blazel, the better it understands your unique writing style
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                1
              </div>
              <div className="bg-slate-800 rounded-2xl p-8 pt-12 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-3">Generate</h3>
                <p className="text-slate-400">
                  Enter a topic and let AI create a LinkedIn post draft tailored to professional audiences.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                2
              </div>
              <div className="bg-slate-800 rounded-2xl p-8 pt-12 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-3">Refine</h3>
                <p className="text-slate-400">
                  Edit the post directly in our rich text editor. Add comments about your preferences.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                3
              </div>
              <div className="bg-slate-800 rounded-2xl p-8 pt-12 border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-3">Learn</h3>
                <p className="text-slate-400">
                  Your feedback trains a personalized model. Future posts match your voice automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                AI That Adapts to Your Voice
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Direct Preference Optimization</h3>
                    <p className="text-slate-400 text-sm">Advanced RL technique that learns from your edits, not just your approvals.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Few-Shot Learning</h3>
                    <p className="text-slate-400 text-sm">See improvements after just 3-5 feedback samples. No massive datasets needed.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Personal LoRA Adapters</h3>
                    <p className="text-slate-400 text-sm">Each user gets their own fine-tuned model weights. Your style, your model.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div className="text-slate-500"># Your feedback becomes training data</div>
                <div>
                  <span className="text-purple-400">prompt</span>
                  <span className="text-slate-400">: &quot;Write about AI trends&quot;</span>
                </div>
                <div>
                  <span className="text-red-400">rejected</span>
                  <span className="text-slate-400">: &quot;AI is revolutionizing...&quot;</span>
                </div>
                <div>
                  <span className="text-green-400">chosen</span>
                  <span className="text-slate-400">: &quot;Here&apos;s what I learned...&quot;</span>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <span className="text-blue-400">model.train</span>
                  <span className="text-slate-400">(dpo_loss)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl p-12 border border-slate-700">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Write Smarter?
            </h2>
            <p className="text-slate-400 mb-8">
              Join the feedback loop. Let AI learn your voice.
            </p>
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all"
            >
              Start Writing
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">B</span>
            </div>
            <span className="text-slate-400 text-sm">Blazel</span>
          </div>
          <p className="text-slate-500 text-sm">
            AI-powered content that learns your voice
          </p>
        </div>
      </footer>
    </div>
  );
}
