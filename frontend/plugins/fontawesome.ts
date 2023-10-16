import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import * as fas from '@fortawesome/free-solid-svg-icons'
import * as far from '@fortawesome/free-regular-svg-icons'

// This is important, we are going to let Nuxt worry about the CSS
config.autoAddCss = false

// You can add your icons directly in this plugin. See other examples for how you
// can add other styles or just individual icons.
const icons = [
    "faQuestion",
    "faGear",
    "faHeart",
    "faSearch",
    "faPlus",
    "faCodeBranch",
    "faAnglesLeft",
    "faAnglesRight",
    "faTrashCan",
    "faWandMagic",
    "faBars",
    "faUser",
    "faArrowDownWideShort",
    "faGripVertical",
    "faArrowUpFromBracket",
]

const FaIcons = icons.map((icon) => {
    return [fas[icon], far[icon]]
}).flat().filter((icon) => icon != undefined)

library.add(FaIcons)

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
})