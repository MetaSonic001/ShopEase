import React from 'react';

const ConsentBanner: React.FC = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem('analytics_consent');
      if (!v) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const grant = () => {
    try { localStorage.setItem('analytics_consent', 'granted'); } catch {}
    setVisible(false);
  };
  const deny = () => {
    try { localStorage.setItem('analytics_consent', 'denied'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div className="mx-auto max-w-5xl bg-white shadow-lg border rounded-t p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-700">
          We use cookies and similar technologies to improve your experience.
        </div>
        <div className="flex gap-2">
          <button onClick={deny} className="px-3 py-2 rounded border">Decline</button>
          <button onClick={grant} className="px-3 py-2 rounded bg-blue-600 text-white">Accept</button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
