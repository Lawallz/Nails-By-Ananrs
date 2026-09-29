import { useEffect, useRef, useState } from 'react';
type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile; } }
let scriptPromise: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => window.turnstile ? resolve() : reject(new Error('CAPTCHA indisponível'));
      script.onerror = () => { script.remove(); reject(new Error('CAPTCHA indisponível')); };
      document.head.appendChild(script);
    }).catch(error => { scriptPromise = undefined; throw error; });
  }
  return scriptPromise;
}
export function TurnstileWidget({siteKey, action, resetKey, onVerify}: {
  siteKey: string; action: string; resetKey: number; onVerify: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    setFailed(false);
    onVerify('');
    void loadTurnstile().then(() => {
      if (cancelled || !container.current) return;
      widget = window.turnstile!.render(container.current, {
        sitekey: siteKey, action, theme: 'dark',
        callback: (token: string) => { if (!cancelled) onVerify(token); },
        'expired-callback': () => { if (!cancelled) onVerify(''); },
        'error-callback': () => { if (!cancelled) { onVerify(''); setFailed(true); } }
      });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [siteKey, action, resetKey, onVerify, retry]);
  return <div>
    <div ref={container} />
    {failed && <p role="alert" className="text-xs text-rose-300">
      Não foi possível carregar a verificação. <button type="button" className="underline" onClick={() => setRetry(n => n + 1)}>Tentar novamente</button>
    </p>}
  </div>;
}
