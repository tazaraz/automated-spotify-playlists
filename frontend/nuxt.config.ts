import { defineNuxtConfig } from 'nuxt/config'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // Disable console clearing
    // https://nuxtjs.org/docs/2.x/configuration-glossary/configuration-cli#clearconsole
    build: {
        transpile: ['@fortawesome/vue-fontawesome'],
    },
    css: [
        "~/assets/scss/overrides.scss",
        "@/assets/scss/global.scss",
        '@fortawesome/fontawesome-svg-core/styles.css',
    ],
    modules: [
        '@pinia/nuxt',
        'nuxt-tsconfig-relative-paths',
    ],

    runtimeConfig: {
        public: {
            SP_CLIENT_ID: process.env.SP_CLIENT_ID,
            DOMAIN: process.env.DOMAIN
        }
    },
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@import "@/node_modules/bootstrap/scss/mixins"; @import "@/node_modules/bootstrap/scss/functions"; @import "@/node_modules/bootstrap/scss/variables";'
                }
            }
        },
        server: {
            fs: {
                allow: ["../backend/src/"]
            },
            hmr: {
                port: 24672,
                protocol: 'ws',
            }
        },
        build: {
            rollupOptions: {
                output:{
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            return id.toString().split('node_modules/')[1].split('/')[0].toString();
                        }
                    }
                }
            }
        }
    }
})
