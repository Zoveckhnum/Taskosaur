import { useEffect, useState } from 'react';
import { HiSquares2X2 } from 'react-icons/hi2';

export default function CentralPortalLink() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/central/config', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(response => response.ok ? response.json() : null)
      .then(value => {
        if (value?.enabled && typeof value.portalUrl === 'string') {
          const target = new URL(value.portalUrl);
          const local = target.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname);
          if ((target.protocol === 'https:' || local) && !target.username && !target.password && target.pathname === '/' && !target.search && !target.hash) setUrl(target.href);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!url) return null;
  return <a href={url} className="header-user-menu-item" aria-label="Cambiar plataforma en Portal iqualitys">
    <div className="header-user-menu-icon-container"><HiSquares2X2 aria-hidden="true" /></div>
    <div className="header-user-menu-text">Cambiar plataforma</div>
  </a>;
}
