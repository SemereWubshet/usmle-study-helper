import { useState, useEffect } from 'react';
import { Sparkles, Download, X } from 'lucide-react';
import { checkEngineHealth } from '@/api';

// Helper to compare semver strings e.g. "0.6.1" > "0.6.0"
function isNewerVersion(latest: string, current: string): boolean {
  const cleanLatest = latest.replace(/^v/, '').trim();
  const cleanCurrent = current.replace(/^v/, '').trim();
  if (!cleanLatest || !cleanCurrent) return false;

  const p1 = cleanLatest.split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = cleanCurrent.split('.').map((n) => parseInt(n, 10) || 0);

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
        // e.g. ?testUpdate=0.7.0 or localStorage.getItem('usmle_simulate_latest_version')
        const urlParams = new URLSearchParams(window.location.search);
        const testSimulatedVersion = urlParams.get('testUpdate') || localStorage.getItem('usmle_simulate_latest_version');

        let latestTag = '';
        let releaseHtmlUrl = 'https://github.com/SemereWubshet/usmle-study-helper/releases/latest';

        if (testSimulatedVersion) {
          latestTag = testSimulatedVersion;
        } else {
          // 3. Check cached github release to avoid hitting rate limits
          const cachedReleaseStr = localStorage.getItem('usmle_cached_github_release');
          const cacheTimeStr = localStorage.getItem('usmle_cached_github_release_time');
          const now = Date.now();

          // 4-hour cache
          if (cachedReleaseStr && cacheTimeStr && now - parseInt(cacheTimeStr, 10) < 1000 * 60 * 60 * 4) {
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
        const dismissedKey = `usmle_dismissed_update_${latestTag}`;
        if (localStorage.getItem(dismissedKey) === 'true') {
          return;
        }

        // Compare versions
        if (isNewerVersion(latestTag, health.version)) {
          // Detect user OS for direct release link
          const isLinux = window.navigator.userAgent.toLowerCase().includes('linux');
          const directDownloadUrl = isLinux
            ? `https://github.com/SemereWubshet/usmle-study-helper/releases/download/${latestTag}/USMLEStudyHelper-Linux.tar.gz`
            : `https://github.com/SemereWubshet/usmle-study-helper/releases/download/${latestTag}/USMLEStudyHelper-Windows.zip`;

          setUpdateInfo({
            currentVersion: health.version,
            latestVersion: latestTag,
            releaseUrl: releaseHtmlUrl,
            downloadUrl: directDownloadUrl,
          });
        }
      } catch {
        // Fail silently - never disrupt students if network check fails
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
    <div className="fixed top-20 right-4 sm:right-6 z-40 max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-emerald-300 dark:border-emerald-700/60 shadow-lg backdrop-blur-md text-xs text-slate-800 dark:text-slate-200">
        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            Engine Update {updateInfo.latestVersion}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Current: v{updateInfo.currentVersion} • New features ready
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto pl-1 border-l border-slate-200 dark:border-slate-800">
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download update from GitHub"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Update</span>
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss update notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
