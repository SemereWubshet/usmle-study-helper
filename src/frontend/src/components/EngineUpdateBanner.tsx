import { useState, useEffect } from 'react';
import { Sparkles, Download, X } from 'lucide-react';
import { checkEngineHealth } from '@/api';

// Helper to compare semver strings e.g. "v0.9.0" vs "0.8.0", ignoring prerelease tags or invalid characters
function isNewerVersion(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  
  // Extract strictly major.minor.patch numeric parts e.g. "v0.9.0-rc1" -> [0, 9, 0]
  const cleanVersion = (v: string): number[] => {
    const matched = v.replace(/^[^0-9]*/, '').split(/[^0-9]/);
    return matched.filter(Boolean).map((n) => parseInt(n, 10));
  };

  const p1 = cleanVersion(latest);
  const p2 = cleanVersion(current);

  if (p1.length === 0 || p2.length === 0) return false;

  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const v1 = p1[i] ?? 0;
    const v2 = p2[i] ?? 0;
    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }
  return false;
}

export function EngineUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    releaseUrl: string;
    downloadUrl: string;
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkForEngineUpdate() {
      try {
        // 1. Get current running engine version from local backend
        const health = await checkEngineHealth();
        if (!health?.version) return;

        // 2. Check for manual developer simulation/test in URL or localStorage
        // e.g. ?testUpdate=0.10.0 or localStorage.getItem('usmle_simulate_latest_version')
        const urlParams = new URLSearchParams(window.location.search);
        const testSimulatedVersion = urlParams.get('testUpdate') || localStorage.getItem('usmle_simulate_latest_version');

        let latestTag = '';
        let releaseHtmlUrl = 'https://github.com/SemereWubshet/usmle-study-helper/releases/latest';

        if (testSimulatedVersion) {
          latestTag = testSimulatedVersion;
        } else {
          // 3. Check cached github release to avoid hitting GitHub API 60 req/hr IP rate limits
          const cachedReleaseStr = localStorage.getItem('usmle_cached_github_release');
          const cacheTimeStr = localStorage.getItem('usmle_cached_github_release_time');
          const now = Date.now();

          // 2-hour cache
          if (cachedReleaseStr && cacheTimeStr && now - parseInt(cacheTimeStr, 10) < 1000 * 60 * 60 * 2) {
            try {
              const parsed = JSON.parse(cachedReleaseStr);
              latestTag = parsed.tag_name || '';
              releaseHtmlUrl = parsed.html_url || releaseHtmlUrl;
            } catch {
              // fallback to network
            }
          }

          if (!latestTag) {
            const resp = await fetch('https://api.github.com/repos/SemereWubshet/usmle-study-helper/releases/latest', {
              headers: { Accept: 'application/vnd.github.v3+json' },
            });
            if (resp.ok) {
              const data = await resp.json();
              latestTag = data.tag_name || '';
              releaseHtmlUrl = data.html_url || releaseHtmlUrl;
              localStorage.setItem('usmle_cached_github_release', JSON.stringify({ tag_name: latestTag, html_url: releaseHtmlUrl }));
              localStorage.setItem('usmle_cached_github_release_time', now.toString());
            }
          }
        }

        if (!latestTag || !isMounted) return;

        // Check if user already dismissed this specific version
        const cleanLatest = latestTag.replace(/^v/, '');
        const dismissedKey = `usmle_dismissed_update_${cleanLatest}`;
        if (localStorage.getItem(dismissedKey) === 'true') {
          return;
        }

        // Compare versions: notify only when latest GitHub release is strictly newer than current engine
        if (isNewerVersion(latestTag, health.version)) {
          // Detect user OS for direct release link
          const isLinux = typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('linux');
          const directDownloadUrl = isLinux
            ? `https://github.com/SemereWubshet/usmle-study-helper/releases/download/${latestTag}/USMLEStudyHelper-Linux.tar.gz`
            : `https://github.com/SemereWubshet/usmle-study-helper/releases/download/${latestTag}/USMLEStudyHelper-Windows.zip`;

          setUpdateInfo({
            currentVersion: health.version.replace(/^v/, ''),
            latestVersion: cleanLatest,
            releaseUrl: releaseHtmlUrl,
            downloadUrl: directDownloadUrl,
          });
        }
      } catch {
        // Fail silently - never disrupt students if network check fails or engine is offline
      }
    }

    checkForEngineUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (updateInfo) {
      localStorage.setItem(`usmle_dismissed_update_${updateInfo.latestVersion}`, 'true');
    }
    setIsDismissed(true);
  };

  if (!updateInfo || isDismissed) {
    return null;
  }

  return (
    <aside 
      aria-label="Engine update notification"
      className="fixed bottom-6 right-6 z-40 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-[#E3E8E5] dark:border-slate-800 shadow-[0_8px_30px_rgba(30,43,39,0.12)] backdrop-blur-md text-[13px] text-[#1E2B27] dark:text-slate-200">
        <div className="w-7 h-7 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/80 text-[#0B7A5A] dark:text-emerald-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <span className="font-semibold text-[#1E2B27] dark:text-white flex items-center gap-1.5 leading-snug">
            Engine update v{updateInfo.latestVersion}
          </span>
          <span className="text-[11px] text-[#4F5C57] dark:text-slate-400 leading-snug">
            Currently on v{updateInfo.currentVersion} • Fully compatible
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-1.5 border-l border-[#E3E8E5] dark:border-slate-800">
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download engine update from GitHub"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B7A5A] hover:bg-[#09664B] text-white font-medium text-[12px] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Get v{updateInfo.latestVersion}</span>
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#4F5C57] hover:text-[#1E2B27] dark:hover:text-white hover:bg-[#F2F5F3] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
