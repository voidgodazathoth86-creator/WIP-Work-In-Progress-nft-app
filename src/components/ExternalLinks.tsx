// ExternalLinks.tsx - Add this to your NFT app frontend
// Place in: src/components/ExternalLinks.tsx
// Then import in App.tsx: import ExternalLinks from './components/ExternalLinks'

import { useEffect, useState } from 'react';
import { SITE_LINKS } from '../../deployed-config';

interface LinkItem {
  url: string;
  label: string;
  enabled: boolean;
  status?: string;
}

export default function ExternalLinks() {
  const [links, setLinks] = useState<any>(SITE_LINKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch from backend /api/site-links
    fetch('/api/site-links')
      .then(r => r.json())
      .then(data => {
        if (data.links) {
          setLinks(data.links);
        }
      })
      .catch(() => {
        // fallback to hardcoded SITE_LINKS
      })
      .finally(() => setLoading(false));
  }, []);

  const hasAnyEnabled = 
    links.website?.enabled || 
    Object.values(links.socials || {}).some((s: any) => s.enabled) ||
    links.blog?.enabled ||
    links.newsletter?.enabled;

  if (loading) return <div className="text-sm text-gray-400 p-4">Loading links...</div>;

  return (
    <footer className="w-full border-t border-gray-800 bg-black/50 backdrop-blur mt-12 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Website */}
        <div>
          <h3 className="text-white font-bold mb-3">Website</h3>
          {links.website?.enabled && links.website?.url ? (
            <a href={links.website.url} target="_blank" rel="noopener noreferrer" 
               className="text-blue-400 hover:text-blue-300 underline">
              {links.website.label} ↗
            </a>
          ) : (
            <span className="text-gray-500 text-sm">
              {links.website?.label || "Website"} — <span className="text-yellow-500">Coming Soon</span>
            </span>
          )}
        </div>

        {/* Socials */}
        <div>
          <h3 className="text-white font-bold mb-3">Social Media</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(links.socials || {}).map(([key, social]: any) => (
              <div key={key}>
                {social.enabled && social.url ? (
                  <a href={social.url} target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:text-blue-300 text-sm">
                    {social.label} ↗
                  </a>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {social.label} — <span className="text-yellow-500">Coming Soon</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Blog */}
        <div>
          <h3 className="text-white font-bold mb-3">Blog</h3>
          {links.blog?.enabled && links.blog?.url ? (
            <a href={links.blog.url} target="_blank" rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 underline">
              {links.blog.label} ↗
            </a>
          ) : (
            <span className="text-gray-500 text-sm">
              Blog — <span className="text-yellow-500">Coming Soon</span><br/>
              <span className="text-xs">Updates, drops, behind-the-scenes</span>
            </span>
          )}
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-white font-bold mb-3">Newsletter</h3>
          {links.newsletter?.enabled && links.newsletter?.url ? (
            <>
              <a href={links.newsletter.url} target="_blank" rel="noopener noreferrer"
                 className="text-blue-400 hover:text-blue-300 underline block mb-2">
                {links.newsletter.label} ↗
              </a>
              {links.newsletter?.embedEnabled && (
                <form className="mt-2" onSubmit={(e) => {
                  e.preventDefault();
                  alert('Newsletter signup - connect to Substack/Beehiiv API');
                }}>
                  <input type="email" placeholder="your@email.com" 
                         className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                  <button className="mt-2 w-full bg-white text-black rounded py-2 text-sm font-bold hover:bg-gray-200">
                    Subscribe
                  </button>
                </form>
              )}
            </>
          ) : (
            <span className="text-gray-500 text-sm">
              Newsletter — <span className="text-yellow-500">Coming Soon</span><br/>
              <span className="text-xs">Get notified on drops</span>
              <div className="mt-2 opacity-50">
                <input disabled placeholder="Coming soon..." 
                       className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm" />
              </div>
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-gray-900 text-center">
        <p className="text-xs text-gray-600">
          WIP — Work In Progress • Fee Collector: 0x063A...F7f6E • Collections: 0xc2eaa...5ef9 + 0xC2dE...Ecc6
        </p>
        {!hasAnyEnabled && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Edit <code>deployed-config.ts</code> → <code>SITE_LINKS</code> to add your website/social/blog/newsletter when they're ready
          </p>
        )}
      </div>
    </footer>
  );
}

// MINI VERSION for header/top bar
export function TopLinksBar() {
  return (
    <div className="w-full bg-yellow-500/10 border-b border-yellow-500/20 text-center py-2 text-xs text-yellow-200">
      Website, Socials, Blog & Newsletter — Coming Soon • Follow WIP for updates
    </div>
  );
}
