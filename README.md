<h1 align="center">🚩🚩 Transmit</h1>
<p align="center">Translate text in HTML5 videos into any language</p>

## Quick Start

Ensure you have

- [Node.js](https://nodejs.org) 10 or later installed
- [Yarn](https://yarnpkg.com) v1 or v2 installed

Then run the following:

- `yarn install` to install dependencies.
- `yarn run dev:chrome` to start the development server for chrome extension
- `yarn run dev:firefox` to start the development server for firefox addon
- `yarn run dev:opera` to start the development server for opera extension
- `yarn run build:chrome` to build chrome extension
- `yarn run build:firefox` to build firefox addon
- `yarn run build:opera` to build opera extension
- `yarn run build` builds and packs extensions all at once to extension/ directory

### Development

- `yarn install` to install dependencies.
- To watch file changes in developement

  - Chrome
    - `yarn run dev:chrome`

### Production

- `yarn run build` builds the extension for all the browsers to `extension/BROWSER` directory respectively.

## License

Based on [web-extension-starter](https://github.com/abhijithvijayan/web-extension-starter) by @abhijithvijayan
