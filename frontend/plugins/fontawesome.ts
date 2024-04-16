import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faQuestion as fasQuestion,
    faGear as fasGear,
    faHeart as fasHeart,
    faSearch as fasSearch,
    faPlus as fasPlus,
    faCodeBranch as fasCodeBranch,
    faAnglesLeft as fasAnglesLeft,
    faAnglesRight as fasAnglesRight,
    faTrashCan as fasTrashCan,
    faWandMagic as fasWandMagic,
    faBars as fasBars,
    faUser as fasUser,
    faArrowDownWideShort as fasArrowDownWideShort,
    faGripVertical as fasGripVertical,
    faArrowUpFromBracket as fasArrowUpFromBracket,
    faSlidersH as fasSliders,
} from '@fortawesome/free-solid-svg-icons'
import {
    faUser as farUser,
    faHeart as farHeart,
} from '@fortawesome/free-regular-svg-icons'

// This is important, we are going to let Nuxt worry about the CSS
config.autoAddCss = false

library.add(
    fasQuestion,
    fasGear,
    fasHeart,
    fasSearch,
    fasPlus,
    fasCodeBranch,
    fasAnglesLeft,
    fasAnglesRight,
    fasTrashCan,
    fasWandMagic,
    fasBars,
    fasUser,
    fasArrowDownWideShort,
    fasGripVertical,
    fasArrowUpFromBracket,
    farUser,
    farHeart,
    fasSliders,
)

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
})