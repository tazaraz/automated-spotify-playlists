import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faQuestion as faSQuestion,
    faGear as faSGear,
    faHeart as faSHeart,
    faSearch as faSSearch,
    faPlus as faSPlus,
    faCodeBranch as faSCodeBranch,
    faAnglesLeft as faSAnglesLeft,
    faAnglesRight as faSAnglesRight,
    faTrashCan as faSTrashCan,
    faWandMagic as faSWandMagic,
    faBars as faSBars,
    faUser as faSUser,
    faArrowDownWideShort as faSArrowDownWideShort,
    faGripVertical as faSGripVertical,
    faArrowUpFromBracket as faSArrowUpFromBracket,
} from '@fortawesome/free-solid-svg-icons'
import {
    faUser as faRUser,
    faHeart as faRHeart,
} from '@fortawesome/free-regular-svg-icons'

// This is important, we are going to let Nuxt worry about the CSS
config.autoAddCss = false

library.add(
    faSQuestion,
    faSGear,
    faSHeart,
    faSSearch,
    faSPlus,
    faSCodeBranch,
    faSAnglesLeft,
    faSAnglesRight,
    faSTrashCan,
    faSWandMagic,
    faSBars,
    faSUser,
    faSArrowDownWideShort,
    faSGripVertical,
    faSArrowUpFromBracket,
    faRUser,
    faRHeart,
)

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
})