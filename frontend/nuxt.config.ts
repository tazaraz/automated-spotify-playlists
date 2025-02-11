// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ssr: false,
    build: {
        transpile: ['@fortawesome/vue-fontawesome'],
    },
    css: [
        "@/assets/global.scss",
        "@/assets/bootstrap.scss",
        '@fortawesome/fontawesome-svg-core/styles.css',
    ],
    modules: [
        '@pinia/nuxt',
    ],
    runtimeConfig: {
        public: {
            AP_CLIENT_ID: process.env.AP_CLIENT_ID
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
        esbuild: {
            tsconfigRaw: {},
        },
        server: {
            fs: {
                allow: ["/backend/src/shared/"]
            },
        }
    },
})
