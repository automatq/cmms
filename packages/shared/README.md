# @maintek/shared

Code shared between the web and mobile apps. Today that is one file:

- `themes.ts` - color theme definitions (light and dark variants) as HSL token sets used by
  the web Tailwind config and the mobile style system. Add a theme here and both apps pick
  it up.

Keep this package free of framework imports so it can be consumed by Next.js, Expo, and
Node alike.
