import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faAngleDown as fasAngleDown,
    faAngleRight as fasAngleRight,
    faAnglesLeft as fasAnglesLeft,
    faAnglesRight as fasAnglesRight,
    faArrowDownWideShort as fasArrowDownWideShort,
    faArrowUpFromBracket as fasArrowUpFromBracket,
    faCodeBranch as fasCodeBranch,
    faCircleXmark as fasCircleXmark,
    faHeart as fasHeart,
    faBars as fasBars,
    faGear as fasGear,
    faGripVertical as fasGripVertical,
    faPlus as fasPlus,
    faQuestion as fasQuestion,
    faRotateLeft as fasRotateLeft,
    faSearch as fasSearch,
    faSlidersH as fasSliders,
    faTrashCan as fasTrashCan,
    faUser as fasUser,
    faWandMagic as fasWandMagic,
} from '@fortawesome/free-solid-svg-icons'
import {
    faCircleQuestion as farCircleQuestion,
    faHeart as farHeart,
    faUser as farUser,
} from '@fortawesome/free-regular-svg-icons'

// This is important, we are going to let Nuxt worry about the CSS
config.autoAddCss = false

library.add(
    fasAngleDown,
    fasAngleRight,
    fasAnglesLeft,
    fasAnglesRight,
    fasArrowDownWideShort,
    fasArrowUpFromBracket,
    fasBars,
    fasCodeBranch,
    farCircleQuestion,
    fasCircleXmark,
    fasHeart,
    fasGear,
    fasGripVertical,
    fasPlus,
    fasQuestion,
    fasRotateLeft,
    fasSliders,
    fasSearch,
    fasTrashCan,
    farUser,
    fasUser,
    fasWandMagic,
)

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
})