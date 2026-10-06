// Builds ../tailwind.css, the static replacement for the Tailwind Play CDN script.
// Regenerate after adding or changing Tailwind classes in index.html or app.js:
//   npx --yes tailwindcss@3.4.17 -c tailwind/tailwind.config.js -i tailwind/input.css -o tailwind.css
// 3.4.17 is the version https://cdn.tailwindcss.com served when the CDN was replaced,
// so the generated rules match what the page had before.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: ['../index.html', '../app.js']
  },
  theme: {
    extend: {}
  },
  plugins: []
};
