import { defineNuxtConfig } from 'nuxt/config'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // Disable console clearing
    // https://nuxtjs.org/docs/2.x/configuration-glossary/configuration-cli#clearconsole
    css: [
        "~/assets/scss/overrides.scss",
        '@fortawesome/fontawesome-svg-core/styles.css'
    ],

    modules: [
        '@pinia/nuxt',
    ],

    vite: {
        server: {
            hmr: {
                port: 24672,
                protocol: 'ws',
            }
        }
    }
})
