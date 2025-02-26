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
    faEraser as fasEraser,
    faGear as fasGear,
    faGripVertical as fasGripVertical,
    faHeart as fasHeart,
    faMusic as fasMusic,
    faPlus as fasPlus,
    faQuestion as fasQuestion,
    faRotateLeft as fasRotateLeft,
    faRecordVinyl as fasRecordVinyl,
    faSearch as fasSearch,
    faSlidersH as fasSliders,
    faTrashCan as fasTrashCan,
    faUser as fasUser,
    faWandMagic as fasWandMagic,
} from '@fortawesome/free-solid-svg-icons'
import {
    faCircleQuestion as farCircleQuestion,
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
    fasCodeBranch,
    farCircleQuestion,
    fasCircleXmark,
    fasEraser,
    fasGear,
    fasGripVertical,
    fasHeart,
    fasMusic,
    fasPlus,
    fasQuestion,
    fasRecordVinyl,
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