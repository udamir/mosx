module.exports = {
  title: "Mosx Documentation",
  description: "State management framework",
  // locales: {
  //   '/': {
  //     lang: 'English',
  //     title: 'Mosx Documentation',
  //     description: 'State management framework'
  //   },
  //   '/ru/': {
  //     lang: 'Русский',
  //     title: 'Mosx документация',
  //     description: 'State management framework'
  //   }
  // },
  themeConfig: {
    locales: {
      '/': {
        // text for the language dropdown
        selectText: 'Languages',
        // label for this locale in the language dropdown
        label: 'English',
        // Aria Label for locale in the dropdown
        ariaLabel: 'Languages',
        // text for the edit-on-github link
        // algolia docsearch options for current locale
        algolia: {},
        nav: [
          { text: "Github", link: "http://github.com/udamir/mosx" }
        ],
        sidebar: {
          '/': [
            '',
            'overview',  
            'mosx-api',
            'tracker-api',
            'examples',
          ],  
        },
      },
      '/ru/': {
        // text for the language dropdown
        selectText: 'Языкы',
        // label for this locale in the language dropdown
        label: 'Русский',
        // Aria Label for locale in the dropdown
        ariaLabel: 'Языкы',
        // text for the edit-on-github link
        // algolia docsearch options for current locale
        algolia: {},
        nav: [
          { text: "Github", link: "http://github.com/udamir/mosx" }
        ],
        sidebar: {
          '/': [
            '',
            'overview',  
            'mosx-api',
            'tracker-api',
            'examples',
          ],  
        }
      },
    },

  
  },
  dest: "docs",
  base: "/mosx/",
}