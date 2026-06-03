# Aura Riyah — Premium Shopify Theme

A luxury light-theme Online Store 2.0 theme for **Aura Riyah**, targeting Qatar and GCC customers. Built for accessories, smart gadgets, audio, gaming, and lifestyle electronics.

## Features

- **Premium design system** — Pearl ivory backgrounds, maroon accents, champagne gold highlights
- **Bilingual** — English (LTR) + Arabic (RTL) with Cairo & Inter typography
- **Conversion-focused** — Premium product cards, PDP gallery, sticky ATC, cart drawer with free-shipping bar
- **Performance-first** — Vanilla JS only, lazy images, minimal CSS, no animation libraries
- **OS 2.0** — Section groups, JSON templates, reusable sections, theme editor settings

## Import to Shopify

### Option A: ZIP upload (recommended)

1. Zip the theme folder (the folder must contain `layout/`, `templates/`, etc. at the root):

   ```bash
   cd /Users/apple/Projects/AuraRiyah
   zip -r aura-riyah-theme.zip . -x "*.git*" -x "README.md" -x "*.DS_Store"
   ```

2. In **Shopify Admin** → **Online Store** → **Themes** → **Add theme** → **Upload zip file**
3. Select `aura-riyah-theme.zip` and publish when ready.

### Option B: Shopify CLI

```bash
npm install -g @shopify/cli @shopify/theme
cd /Users/apple/Projects/AuraRiyah
shopify theme push --store your-store.myshopify.com
```

## Post-install setup

1. **Languages** — Settings → Languages → Add **Arabic** and publish both EN + AR
2. **Navigation** — Create a `main-menu` with collections (Audio, Wearables, Gaming, Smart Home)
3. **Logo** — Theme settings → upload logo and favicon
4. **Collections** — Assign collections to Featured Collection sections on the homepage
5. **Wishlist page** — Create a page with handle `wishlist` and assign template `page.wishlist`
6. **Hero images** — Upload floating product PNGs (transparent background) in Hero Slider blocks
7. **Markets** — Configure GCC countries and currencies in Shopify Markets
8. **Payments** — Enable Tabby, Tamara, Apple Pay, and local cards for Gulf checkout

## Theme structure

```
layout/theme.liquid          # Main layout, RTL/LTR, fonts
assets/                      # CSS + lightweight JS
sections/                    # Header, hero, PDP, collection, etc.
snippets/                    # Product card, cart drawer, icons
templates/                   # JSON templates
locales/                     # en.default.json, ar.json
config/                      # settings_schema.json
```

## Customization

| Setting | Location |
|---------|----------|
| Colors | Theme settings → Colors |
| Free shipping threshold | Theme settings → Cart |
| GCC delivery / warranty copy | Theme settings → Trust & GCC |
| Hero slides | Homepage → Hero slider |
| Product specs accordion | Product template → Product information |

## Performance tips

- Use **WebP** product images via Shopify's image CDN
- Keep hero slider to **2–3 slides**
- Enable **Shopify CDN** and compress media before upload
- Use **Shopify Search & Discovery** for collection filters

## License

Proprietary — Aura Riyah brand. For use on authorized Shopify stores only.
