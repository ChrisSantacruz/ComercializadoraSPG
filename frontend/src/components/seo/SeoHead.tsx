import { useEffect } from 'react';

const BRAND = 'Comercializadora SPG';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export type SeoHeadProps = {
  title: string;
  description?: string;
  /** Path absoluto desde /, ej. `/productos` o `/productos/abc`. Por defecto location actual. */
  canonicalPath?: string;
  ogImage?: string;
  /** Objeto JSON-LD (Product, WebSite, etc.) */
  jsonLd?: Record<string, unknown>;
};

/**
 * SEO CSR sin dependencias extra: título, descripción, OG base y canonical.
 * Para SPA; crawlers limitados siguen beneficiándose de título/url coherentes.
 */
export function SeoHead({ title, description, canonicalPath, ogImage, jsonLd }: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes(BRAND) ? title : `${title} · ${BRAND}`;
    document.title = fullTitle;

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:type', 'website');

    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }

    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
    }

    const origin = window.location.origin;
    const path =
      canonicalPath != null && canonicalPath.length > 0
        ? canonicalPath.startsWith('/')
          ? canonicalPath
          : `/${canonicalPath}`
        : `${window.location.pathname}${window.location.search}`;
    const href = `${origin}${path}`;
    upsertMeta('property', 'og:url', href);
    upsertCanonical(href);

    if (jsonLd) {
      let ld = document.getElementById('seo-jsonld') as HTMLScriptElement | null;
      if (!ld) {
        ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.id = 'seo-jsonld';
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(jsonLd);
    } else {
      document.getElementById('seo-jsonld')?.remove();
    }
  }, [title, description, canonicalPath, ogImage, jsonLd]);

  return null;
}
